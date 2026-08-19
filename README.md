# Human Typer

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/AugustoOM/Human-Typer)](https://github.com/AugustoOM/Human-Typer/releases/latest)

Human Typer is a lightweight desktop utility that types text character by character into the active field of another application. Its base speed, random timing variation, and punctuation pauses are configurable, producing a natural cadence without deliberately introducing mistakes.

It is built with Tauri 2, React 19, TypeScript, and Rust. Everything runs locally on your device: there is no server, account, telemetry, or permanent storage of your text.

> Only use automation in applications and fields where you are authorized to do so. Press `Esc` to stop typing from any application.

## Features

- Types every character individually instead of pasting the whole text.
- Supports Unicode, accented characters, `ñ`, `¿`, `¡`, symbols, spaces, tabs, and line breaks.
- Includes predefined speeds and fine-grained adjustment from 15 to 350 ms.
- Adds random timing variation and subtle natural fluctuations.
- Supports optional pauses after `. , ; : ? !` and line breaks.
- Provides a configurable countdown from 1 to 30 seconds.
- Displays status, character progress, and percentage.
- Pauses or resumes globally with `F8` and cancels immediately with `Esc`.
- Includes equivalent controls inside the application.
- Supports light, dark, and system themes.
- Saves preferences locally without persisting the text.
- Enforces safety limits of 250,000 characters and eight hours per run.

## Download

Prebuilt installers are available on the [GitHub Releases page](https://github.com/AugustoOM/Human-Typer/releases/latest):

- Windows 11, 64-bit: NSIS `.exe` installer.
- macOS, Apple Silicon: `.dmg` image.

The current binaries are not code-signed. Windows SmartScreen or macOS Gatekeeper may therefore display a warning. Public distribution should use signed and, on macOS, notarized builds.

## Screenshots

The screenshot directory is prepared at [`docs/screenshots`](docs/screenshots). Final screenshots should be captured from signed macOS and Windows builds so they accurately show each platform's native window decoration.

## Requirements

- Node.js 22 LTS; Vite also supports Node.js 20.19 or newer.
- npm 10 or newer.
- Rust 1.85 or newer.
- The [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system.

Linux additionally requires the WebKitGTK development libraries listed by Tauri.

## Installation and development

```bash
npm install
npm run tauri dev
```

The first launch downloads and compiles the Rust dependencies, so it may take a few minutes.

### Useful scripts

```bash
npm run dev           # Run the Vite frontend without the native typing engine
npm run typecheck     # Check strict TypeScript types
npm run lint          # Run ESLint
npm test              # Run frontend unit tests
npm run check         # Run typecheck, lint, and frontend tests
cargo test --manifest-path src-tauri/Cargo.toml
```

## Building

```bash
npm run tauri build
```

Installers are generated under `src-tauri/target/release/bundle/`. Configure macOS signing and notarization and Windows code signing before distributing production builds.

In CI or a macOS session that cannot automate Finder, run `CI=true npm run tauri build`. Tauri will omit the DMG's visual Finder customization while still producing a valid installer.

## Usage

1. Paste or enter content in **Your text**.
2. Select a speed preset or adjust the delay slider in milliseconds.
3. Configure timing variation, the countdown, and punctuation pauses.
4. Select **Start**.
5. Focus the target text field during the countdown.
6. Press `F8` to pause or resume, or `Esc` to cancel.

Editing and settings are locked while a run is active so the displayed progress always matches the text being typed.

## Shortcuts and safety

| Action         | Global shortcut | In-app alternative        |
| -------------- | --------------- | ------------------------- |
| Pause / resume | `F8`            | **Pause / Resume** button |
| Cancel         | `Esc`           | **Cancel** button         |

Shortcuts are registered when the application starts. If another program has already reserved one, Human Typer displays a warning and keeps the in-app buttons available. The engine checks for cancellation every 25 ms, including during longer pauses. A run also stops on the first input error, after eight hours, or when the process closes.

`Esc` intentionally acts as a global shortcut while Human Typer is open. Close Human Typer when it is not in use if this conflicts with another utility.

## macOS permissions

macOS requires permission to generate keyboard events:

1. Open **System Settings**.
2. Go to **Privacy & Security → Accessibility**.
3. Enable **Human Typer**.
4. Quit and reopen the application if it was already running.

During development, the list may show Terminal, iTerm, your IDE, or the debug binary instead of Human Typer. Enable the process that runs `npm run tauri dev`. The application checks this permission before typing and displays instructions when it is missing.

## Compatibility

| System        | Status         | Notes                                                                     |
| ------------- | -------------- | ------------------------------------------------------------------------- |
| macOS 12+     | Primary target | Requires Accessibility permission. Distributed binaries should be signed. |
| Windows 11    | Primary target | Elevated applications may reject events from a non-elevated process.      |
| Linux X11     | Supported      | Requires a graphical session and the Tauri system dependencies.           |
| Linux Wayland | Experimental   | Input injection and global shortcuts depend on compositor policy.         |

Protected fields, elevated applications, games, and remote desktop software may reject simulated input.

## Architecture

```text
src/
├── components/            # Small UI components and controls
├── hooks/                 # Preferences, theme, and the Tauri bridge
├── lib/                   # Pure logic and tests
├── types/                 # TypeScript contracts
├── App.tsx
└── main.tsx
src-tauri/
├── src/
│   ├── lib.rs             # Commands, shared state, and global shortcuts
│   ├── platform.rs        # Platform-specific permission checks
│   └── typing_engine.rs   # Countdown, timing, and Unicode input
├── capabilities/          # Minimal Tauri permissions
├── Cargo.toml
└── tauri.conf.json
```

React invokes Tauri commands and listens for state events. A native worker owns the countdown and typing loop, while `enigo` emits each character separately. Synchronized worker state lets global shortcuts pause or cancel without relying on WebView focus.

## Persistence and privacy

Only the speed, variation, countdown, theme, and punctuation preference are stored in `localStorage`. Text exists only in memory and is discarded when the application closes or reloads.

- Text is never sent over the network.
- There are no analytics, crash reporting services, or user accounts.
- Text is never written to logs.
- Tauri's content security policy restricts external resources.

## Testing

Pure frontend logic tests cover Unicode counting, progress, persistence, and duration estimates. Rust tests cover delay components, the minimum delay, punctuation, and the main control-state transitions. Real keystrokes are validated manually on each platform because automating them would create fragile tests and could type into the wrong application.

```bash
npm run check
cargo test --manifest-path src-tauri/Cargo.toml
```

## License

Copyright © 2026 AugustoOM.

Human Typer is free software licensed under the [GNU General Public License version 3](LICENSE), identified by the SPDX expression `GPL-3.0-only`. You may use, study, modify, and redistribute it under the terms of that license. Distributed modified versions must preserve the same freedoms and provide the corresponding source as required by the GPL.
