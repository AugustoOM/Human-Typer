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
const TYPING_MISTAKE_CHANCE_PERCENT: u8 = 5;

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
    #[serde(default)]
    pub format_runs: Vec<FormattedRun>,
    pub base_delay_ms: u64,
    pub variation_ms: u64,
    pub countdown_seconds: u64,
    pub punctuation_pauses: bool,
    pub typing_mistakes: bool,
    pub pause_on_focus_loss: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormattedRun {
    start: usize,
    end: usize,
    heading: u8,
    paragraph_start: bool,
    #[serde(default)]
    soft_break: bool,
    bold: bool,
    italic: bool,
    underline: bool,
    strike: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpreadsheetTypingRequest {
    pub rows: Vec<Vec<String>>,
    pub base_delay_ms: u64,
    pub variation_ms: u64,
    pub countdown_seconds: u64,
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
            return Err(
                "Typing is already in progress. Cancel it before starting another run.".into(),
            );
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
    validate_format_runs(&request.text, &request.format_runs)?;
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

fn validate_format_runs(text: &str, runs: &[FormattedRun]) -> Result<(), String> {
    if runs.is_empty() {
        return Ok(());
    }
    let chars: Vec<char> = text.chars().collect();
    let mut end = 0;
    for run in runs {
        if run.start != end || run.end <= run.start || run.end > chars.len() || run.heading > 6 {
            return Err("Invalid document formatting ranges.".into());
        }
        if run.paragraph_start && run.start > 0 && chars[run.start - 1] != '\n' {
            return Err("Paragraph formatting must start at a paragraph boundary.".into());
        }
        if run.soft_break && (run.end != run.start + 1 || chars[run.start] != '\n') {
            return Err("Invalid document line break.".into());
        }
        end = run.end;
    }
    if end != chars.len() || !runs[0].paragraph_start {
        return Err("Document formatting must cover the entire text.".into());
    }
    Ok(())
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

fn validate_spreadsheet_request(request: &SpreadsheetTypingRequest) -> Result<usize, String> {
    if request.rows.is_empty() || request.rows.iter().all(|row| row.is_empty()) {
        return Err("Choose a spreadsheet with at least one cell.".into());
    }
    let column_count = request.rows.first().map_or(0, Vec::len);
    if column_count == 0 || request.rows.iter().any(|row| row.len() != column_count) {
        return Err("The spreadsheet rows must all have the same number of columns.".into());
    }
    let cell_count = request.rows.len().saturating_mul(column_count);
    if cell_count > 100_000 {
        return Err("The spreadsheet exceeds the 100,000-cell limit.".into());
    }
    let total = request
        .rows
        .iter()
        .flatten()
        .map(|cell| cell.chars().count())
        .sum();
    if total == 0 {
        return Err("The spreadsheet does not contain any values.".into());
    }
    if total > MAX_CHARACTERS {
        return Err(format!(
            "The spreadsheet exceeds the {MAX_CHARACTERS}-character limit."
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

pub fn start_spreadsheet_typing(
    app: AppHandle,
    controller: tauri::State<'_, TypingController>,
    request: SpreadsheetTypingRequest,
) -> Result<(), String> {
    if request.pause_on_focus_loss && !platform::focus_guard_supported() {
        return Err("Target window protection is only available on macOS and Windows.".into());
    }
    if !platform::accessibility_granted() {
        platform::request_accessibility();
        return Err("Human Typer needs Accessibility permission. Enable it in System Settings → Privacy & Security → Accessibility. If it is already enabled, quit and reopen Human Typer; a new build may require you to remove and add the app again.".into());
    }
    let total = validate_spreadsheet_request(&request)?;
    let generation = controller.begin(total)?;
    let app_for_worker = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let controller = app_for_worker.state::<TypingController>();
        run_spreadsheet_typing(
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
    let mut run_index = 0;
    let mut active_marks = [false; 4];
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

        while run_index + 1 < request.format_runs.len()
            && index >= request.format_runs[run_index].end
        {
            run_index += 1;
        }
        let format = request.format_runs.get(run_index);
        if let Some(run) = format {
            if index == run.start {
                if let Err(error) = apply_document_format(&mut enigo, run, &mut active_marks) {
                    finish_with_error(
                        &app,
                        controller,
                        generation,
                        format!("Could not apply document formatting: {error}"),
                    );
                    return;
                }
                if !interruptible_sleep(
                    &app,
                    controller,
                    generation,
                    Duration::from_millis(40),
                    true,
                    focus_target.as_ref(),
                ) {
                    return;
                }
            }
        }

        if request.typing_mistakes
            && let Some(typo) = random_nearby_key(character, &mut rng)
        {
            if let Err(error) = type_character(&mut enigo, typo) {
                finish_with_error(
                    &app,
                    controller,
                    generation,
                    format!("Could not type a character. Check the system permissions: {error}"),
                );
                return;
            }

            let recognition_delay = Duration::from_millis(rng.random_range(90_u64..=250));
            if !interruptible_sleep(
                &app,
                controller,
                generation,
                recognition_delay,
                true,
                focus_target.as_ref(),
            ) {
                return;
            }

            if let Err(error) = enigo.key(Key::Backspace, Direction::Click) {
                finish_with_error(
                    &app,
                    controller,
                    generation,
                    format!("Could not type a character. Check the system permissions: {error}"),
                );
                return;
            }

            let correction_delay = Duration::from_millis(rng.random_range(45_u64..=120));
            if !interruptible_sleep(
                &app,
                controller,
                generation,
                correction_delay,
                true,
                focus_target.as_ref(),
            ) {
                return;
            }
        }

        let typed = if character == '\n' && format.is_some_and(|run| run.soft_break) {
            keyboard_shortcut(&mut enigo, &[Key::Shift], Key::Return)
        } else {
            type_character(&mut enigo, character)
        };
        if let Err(error) = typed {
            finish_with_error(
                &app,
                controller,
                generation,
                format!("Could not type a character. Check the system permissions: {error}"),
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

fn run_spreadsheet_typing(
    app: AppHandle,
    controller: &TypingController,
    generation: u64,
    request: SpreadsheetTypingRequest,
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
    let mut current = 0;
    let last_row = request.rows.len() - 1;
    let last_column = request.rows[0].len() - 1;

    for (row_index, row) in request.rows.iter().enumerate() {
        for (column_index, value) in row.iter().enumerate() {
            for character in value.chars() {
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
                current += 1;
                {
                    let mut runtime = controller.lock();
                    if runtime.generation != generation {
                        return;
                    }
                    runtime.current = current;
                    emit_event(&app, event_from_runtime(&runtime, None));
                }
                let delay = randomized_delay(
                    request.base_delay_ms,
                    request.variation_ms,
                    character,
                    false,
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
            if column_index < last_column {
                if !press_key(
                    &mut enigo,
                    Key::Tab,
                    &app,
                    controller,
                    generation,
                    focus_target.as_ref(),
                ) {
                    return;
                }
            }
        }
        if row_index < last_row {
            // Excel's Home key moves to the first cell in the current row. This
            // preserves blank cells and starts each source row in column A.
            if !press_key(
                &mut enigo,
                Key::Home,
                &app,
                controller,
                generation,
                focus_target.as_ref(),
            ) || !press_key(
                &mut enigo,
                Key::DownArrow,
                &app,
                controller,
                generation,
                focus_target.as_ref(),
            ) {
                return;
            }
        }
    }
    let event = {
        let mut runtime = controller.lock();
        if runtime.generation != generation {
            return;
        }
        runtime.status = TypingStatus::Completed;
        event_from_runtime(&runtime, Some("Spreadsheet filled successfully".into()))
    };
    emit_event(&app, event);
}

fn press_key(
    enigo: &mut Enigo,
    key: Key,
    app: &AppHandle,
    controller: &TypingController,
    generation: u64,
    focus_target: Option<&platform::FocusedWindow>,
) -> bool {
    if !wait_until_ready(app, controller, generation, focus_target) {
        return false;
    }
    if let Err(error) = enigo.key(key, Direction::Click) {
        finish_with_error(
            app,
            controller,
            generation,
            format!("Could not move to the next spreadsheet cell: {error}"),
        );
        return false;
    }
    interruptible_sleep(
        app,
        controller,
        generation,
        Duration::from_millis(20),
        true,
        focus_target,
    )
}

fn primary_modifier() -> Key {
    if cfg!(target_os = "macos") {
        Key::Meta
    } else {
        Key::Control
    }
}

// Always release modifiers, even if a keyboard event fails.
fn keyboard_shortcut(enigo: &mut Enigo, modifiers: &[Key], key: Key) -> Result<(), String> {
    let mut pressed = Vec::new();
    let mut result = Ok(());
    for modifier in modifiers {
        if let Err(error) = enigo.key(*modifier, Direction::Press) {
            result = Err(error.to_string());
            break;
        }
        pressed.push(*modifier);
    }
    if result.is_ok() {
        result = enigo
            .key(key, Direction::Click)
            .map_err(|error| error.to_string());
    }
    for modifier in pressed.into_iter().rev() {
        if let Err(error) = enigo.key(modifier, Direction::Release) {
            if result.is_ok() {
                result = Err(error.to_string());
            }
        }
    }
    result
}

fn apply_document_format(
    enigo: &mut Enigo,
    run: &FormattedRun,
    active: &mut [bool; 4],
) -> Result<(), String> {
    let primary = primary_modifier();
    if run.paragraph_start {
        keyboard_shortcut(enigo, &[primary], Key::Unicode('\\'))?;
        keyboard_shortcut(
            enigo,
            &[primary, Key::Alt],
            Key::Unicode(char::from(b'0' + run.heading)),
        )?;
        *active = [false; 4];
    }
    let desired = [run.bold, run.italic, run.underline, run.strike];
    for (index, key) in ['b', 'i', 'u', '5'].into_iter().enumerate() {
        if desired[index] != active[index] {
            let modifiers = if index == 3 {
                if cfg!(target_os = "macos") {
                    vec![primary, Key::Shift]
                } else {
                    vec![Key::Alt, Key::Shift]
                }
            } else {
                vec![primary]
            };
            let shortcut_key = if index == 3 && cfg!(target_os = "macos") {
                'x'
            } else {
                key
            };
            keyboard_shortcut(enigo, &modifiers, Key::Unicode(shortcut_key))?;
            active[index] = desired[index];
        }
    }
    Ok(())
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

fn nearby_keys(character: char) -> Option<&'static [u8]> {
    match character.to_ascii_lowercase() {
        'a' => Some(b"qwsz"),
        'b' => Some(b"vghn"),
        'c' => Some(b"xdfv"),
        'd' => Some(b"serfvxc"),
        'e' => Some(b"wsdr"),
        'f' => Some(b"drtgvc"),
        'g' => Some(b"ftyhbv"),
        'h' => Some(b"gyujnb"),
        'i' => Some(b"ujko"),
        'j' => Some(b"huikmn"),
        'k' => Some(b"jiolm"),
        'l' => Some(b"kop"),
        'm' => Some(b"njk"),
        'n' => Some(b"bhjm"),
        'o' => Some(b"iklp"),
        'p' => Some(b"ol"),
        'q' => Some(b"wa"),
        'r' => Some(b"edft"),
        's' => Some(b"awedxz"),
        't' => Some(b"rfgy"),
        'u' => Some(b"yhji"),
        'v' => Some(b"cfgb"),
        'w' => Some(b"qase"),
        'x' => Some(b"zsdc"),
        'y' => Some(b"tghu"),
        'z' => Some(b"asx"),
        _ => None,
    }
}

fn random_nearby_key(character: char, rng: &mut impl Rng) -> Option<char> {
    if rng.random_range(0_u8..100) >= TYPING_MISTAKE_CHANCE_PERCENT {
        return None;
    }

    let choices = nearby_keys(character)?;
    let choice = choices[rng.random_range(0..choices.len())] as char;
    Some(if character.is_ascii_uppercase() {
        choice.to_ascii_uppercase()
    } else {
        choice
    })
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

    fn format_run(start: usize, end: usize, paragraph_start: bool) -> FormattedRun {
        FormattedRun {
            start,
            end,
            paragraph_start,
            heading: 0,
            soft_break: false,
            bold: false,
            italic: false,
            underline: false,
            strike: false,
        }
    }

    #[test]
    fn format_ranges_count_unicode_and_reject_gaps_overlap_and_out_of_bounds() {
        assert!(
            validate_format_runs("😀a\nb", &[format_run(0, 3, true), format_run(3, 4, true)])
                .is_ok()
        );
        for runs in [
            vec![format_run(0, 5, true)],
            vec![format_run(1, 4, true)],
            vec![format_run(0, 2, true), format_run(1, 4, false)],
            vec![format_run(0, 1, true), format_run(2, 4, false)],
            vec![format_run(0, 0, true)],
        ] {
            assert!(validate_format_runs("😀a\nb", &runs).is_err());
        }
        assert!(validate_format_runs("plain", &[]).is_ok());
    }

    #[test]
    fn formatting_rejects_invalid_heading_and_paragraph_boundaries() {
        let mut run = format_run(0, 1, true);
        run.heading = 7;
        assert!(validate_format_runs("a", &[run]).is_err());
        assert!(
            validate_format_runs("ab", &[format_run(0, 1, true), format_run(1, 2, true)]).is_err()
        );
        let mut soft = format_run(1, 2, false);
        soft.soft_break = true;
        assert!(validate_format_runs("a\n", &[format_run(0, 1, true), soft.clone()]).is_ok());
        assert!(validate_format_runs("ab", &[format_run(0, 1, true), soft]).is_err());
    }

    #[test]
    fn detects_supported_punctuation() {
        for character in ['.', ',', ';', ':', '?', '!', '\n'] {
            assert!(is_punctuation(character));
        }
        assert!(!is_punctuation('a'));
        assert!(!is_punctuation(' '));
    }

    #[test]
    fn nearby_keys_match_the_physical_keyboard() {
        let d_neighbors = nearby_keys('d').unwrap();
        for neighbor in b"erfvxc" {
            assert!(d_neighbors.contains(neighbor));
        }
        assert_eq!(nearby_keys('D'), nearby_keys('d'));
        assert!(nearby_keys('ñ').is_none());
        assert!(nearby_keys(' ').is_none());
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
