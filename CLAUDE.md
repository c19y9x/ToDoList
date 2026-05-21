# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```powershell
# Frontend only (Vite dev server on :1420)
npm run dev

# Frontend production build
npm run build

# Rust debug build (requires MSVC env — see below)
cd src-tauri; cargo build

# Rust release build
cd src-tauri; cargo build --release

# Full Tauri dev (frontend + Rust debug + window)
npx tauri dev

# Full Tauri release build (bundles everything into dist + exe)
npx tauri build
```

### MSVC Build Environment

The Rust backend needs the MSVC linker (`link.exe`) on PATH. On this machine, set up with:

```powershell
$msvcBin = "C:\BuildTools\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64"
$sdkBin = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64"
$sdkInclude = "C:\Program Files (x86)\Windows Kits\10\Include\10.0.22621.0"
$sdkLib = "C:\Program Files (x86)\Windows Kits\10\Lib\10.0.22621.0"
$msvcInclude = "C:\BuildTools\VC\Tools\MSVC\14.44.35207\include"
$msvcLib = "C:\BuildTools\VC\Tools\MSVC\14.44.35207\lib\x64"
$env:Path = "$env:USERPROFILE\.cargo\bin;$msvcBin;$sdkBin;$env:Path"
$env:LIB = "$msvcLib;$sdkLib\um;$sdkLib\ucrt"
$env:INCLUDE = "$msvcInclude;$sdkInclude\ucrt;$sdkInclude\um;$sdkInclude\shared"
```

Active Rust toolchain must be `stable-x86_64-pc-windows-msvc`. Verify with `rustup show active-toolchain`.

### Release Output

```
src-tauri/target/release/hitodo.exe   (~12.8 MB standalone)
hitodo.exe                             (copy in project root)
```

## Architecture

**Tauri v2** desktop app — Rust backend + React/Vite frontend, IPC via `#[tauri::command]` + `invoke()`.

### Rust Side (`src-tauri/src/`)

| File | Role |
|------|------|
| `main.rs` | Creates Tokio runtime, enters it, calls `hitodo_lib::run()`. **Critical**: `windows_subsystem = "windows"` is set so no console window. Tokio runtime must exist before `run()` because commands and setup hooks use `tokio::spawn`. |
| `lib.rs` | App builder: registers plugins (autostart, shell), 8 Tauri commands, `setup()` hook that initializes DB, creates popup window, sets up tray, intercepts main window close→hide, starts heartbeat. Uses `AppState { db: Mutex<Connection> }` as managed state. |
| `db.rs` | SQLite via `rusqlite` (bundled). Tasks table with columns: id, title, description, due_date, completed, snooze_until, sort_order, timestamps. **Date comparison gotcha**: frontend stores ISO 8601 (`2024-05-21T14:30:00`), but SQLite `datetime()` uses space separator. All queries use `REPLACE(due_date, 'T', ' ')` to normalize. |
| `tray.rs` | Builds system tray icon programmatically (generates RGBA pixel data — blue circle with checkmark). **Must call `app.manage(tray)`** to store the TrayIcon in app state; otherwise it's dropped and the icon disappears. Tray left-click toggles main window visibility, right-click menu has show/quit. |
| `popup.rs` | Creates a second webview window (`popup-main`) loading `popup.html`. Configured: `always_on_top: true`, `closable: false`, `decorations: false`, `skip_taskbar: true`. **Close prevention**: `on_window_event` intercepts `CloseRequested` and calls `api.prevent_close()` to block Alt+F4. Window is created once at setup (hidden) and reused. |

### Tauri IPC Commands

- `get_tasks` → `Vec<Task>`
- `create_task` / `update_task` / `delete_task` — CRUD
- `reorder_tasks(ids: Vec<String>)` — batch sort order update
- `complete_task(id)` — marks done + hides popup
- `snooze_task(id, minutes)` — sets `snooze_until`, hides popup, spawns one-shot timer to re-check
- `check_due_tasks` — queries DB, emits `popup-task` event if any due, shows popup
- `export_tasks` — writes all tasks as pretty JSON to exe directory, returns path

### Frontend Side (`src/`)

**Two entry points** (configured in `vite.config.ts` as multi-page):
- `index.html` → `main.tsx` → `App.tsx` — main window
- `popup.html` → `popup.tsx` → `TaskPopup.tsx` — reminder popup window

**State**: Zustand store (`todoStore.ts`) — tasks array, CRUD actions that call `invoke()`.

**Key Components**:
- `AppLayout.tsx` — header (with export button), task list, add-task form
- `TaskList.tsx` — @dnd-kit drag-and-drop for unfinished tasks, static list for completed
- `TaskCard.tsx` — glass-morphism card with drag handle, checkbox, due-date badge (red pulse when overdue), focus/delete actions
- `TaskPopup.tsx` — force-interaction popup: listens for `popup-task` event, shows snooze menu (5/15/30 min) and complete button with gold confetti
- `FocusMode.tsx` — fullscreen 25-min pomodoro overlay with SVG ring timer
- `ConfettiEffect.tsx` — canvas-confetti gold particle burst

**Styling**: Tailwind CSS with semi-transparent glass cards. No longer uses Windows 11 Mica/blur (removed for Win10 compatibility). The `.mica-bg` class now provides a solid semi-transparent background instead of `backdrop-filter`.

## Key Design Decisions

### Database Location
Uses `std::env::current_exe().parent()` — the exe's directory. Falls back to AppData if that fails. This makes the app portable.

### Heartbeat
Runs every **10 seconds** (tokio interval in setup). Does an immediate first check on startup, then polls. Compares `REPLACE(due_date, 'T', ' ') <= datetime('now', 'localtime')` to find due tasks.

### Snooze Flow
1. Frontend calls `snooze_task(id, minutes)`
2. Rust sets `snooze_until = now + minutes` in DB
3. Hides popup window
4. Spawns a one-shot tokio timer — when it fires, re-queries DB and shows popup if task still due

### Window Close → Tray
Main window `CloseRequested` is intercepted: `api.prevent_close()` + `window.hide()`. The app only exits via tray menu "退出" or killing the process.

### No `transparent` Window
Set to `false` in tauri.conf.json. Transparent windows + Mica blur caused blank/invisible windows on Windows 10.

## Common Pitfalls

1. **Tray icon disappears instantly**: Don't use `let _tray = ...` in a function scope — the underscore prefix drops it. Store via `app.manage(tray)`.
2. **`tokio::spawn` panics with "no reactor running"**: A Tokio runtime must be created and entered before `tauri::run()`. See `main.rs`.
3. **Date comparisons fail silently**: ISO 8601 `T` vs SQLite space separator. Always use `REPLACE(col, 'T', ' ')` in SQL WHERE clauses comparing dates.
4. **`Emitter` trait must be in scope**: `use tauri::Emitter;` is required for `.emit()` on windows/app handles.
5. **`State` borrow conflicts with `tokio::spawn`**: Don't clone `state.inner()` before spawn — instead clone the `AppHandle`, move it into the async block, and call `app_handle.state::<T>()` inside.
6. **`tauri.conf.json` autostart config**: Do NOT put `"autostart": { "enabled": true }` in the plugins section — the plugin reads its config from `tauri_plugin_autostart::init()` in Rust code, and a map value in the JSON will cause a deserialization panic.
