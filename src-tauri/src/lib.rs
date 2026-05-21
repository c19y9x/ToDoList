use std::sync::Mutex;
use tauri::{Emitter, Manager};

mod db;
mod popup;
mod tray;

use db::Task;

// ── State ──────────────────────────────────────────

struct AppState {
    db: Mutex<rusqlite::Connection>,
}

// ── Commands ───────────────────────────────────────

#[tauri::command]
fn get_tasks(state: tauri::State<AppState>) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_all_tasks(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_task(state: tauri::State<AppState>, task: Task) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::upsert_task(&conn, &task).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_task(state: tauri::State<AppState>, task: Task) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::upsert_task(&conn, &task).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_task(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::delete_task(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn reorder_tasks(state: tauri::State<AppState>, ids: Vec<String>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE tasks SET sort_order = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            rusqlite::params![i as i32, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn complete_task(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    id: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::complete_task(&conn, &id).map_err(|e| e.to_string())?;
    drop(conn);

    popup::hide_popup(&app).ok();
    Ok(())
}

#[tauri::command]
fn snooze_task(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    id: String,
    minutes: i64,
) -> Result<(), String> {
    let snooze_until = chrono::Local::now()
        .checked_add_signed(chrono::Duration::minutes(minutes))
        .unwrap()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        db::snooze_task(&conn, &id, &snooze_until).map_err(|e| e.to_string())?;
    }

    popup::hide_popup(&app).ok();

    // Spawn a one-shot timer to re-check after snooze period
    let app_clone = app.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs((minutes * 60) as u64)).await;

        let due = {
            let state = app_clone.state::<AppState>();
            let conn = state.db.lock().unwrap();
            db::get_due_tasks(&conn).unwrap_or_default()
        };

        if !due.is_empty() {
            if let Some(popup) = app_clone.get_webview_window("popup-main") {
                popup.emit("popup-task", &due[0]).ok();
            }
            popup::show_popup(&app_clone).ok();
        }
    });

    Ok(())
}

#[tauri::command]
fn check_due_tasks(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let due = db::get_due_tasks(&conn).map_err(|e| e.to_string())?;

    if !due.is_empty() {
        if let Some(popup) = app.get_webview_window("popup-main") {
            popup.emit("popup-task", &due[0]).ok();
        }
        popup::show_popup(&app).ok();
    }

    Ok(due)
}

#[tauri::command]
fn export_tasks(state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let tasks = db::get_all_tasks(&conn).map_err(|e| e.to_string())?;

    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let ts = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("hitodo_export_{}.json", ts);
    let filepath = exe_dir.join(&filename);

    let json = serde_json::to_string_pretty(&tasks).map_err(|e| e.to_string())?;
    std::fs::write(&filepath, json).map_err(|e| e.to_string())?;

    Ok(filepath.to_string_lossy().to_string())
}

// ── App Entry ──────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart".into()]),
        ))
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize database in the same directory as the executable
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                .unwrap_or_else(|| app.path().app_data_dir().expect("no data dir"));
            let db = db::init_db(exe_dir).expect("failed to initialize database");
            app.manage(AppState {
                db: Mutex::new(db),
            });

            // Create popup window (hidden)
            let handle = app.handle().clone();
            popup::create_popup_window(&handle)?;

            // Setup system tray
            tray::setup_tray(&handle)?;

            // Intercept main window close → hide to tray instead
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        window_clone.hide().ok();
                    }
                });
            }

            // Start heartbeat for due task checking
            let app_handle = handle.clone();
            tokio::spawn(async move {
                // Check immediately on startup
                {
                    let state = app_handle.state::<AppState>();
                    let due = {
                        let conn = state.db.lock().unwrap();
                        db::get_due_tasks(&conn).unwrap_or_default()
                    };
                    if !due.is_empty() {
                        if let Some(popup) = app_handle.get_webview_window("popup-main") {
                            popup.emit("popup-task", &due[0]).ok();
                        }
                        popup::show_popup(&app_handle).ok();
                    }
                }

                let mut interval = tokio::time::interval(std::time::Duration::from_secs(10));
                loop {
                    interval.tick().await;

                    let state = app_handle.state::<AppState>();
                    let due = {
                        let conn = state.db.lock().unwrap();
                        db::get_due_tasks(&conn).unwrap_or_default()
                    };

                    if !due.is_empty() {
                        if let Some(popup) = app_handle.get_webview_window("popup-main") {
                            popup.emit("popup-task", &due[0]).ok();
                        }
                        popup::show_popup(&app_handle).ok();
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_tasks,
            create_task,
            update_task,
            delete_task,
            reorder_tasks,
            complete_task,
            snooze_task,
            check_due_tasks,
            export_tasks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
