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
            event_from_runtime(&runtime, Some("Escritura cancelada".into()))
        };
        emit_event(app, event);
    }

    fn begin(&self, total: usize) -> Result<u64, String> {
        let mut runtime = self.lock();
        if runtime.status.is_active() {
            return Err("Ya hay una escritura en curso. Cancelala antes de iniciar otra.".into());
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
        return Err("Agregá algún texto antes de comenzar.".into());
    }
    if total > MAX_CHARACTERS {
        return Err(format!(
            "El texto supera el límite de {MAX_CHARACTERS} caracteres. Dividilo en partes más pequeñas."
        ));
    }
    if !(15..=2_000).contains(&request.base_delay_ms) {
        return Err("La velocidad base debe estar entre 15 y 2000 ms.".into());
    }
    if request.variation_ms > 1_000 {
        return Err("La variación no puede superar 1000 ms.".into());
    }
    if !(1..=30).contains(&request.countdown_seconds) {
        return Err("La cuenta regresiva debe estar entre 1 y 30 segundos.".into());
    }
    Ok(total)
}

pub fn start_typing(
    app: AppHandle,
    controller: tauri::State<'_, TypingController>,
    request: TypingRequest,
) -> Result<(), String> {
    if !platform::accessibility_granted() {
        return Err(
            "Human Typer necesita permiso de Accesibilidad. Abrí Configuración del Sistema → Privacidad y seguridad → Accesibilidad, habilitá Human Typer y volvé a intentarlo."
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
        if !interruptible_sleep(controller, generation, Duration::from_secs(1), false) {
            return;
        }
    }

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
                format!("No se pudo iniciar el teclado simulado: {error}"),
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
                "Se alcanzó el límite de seguridad de 8 horas y la escritura se detuvo.".into(),
            );
            return;
        }

        if !wait_until_ready(controller, generation) {
            return;
        }

        if let Err(error) = type_character(&mut enigo, character) {
            finish_with_error(
                &app,
                controller,
                generation,
                format!(
                    "No se pudo escribir un carácter. Revisá los permisos del sistema: {error}"
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
        if !interruptible_sleep(controller, generation, delay, true) {
            return;
        }
    }

    let event = {
        let mut runtime = controller.lock();
        if runtime.generation != generation {
            return;
        }
        runtime.status = TypingStatus::Completed;
        event_from_runtime(&runtime, Some("Texto escrito correctamente".into()))
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

fn wait_until_ready(controller: &TypingController, generation: u64) -> bool {
    loop {
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
    controller: &TypingController,
    generation: u64,
    duration: Duration,
    respect_pause: bool,
) -> bool {
    let mut remaining = duration;
    while !remaining.is_zero() {
        if respect_pause && !wait_until_ready(controller, generation) {
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
}
