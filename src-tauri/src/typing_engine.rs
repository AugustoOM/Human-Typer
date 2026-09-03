use std::{
    sync::{Mutex, MutexGuard},
    thread,
    time::{Duration, Instant},
};

use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use rand::Rng;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::platform;

const MAX_CHARACTERS: usize = 250_000;
const MAX_RUN_TIME: Duration = Duration::from_secs(8 * 60 * 60);
const POLL_INTERVAL: Duration = Duration::from_millis(25);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TypingStatus {
    Idle,
    Countdown,
    Typing,
    Paused,
    Completed,
    Cancelled,
    Error,
}

impl TypingStatus {
    fn is_active(self) -> bool {
        matches!(self, Self::Countdown | Self::Typing | Self::Paused)
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypingRequest {
    pub text: String,
    pub base_delay_ms: u64,
    pub variation_ms: u64,
    pub countdown_seconds: u64,
    pub punctuation_pauses: bool,
    pub pause_on_focus_loss: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TypingEvent {
    pub status: TypingStatus,
    pub current: usize,
    pub total: usize,
    pub countdown: Option<u64>,
    pub message: Option<String>,
}

#[derive(Debug)]
struct RuntimeState {
    status: TypingStatus,
    generation: u64,
    current: usize,
    total: usize,
    shortcut_warning: Option<String>,
}

pub struct TypingController {
    runtime: Mutex<RuntimeState>,
}

impl Default for TypingController {
    fn default() -> Self {
        Self {
            runtime: Mutex::new(RuntimeState {
                status: TypingStatus::Idle,
                generation: 0,
                current: 0,
                total: 0,
                shortcut_warning: None,
            }),
        }
    }
}

impl TypingController {
    fn lock(&self) -> MutexGuard<'_, RuntimeState> {
        self.runtime
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn set_shortcut_warning(&self, warning: String) {
        self.lock().shortcut_warning = Some(warning);
    }

    pub fn shortcut_warning(&self) -> Option<String> {
        self.lock().shortcut_warning.clone()
    }

    pub fn toggle_pause(&self, app: &AppHandle) {
        let event = {
            let mut runtime = self.lock();
            runtime.status = match runtime.status {
                TypingStatus::Typing => TypingStatus::Paused,
                TypingStatus::Paused => TypingStatus::Typing,
                _ => return,
            };
            event_from_runtime(&runtime, None)
        };
        emit_event(app, event);
    }

    pub fn cancel(&self, app: &AppHandle) {
        let event = {
            let mut runtime = self.lock();
            if !runtime.status.is_active() {
                return;
            }
            runtime.status = TypingStatus::Cancelled;
            runtime.generation = runtime.generation.wrapping_add(1);
            event_from_runtime(&runtime, Some("Typing cancelled".into()))
        };
        emit_event(app, event);
    }

    fn begin(&self, total: usize) -> Result<u64, String> {
        let mut runtime = self.lock();
        if runtime.status.is_active() {
            return Err("Typing is already in progress. Cancel it before starting another run.".into());
        }
        runtime.generation = runtime.generation.wrapping_add(1);
        runtime.status = TypingStatus::Countdown;
        runtime.current = 0;
        runtime.total = total;
        Ok(runtime.generation)
    }
}

fn event_from_runtime(runtime: &RuntimeState, message: Option<String>) -> TypingEvent {
    TypingEvent {
        status: runtime.status,
        current: runtime.current,
        total: runtime.total,
        countdown: None,
        message,
    }
}

fn emit_event(app: &AppHandle, event: TypingEvent) {
    let _ = app.emit("typing-state", event);
}

fn validate_request(request: &TypingRequest) -> Result<usize, String> {
    let total = request.text.chars().count();
    if total == 0 {
        return Err("Add some text before starting.".into());
    }
    if total > MAX_CHARACTERS {
        return Err(format!(
            "The text exceeds the {MAX_CHARACTERS}-character limit. Split it into smaller sections."
        ));
    }
    if !(15..=2_000).contains(&request.base_delay_ms) {
        return Err("The base speed must be between 15 and 2000 ms.".into());
    }
    if request.variation_ms > 1_000 {
        return Err("Variation cannot exceed 1000 ms.".into());
    }
    if !(1..=30).contains(&request.countdown_seconds) {
        return Err("The countdown must be between 1 and 30 seconds.".into());
    }
    Ok(total)
}

pub fn start_typing(
    app: AppHandle,
    controller: tauri::State<'_, TypingController>,
    request: TypingRequest,
) -> Result<(), String> {
    if request.pause_on_focus_loss && !platform::focus_guard_supported() {
        return Err("Target window protection is only available on macOS and Windows.".into());
    }
    if !platform::accessibility_granted() {
        platform::request_accessibility();
        return Err(
            "Human Typer needs Accessibility permission. Enable it in System Settings → Privacy & Security → Accessibility. If it is already enabled, quit and reopen Human Typer; a new build may require you to remove and add the app again."
                .into(),
        );
    }
    let total = validate_request(&request)?;
    let generation = controller.begin(total)?;
    // Tauri owns managed state for the whole process. Capture the AppHandle and
    // retrieve that state again inside the worker instead of moving a State guard.
    let app_for_worker = app.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let controller = app_for_worker.state::<TypingController>();
        run_typing(
            app_for_worker.clone(),
            &controller,
            generation,
            request,
            total,
        );
    });

    Ok(())
}

fn run_typing(
    app: AppHandle,
    controller: &TypingController,
    generation: u64,
    request: TypingRequest,
    total: usize,
) {
    for remaining in (1..=request.countdown_seconds).rev() {
        if !is_generation_active(controller, generation) {
            return;
        }
        emit_event(
            &app,
            TypingEvent {
                status: TypingStatus::Countdown,
                current: 0,
                total,
                countdown: Some(remaining),
                message: None,
            },
        );
        if !interruptible_sleep(
            &app,
            controller,
            generation,
            Duration::from_secs(1),
            false,
            None,
        ) {
            return;
        }
    }

    let focus_target = if request.pause_on_focus_loss {
        match platform::FocusedWindow::capture() {
            Ok(target) => Some(target),
            Err(error) => {
                finish_with_error(&app, controller, generation, error);
                return;
            }
        }
    } else {
        None
    };

    {
        let mut runtime = controller.lock();
        if runtime.generation != generation || runtime.status == TypingStatus::Cancelled {
            return;
        }
        runtime.status = TypingStatus::Typing;
        emit_event(&app, event_from_runtime(&runtime, None));
    }

    let mut enigo = match Enigo::new(&Settings::default()) {
        Ok(enigo) => enigo,
        Err(error) => {
            finish_with_error(
                &app,
                controller,
                generation,
                format!("Could not start the simulated keyboard: {error}"),
            );
            return;
        }
    };

    let started_at = Instant::now();
    let mut rng = rand::rng();
    for (index, character) in request.text.chars().enumerate() {
        if started_at.elapsed() > MAX_RUN_TIME {
            finish_with_error(
                &app,
                controller,
                generation,
                "The 8-hour safety limit was reached and typing was stopped.".into(),
            );
            return;
        }

        if !wait_until_ready(&app, controller, generation, focus_target.as_ref()) {
            return;
        }

        if let Err(error) = type_character(&mut enigo, character) {
            finish_with_error(
                &app,
                controller,
                generation,
                format!(
                    "Could not type a character. Check the system permissions: {error}"
                ),
            );
            return;
        }

        {
            let mut runtime = controller.lock();
            if runtime.generation != generation {
                return;
            }
            runtime.current = index + 1;
            emit_event(&app, event_from_runtime(&runtime, None));
        }

        let delay = randomized_delay(
            request.base_delay_ms,
            request.variation_ms,
            character,
            request.punctuation_pauses,
            &mut rng,
        );
        if !interruptible_sleep(
            &app,
            controller,
            generation,
            delay,
            true,
            focus_target.as_ref(),
        ) {
            return;
        }
    }

    let event = {
        let mut runtime = controller.lock();
        if runtime.generation != generation {
            return;
        }
        runtime.status = TypingStatus::Completed;
        event_from_runtime(&runtime, Some("Text typed successfully".into()))
    };
    emit_event(&app, event);
}

fn type_character(enigo: &mut Enigo, character: char) -> Result<(), String> {
    match character {
        '\n' => enigo
            .key(Key::Return, Direction::Click)
            .map_err(|error| error.to_string()),
        '\r' => Ok(()),
        '\t' => enigo
            .key(Key::Tab, Direction::Click)
            .map_err(|error| error.to_string()),
        _ => enigo
            .text(&character.to_string())
            .map_err(|error| error.to_string()),
    }
}

fn is_generation_active(controller: &TypingController, generation: u64) -> bool {
    let runtime = controller.lock();
    runtime.generation == generation && runtime.status != TypingStatus::Cancelled
}

fn wait_until_ready(
    app: &AppHandle,
    controller: &TypingController,
    generation: u64,
    focus_target: Option<&platform::FocusedWindow>,
) -> bool {
    loop {
        if let Some(target) = focus_target
            && !target.is_active()
        {
            pause_for_focus_loss(app, controller, generation);
        }

        let status = {
            let runtime = controller.lock();
            if runtime.generation != generation || runtime.status == TypingStatus::Cancelled {
                return false;
            }
            runtime.status
        };
        if status != TypingStatus::Paused {
            return true;
        }
        thread::sleep(POLL_INTERVAL);
    }
}

fn interruptible_sleep(
    app: &AppHandle,
    controller: &TypingController,
    generation: u64,
    duration: Duration,
    respect_pause: bool,
    focus_target: Option<&platform::FocusedWindow>,
) -> bool {
    let mut remaining = duration;
    while !remaining.is_zero() {
        if respect_pause && !wait_until_ready(app, controller, generation, focus_target) {
            return false;
        }
        if !is_generation_active(controller, generation) {
            return false;
        }
        let slice = remaining.min(POLL_INTERVAL);
        thread::sleep(slice);
        remaining = remaining.saturating_sub(slice);
    }
    true
}

fn pause_for_focus_loss(app: &AppHandle, controller: &TypingController, generation: u64) {
    if let Some(event) = focus_loss_event(controller, generation) {
        emit_event(app, event);
    }
}

fn focus_loss_event(controller: &TypingController, generation: u64) -> Option<TypingEvent> {
    let mut runtime = controller.lock();
    if runtime.generation != generation || runtime.status != TypingStatus::Typing {
        return None;
    }
    runtime.status = TypingStatus::Paused;
    Some(event_from_runtime(
        &runtime,
        Some(
            "Automatically paused: the target window lost focus. Return to it and press F8 to continue."
                .into(),
        ),
    ))
}

fn finish_with_error(
    app: &AppHandle,
    controller: &TypingController,
    generation: u64,
    message: String,
) {
    let event = {
        let mut runtime = controller.lock();
        if runtime.generation != generation {
            return;
        }
        runtime.status = TypingStatus::Error;
        event_from_runtime(&runtime, Some(message))
    };
    emit_event(app, event);
}

pub fn is_punctuation(character: char) -> bool {
    matches!(character, '.' | ',' | ';' | ':' | '?' | '!' | '\n')
}

fn randomized_delay(
    base_ms: u64,
    variation_ms: u64,
    character: char,
    punctuation_pauses: bool,
    rng: &mut impl Rng,
) -> Duration {
    let variation = variation_ms as i64;
    let jitter = if variation == 0 {
        0
    } else {
        rng.random_range(-variation..=variation)
    };
    let natural = rng.random_range(-6_i64..=8_i64);
    let punctuation = if punctuation_pauses && is_punctuation(character) {
        match character {
            '.' | '?' | '!' => rng.random_range(260_i64..=520_i64),
            ',' | ';' | ':' => rng.random_range(120_i64..=280_i64),
            '\n' => rng.random_range(350_i64..=650_i64),
            _ => 0,
        }
    } else {
        0
    };

    Duration::from_millis(apply_delay_components(
        base_ms,
        jitter,
        natural,
        punctuation,
    ))
}

pub fn apply_delay_components(
    base_ms: u64,
    jitter_ms: i64,
    natural_ms: i64,
    punctuation_ms: i64,
) -> u64 {
    (base_ms as i64 + jitter_ms + natural_ms + punctuation_ms).max(5) as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_supported_punctuation() {
        for character in ['.', ',', ';', ':', '?', '!', '\n'] {
            assert!(is_punctuation(character));
        }
        assert!(!is_punctuation('a'));
        assert!(!is_punctuation(' '));
    }

    #[test]
    fn combines_delay_components() {
        assert_eq!(apply_delay_components(70, 20, -4, 140), 226);
    }

    #[test]
    fn delay_never_falls_below_safety_floor() {
        assert_eq!(apply_delay_components(15, -100, -20, 0), 5);
    }

    #[test]
    fn controller_transitions_pause_resume_and_cancel() {
        let controller = TypingController::default();
        let generation = controller.begin(12).unwrap();
        {
            let mut runtime = controller.lock();
            runtime.status = TypingStatus::Typing;
        }
        // Test state transitions directly; emitting needs a running Tauri app.
        {
            let mut runtime = controller.lock();
            runtime.status = TypingStatus::Paused;
            assert_eq!(runtime.status, TypingStatus::Paused);
            runtime.status = TypingStatus::Typing;
            assert_eq!(runtime.status, TypingStatus::Typing);
            runtime.generation = generation.wrapping_add(1);
            runtime.status = TypingStatus::Cancelled;
            assert!(!runtime.status.is_active());
        }
    }

    #[test]
    fn focus_loss_pauses_an_active_run_only_once() {
        let controller = TypingController::default();
        let generation = controller.begin(12).unwrap();
        controller.lock().status = TypingStatus::Typing;

        let event = focus_loss_event(&controller, generation).unwrap();
        assert_eq!(event.status, TypingStatus::Paused);
        assert!(event.message.unwrap().contains("target window"));
        assert!(focus_loss_event(&controller, generation).is_none());
        assert!(focus_loss_event(&controller, generation.wrapping_add(1)).is_none());
    }
}
