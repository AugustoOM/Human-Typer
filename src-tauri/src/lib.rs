mod browser_bridge;
mod platform;
mod typing_engine;

use serde::Serialize;
use tauri::Manager;
use typing_engine::{SpreadsheetTypingRequest, TypingController, TypingRequest};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeInfo {
    platform: &'static str,
    shortcut_warning: Option<String>,
    accessibility_granted: bool,
    focus_guard_supported: bool,
}

#[tauri::command]
fn start_typing(
    app: tauri::AppHandle,
    controller: tauri::State<'_, TypingController>,
    request: TypingRequest,
) -> Result<(), String> {
    typing_engine::start_typing(app, controller, request)
}

#[tauri::command]
fn start_spreadsheet_typing(
    app: tauri::AppHandle,
    controller: tauri::State<'_, TypingController>,
    request: SpreadsheetTypingRequest,
) -> Result<(), String> {
    typing_engine::start_spreadsheet_typing(app, controller, request)
}

#[tauri::command]
fn toggle_pause(app: tauri::AppHandle, controller: tauri::State<'_, TypingController>) {
    controller.toggle_pause(&app);
}

#[tauri::command]
fn cancel_typing(app: tauri::AppHandle, controller: tauri::State<'_, TypingController>) {
    controller.cancel(&app);
}

#[tauri::command]
fn get_runtime_info(controller: tauri::State<'_, TypingController>) -> RuntimeInfo {
    RuntimeInfo {
        platform: std::env::consts::OS,
        shortcut_warning: controller.shortcut_warning(),
        accessibility_granted: platform::accessibility_granted(),
        focus_guard_supported: platform::focus_guard_supported(),
    }
}

#[tauri::command]
fn request_accessibility() -> bool {
    platform::request_accessibility()
}

#[tauri::command]
fn browser_bridge_state(
    bridge: tauri::State<'_, browser_bridge::BrowserBridge>,
) -> browser_bridge::BridgeSnapshot {
    bridge.snapshot()
}
#[tauri::command]
fn send_browser_job(
    bridge: tauri::State<'_, browser_bridge::BrowserBridge>,
    job: browser_bridge::BrowserJob,
) -> Result<(), String> {
    bridge.send(job)
}
#[tauri::command]
fn browser_job_control(
    bridge: tauri::State<'_, browser_bridge::BrowserBridge>,
    action: String,
) -> Result<(), String> {
    bridge.control(&action)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(desktop)]
    let pause_shortcut =
        tauri_plugin_global_shortcut::Shortcut::new(None, tauri_plugin_global_shortcut::Code::F8);
    #[cfg(desktop)]
    let cancel_shortcut = tauri_plugin_global_shortcut::Shortcut::new(
        None,
        tauri_plugin_global_shortcut::Code::Escape,
    );

    let builder = tauri::Builder::default()
        .manage(TypingController::default())
        .manage(browser_bridge::BrowserBridge::default());

    #[cfg(desktop)]
    let builder = {
        use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

        let handler_pause = pause_shortcut;
        let handler_cancel = cancel_shortcut;
        builder.plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    let controller = app.state::<TypingController>();
                    if shortcut == &handler_pause {
                        controller.toggle_pause(app);
                    } else if shortcut == &handler_cancel {
                        controller.cancel(app);
                    }
                })
                .build(),
        )
        .setup(move |app| {
            let bridge = app.state::<browser_bridge::BrowserBridge>();
            if let Err(error) = bridge.start() { bridge.record_error(error); }
            let shortcuts = app.global_shortcut();
            let mut unavailable = Vec::new();
            if shortcuts.register(pause_shortcut).is_err() {
                unavailable.push("F8");
            }
            if shortcuts.register(cancel_shortcut).is_err() {
                unavailable.push("Esc");
            }
            if !unavailable.is_empty() {
                app.state::<TypingController>().set_shortcut_warning(format!(
                    "Could not register the global shortcuts: {}. The app buttons remain available.",
                    unavailable.join(", ")
                ));
            }
            Ok(())
        })
    };

    builder
        .invoke_handler(tauri::generate_handler![
            start_typing,
            start_spreadsheet_typing,
            toggle_pause,
            cancel_typing,
            get_runtime_info,
            request_accessibility,
            browser_bridge_state,
            send_browser_job,
            browser_job_control
        ])
        .run(tauri::generate_context!())
        .expect("Human Typer failed to start");
}
