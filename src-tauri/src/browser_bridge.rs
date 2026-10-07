use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    net::{TcpListener, TcpStream},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tungstenite::{
    Message, accept_hdr_with_config,
    handshake::server::{Request, Response},
    protocol::WebSocketConfig,
};

const MAX_PAYLOAD: usize = 8 * 1024 * 1024;
#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeSnapshot {
    pub pairing_code: String,
    pub connected: bool,
    pub tabs: Vec<Value>,
    pub job: Option<Value>,
    pub error: Option<String>,
}
#[derive(Default)]
struct Runtime {
    snapshot: BridgeSnapshot,
    queue: Vec<Value>,
    token: String,
    session: u64,
    last_seen: Option<Instant>,
}
#[derive(Clone, Default)]
pub struct BrowserBridge(Arc<Mutex<Runtime>>);
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserJob {
    pub id: String,
    pub tab_id: u64,
    pub config: Value,
}
impl BrowserBridge {
    pub fn start(&self) -> Result<(), String> {
        let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
        let port = listener.local_addr().map_err(|e| e.to_string())?.port();
        let token: String = (0..32)
            .map(|_| format!("{:02x}", rand::random::<u8>()))
            .collect();
        {
            let mut state = self.0.lock().unwrap();
            state.token = token.clone();
            state.snapshot.pairing_code = format!("{port}:{token}");
        }
        let bridge = self.clone();
        thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                let bridge = bridge.clone();
                thread::spawn(move || bridge.serve(stream));
            }
        });
        Ok(())
    }
    pub fn record_error(&self, error: String) {
        self.0.lock().unwrap().snapshot.error = Some(error);
    }
    pub fn snapshot(&self) -> BridgeSnapshot {
        let mut state = self.0.lock().unwrap();
        if state
            .last_seen
            .is_some_and(|time| time.elapsed() > Duration::from_secs(15))
        {
            state.snapshot.connected = false;
            state.snapshot.tabs.clear();
        }
        state.snapshot.clone()
    }
    pub fn send(&self, job: BrowserJob) -> Result<(), String> {
        validate_job(&job)?;
        let mut state = self.0.lock().unwrap();
        if !state.snapshot.connected
            || state
                .last_seen
                .is_none_or(|time| time.elapsed() > Duration::from_secs(15))
        {
            return Err("Connect the extension first.".into());
        }
        if state
            .snapshot
            .job
            .as_ref()
            .and_then(|j| j["status"].as_str())
            .is_some_and(|s| matches!(s, "sent" | "prepared" | "typing" | "paused" | "countdown"))
        {
            return Err("Finish or cancel the current browser job first.".into());
        }
        if !state
            .snapshot
            .tabs
            .iter()
            .any(|t| t["id"].as_u64() == Some(job.tab_id))
        {
            return Err("The selected tab is no longer available.".into());
        }
        state.snapshot.job = Some(
            json!({"id":job.id,"tabId":job.tab_id,"status":"sent","current":0,"total":job.config["text"].as_str().unwrap().chars().count()}),
        );
        state.queue.push(
            json!({"type":"prepare","job":{"id":job.id,"tabId":job.tab_id,"config":job.config}}),
        );
        Ok(())
    }
    pub fn control(&self, action: &str) -> Result<(), String> {
        if !["start", "pause", "cancel"].contains(&action) {
            return Err("Invalid browser control.".into());
        }
        let mut state = self.0.lock().unwrap();
        if !state.snapshot.connected {
            return Err("The extension is disconnected.".into());
        }
        let id = state
            .snapshot
            .job
            .as_ref()
            .and_then(|j| j["id"].as_str())
            .ok_or("No browser job is prepared.")?
            .to_string();
        state
            .queue
            .push(json!({"type":"control","id":id,"action":action}));
        Ok(())
    }
    fn serve(&self, stream: TcpStream) {
        let _ = stream.set_read_timeout(Some(Duration::from_secs(10)));
        let _ = stream.set_write_timeout(Some(Duration::from_secs(5)));
        let config = WebSocketConfig::default()
            .max_message_size(Some(MAX_PAYLOAD))
            .max_frame_size(Some(MAX_PAYLOAD));
        let socket = accept_hdr_with_config(
            stream,
            |request: &Request, response: Response| {
                let origin = request
                    .headers()
                    .get("origin")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("");
                if !valid_origin(origin) {
                    return Err(tungstenite::http::Response::builder()
                        .status(403)
                        .body(Some("Extension origin required".into()))
                        .unwrap());
                }
                Ok(response)
            },
            Some(config),
        );
        let Ok(mut socket) = socket else {
            return;
        };
        let Ok(Message::Text(first)) = socket.read() else {
            return;
        };
        let Ok(hello) = serde_json::from_str::<Value>(&first) else {
            return;
        };
        let session = {
            let mut state = self.0.lock().unwrap();
            if hello["type"] != "hello"
                || hello["version"] != 1
                || hello["token"].as_str() != Some(&state.token)
            {
                let _ = socket.close(None);
                return;
            }
            if state.snapshot.connected {
                let _ = socket.close(None);
                return;
            }
            state.session += 1;
            state.snapshot.connected = true;
            state.snapshot.error = None;
            state.last_seen = Some(Instant::now());
            state.session
        };
        let _ = socket.send(Message::Text(
            json!({"type":"hello","version":1}).to_string().into(),
        ));
        while let Ok(message) = socket.read() {
            let Message::Text(text) = message else {
                if matches!(message, Message::Close(_)) {
                    break;
                }
                continue;
            };
            let Ok(value) = serde_json::from_str::<Value>(&text) else {
                break;
            };
            let outgoing = {
                let mut state = self.0.lock().unwrap();
                if state.session != session {
                    break;
                }
                state.last_seen = Some(Instant::now());
                if value["type"] == "poll" {
                    state.snapshot.tabs = value["tabs"]
                        .as_array()
                        .map(|tabs| {
                            tabs.iter()
                                .take(100)
                                .filter(|t| {
                                    t["id"].is_u64()
                                        && t["url"].as_str().is_some_and(|url| {
                                            url.starts_with("https://docs.google.com/document/")
                                                || url.starts_with(
                                                    "https://docs.google.com/spreadsheets/",
                                                )
                                        })
                                })
                                .cloned()
                                .collect()
                        })
                        .unwrap_or_default();
                }
                if value["type"] == "status" {
                    if let Some(job) = state.snapshot.job.as_mut() {
                        if value["id"] == job["id"] {
                            for key in ["status", "current", "total", "message"] {
                                if let Some(v) = value.get(key) {
                                    job[key] = v.clone();
                                }
                            }
                        }
                    }
                }
                std::mem::take(&mut state.queue)
            };
            if socket
                .send(Message::Text(
                    json!({"type":"commands","commands":outgoing})
                        .to_string()
                        .into(),
                ))
                .is_err()
            {
                break;
            }
        }
        let mut state = self.0.lock().unwrap();
        if state.session == session {
            state.snapshot.connected = false;
            state.snapshot.tabs.clear();
            state.queue.clear();
            if let Some(job) = state.snapshot.job.as_mut() {
                if !matches!(
                    job["status"].as_str(),
                    Some("completed" | "cancelled" | "error")
                ) {
                    job["status"] = json!("error");
                    job["message"] =
                        json!("Extension connection lost. Check the document before retrying.");
                }
            }
        }
    }
}
fn valid_origin(origin: &str) -> bool {
    if let Some(id) = origin.strip_prefix("chrome-extension://") {
        return id.len() == 32 && id.bytes().all(|b| (b'a'..=b'p').contains(&b));
    }
    if let Some(id) = origin.strip_prefix("moz-extension://") {
        return !id.is_empty()
            && id.len() <= 64
            && id.bytes().all(|b| b.is_ascii_hexdigit() || b == b'-');
    }
    false
}
fn validate_job(job: &BrowserJob) -> Result<(), String> {
    let text = job.config["text"].as_str().ok_or("Invalid browser text.")?;
    if text.is_empty()
        || text.chars().count() > 250_000
        || job.id.is_empty()
        || job.id.len() > 100
        || job.config.to_string().len() > MAX_PAYLOAD - 1024
    {
        return Err("Invalid browser job size.".into());
    }
    let delay = job.config["baseDelayMs"].as_u64().unwrap_or(0);
    if !(15..=2000).contains(&delay) || job.config["variationMs"].as_u64().unwrap_or(1001) > 1000 {
        return Err("Invalid browser timing.".into());
    }
    let runs: Vec<crate::typing_engine::FormattedRun> =
        serde_json::from_value(job.config.get("formatRuns").cloned().unwrap_or(json!([])))
            .map_err(|_| "Invalid document format.".to_string())?;
    crate::typing_engine::validate_format_runs(text, &runs)?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    fn connect_bridge(bridge: &BrowserBridge, token: &str) -> tungstenite::WebSocket<TcpStream> {
        use tungstenite::client::IntoClientRequest;
        let code = bridge.snapshot().pairing_code;
        let port = code.split(':').next().unwrap();
        let mut request = format!("ws://127.0.0.1:{port}/")
            .into_client_request()
            .unwrap();
        request.headers_mut().insert(
            "origin",
            "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
                .parse()
                .unwrap(),
        );
        let stream = TcpStream::connect(format!("127.0.0.1:{port}")).unwrap();
        stream
            .set_read_timeout(Some(Duration::from_secs(2)))
            .unwrap();
        let (mut socket, _) = tungstenite::client(request, stream).unwrap();
        socket
            .send(Message::Text(
                json!({"type":"hello","version":1,"token":token})
                    .to_string()
                    .into(),
            ))
            .unwrap();
        socket
    }
    #[test]
    fn pairing_delivery_progress_and_controls_round_trip() {
        let bridge = BrowserBridge::default();
        bridge.start().unwrap();
        let code = bridge.snapshot().pairing_code;
        let token = code.split(':').nth(1).unwrap();
        let mut socket = connect_bridge(&bridge, token);
        let Message::Text(hello) = socket.read().unwrap() else {
            panic!("Missing handshake")
        };
        assert_eq!(serde_json::from_str::<Value>(&hello).unwrap()["version"], 1);
        socket.send(Message::Text(json!({"type":"poll","tabs":[{"id":7,"url":"https://docs.google.com/document/d/test/edit","title":"Test"}]}).to_string().into())).unwrap();
        socket.read().unwrap();
        bridge
            .send(BrowserJob {
                id: "job".into(),
                tab_id: 7,
                config: json!({"text":"😀hello","baseDelayMs":60,"variationMs":0}),
            })
            .unwrap();
        assert!(
            bridge
                .send(BrowserJob {
                    id: "duplicate".into(),
                    tab_id: 7,
                    config: json!({"text":"hello","baseDelayMs":60,"variationMs":0})
                })
                .is_err()
        );
        socket
            .send(Message::Text(
                json!({"type":"poll","tabs":[]}).to_string().into(),
            ))
            .unwrap();
        let Message::Text(commands) = socket.read().unwrap() else {
            panic!()
        };
        assert_eq!(
            serde_json::from_str::<Value>(&commands).unwrap()["commands"][0]["job"]["config"]["text"],
            "😀hello"
        );
        socket
            .send(Message::Text(
                json!({"type":"status","id":"job","status":"prepared","current":0})
                    .to_string()
                    .into(),
            ))
            .unwrap();
        socket.read().unwrap();
        bridge.control("cancel").unwrap();
        socket
            .send(Message::Text(
                json!({"type":"status","id":"job","status":"cancelled"})
                    .to_string()
                    .into(),
            ))
            .unwrap();
        let Message::Text(commands) = socket.read().unwrap() else {
            panic!()
        };
        assert_eq!(
            serde_json::from_str::<Value>(&commands).unwrap()["commands"][0]["action"],
            "cancel"
        );
        assert_eq!(bridge.snapshot().job.unwrap()["status"], "cancelled");
    }
    #[test]
    fn bad_pairing_token_is_rejected() {
        let bridge = BrowserBridge::default();
        bridge.start().unwrap();
        let mut socket = connect_bridge(&bridge, "wrong");
        assert!(matches!(socket.read(), Ok(Message::Close(_)) | Err(_)));
        assert!(!bridge.snapshot().connected);
    }
    #[test]
    fn rejects_web_origins() {
        assert!(!valid_origin("http://127.0.0.1"));
        assert!(!valid_origin("https://docs.google.com"));
        assert!(valid_origin(
            "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
        ));
        assert!(!valid_origin("chrome-extension://bad/path"));
    }
    #[test]
    fn validates_size_and_timing() {
        let mut job = BrowserJob {
            id: "test".into(),
            tab_id: 1,
            config: json!({"text":"😀á","baseDelayMs":60,"variationMs":0}),
        };
        assert!(validate_job(&job).is_ok());
        job.config["baseDelayMs"] = json!(0);
        assert!(validate_job(&job).is_err());
    }
}
