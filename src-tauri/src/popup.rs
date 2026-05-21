use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewWindowBuilder};

/// Holds the snooze timer handle so we can abort it if the user completes the task instead.
pub struct PopupState {
    pub active_timer: Option<tokio::task::JoinHandle<()>>,
}

/// Create (or reuse) the popup window. Called once during app setup.
pub fn create_popup_window(app: &AppHandle) -> tauri::Result<()> {
    // If popup already exists, just return
    if app.get_webview_window("popup-main").is_some() {
        return Ok(());
    }

    let popup = WebviewWindowBuilder::new(
        app,
        "popup-main",
        tauri::WebviewUrl::App("popup.html".into()),
    )
    .title("任务提醒")
    .inner_size(390.0, 230.0)
    .min_inner_size(390.0, 230.0)
    .max_inner_size(390.0, 230.0)
    .always_on_top(true)
    .closable(false)
    .maximizable(false)
    .minimizable(false)
    .resizable(false)
    .decorations(false)
    .skip_taskbar(true)
    .visible(false)
    .transparent(true)
    .shadow(true)
    .build()?;

    // Prevent closing via Alt+F4 or any other means
    let _popup_clone = popup.clone();
    popup.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
        }
    });

    Ok(())
}

/// Position the popup at the bottom-right of the primary monitor and show it.
pub fn show_popup(app: &AppHandle) -> tauri::Result<()> {
    if let Some(popup) = app.get_webview_window("popup-main") {
        // Position at bottom-right
        if let Ok(Some(monitor)) = app.primary_monitor() {
            let size = monitor.size();
            let scale = monitor.scale_factor();
            let popup_size = (390.0 * scale, 230.0 * scale);
            let x = (size.width as f64 - popup_size.0) / scale - 16.0;
            let y = (size.height as f64 - popup_size.1) / scale - 16.0;
            popup.set_position(tauri::Position::Physical(
                tauri::PhysicalPosition::new(x.max(0.0) as i32, y.max(0.0) as i32),
            ))?;
        }

        popup.show()?;
        popup.set_focus()?;
        popup.set_always_on_top(true)?;
    }
    Ok(())
}

/// Hide the popup window.
pub fn hide_popup(app: &AppHandle) -> tauri::Result<()> {
    if let Some(popup) = app.get_webview_window("popup-main") {
        popup.hide()?;
    }
    Ok(())
}

/// Check for due tasks and show popup if any exist.
pub fn check_and_show_due_tasks(
    app: &AppHandle,
    conn: &std::sync::Mutex<rusqlite::Connection>,
) {
    let due_tasks = {
        let db = conn.lock().unwrap();
        crate::db::get_due_tasks(&db).unwrap_or_default()
    };

    if !due_tasks.is_empty() {
        // Send the first due task to the popup
        if let Some(popup) = app.get_webview_window("popup-main") {
            // Store current task id in the window's visible state for the popup page
            popup.emit("popup-task", &due_tasks[0]).ok();
        }
        show_popup(app).ok();
    }
}

/// Spawn the 60-second heartbeat that checks for due tasks.
#[allow(dead_code)]
pub fn start_heartbeat(app: AppHandle) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        interval.tick().await;

        loop {
            interval.tick().await;

            let state = app.state::<Mutex<rusqlite::Connection>>();
            let due_tasks = {
                let db = state.lock().unwrap();
                crate::db::get_due_tasks(&db).unwrap_or_default()
            };

            if !due_tasks.is_empty() {
                if let Some(popup) = app.get_webview_window("popup-main") {
                    popup.emit("popup-task", &due_tasks[0]).ok();
                }
                show_popup(&app).ok();
            }
        }
    });
}
