use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

/// Generate a simple 32x32 blue circle checkmark icon as raw RGBA pixel data.
fn generate_tray_icon() -> Image<'static> {
    let width: u32 = 32;
    let height: u32 = 32;
    let mut pixels = vec![0u8; (width * height * 4) as usize];

    let cx: i32 = 16;
    let cy: i32 = 16;
    let r: i32 = 14;

    for y in 0..height as i32 {
        for x in 0..width as i32 {
            let idx = ((y * width as i32 + x) * 4) as usize;
            let dx = x - cx;
            let dy = y - cy;
            let dist = ((dx * dx + dy * dy) as f64).sqrt();

            if dist < r as f64 {
                pixels[idx] = 59;
                pixels[idx + 1] = 130;
                pixels[idx + 2] = 246;
                pixels[idx + 3] = 255;
            } else if dist < (r + 1) as f64 {
                let alpha = (255.0 * ((r + 1) as f64 - dist)) as u8;
                pixels[idx] = 59;
                pixels[idx + 1] = 130;
                pixels[idx + 2] = 246;
                pixels[idx + 3] = alpha;
            }

            let check = |px: i32, py: i32| -> bool {
                let dx1 = 14 - 10;
                let dy1 = 22 - 16;
                let t = ((px - 10) * dx1 + (py - 16) * dy1) as f64 / (dx1 * dx1 + dy1 * dy1) as f64;
                if t >= 0.0 && t <= 1.0 {
                    let ex = 10.0 + t * dx1 as f64;
                    let ey = 16.0 + t * dy1 as f64;
                    let d = ((px as f64 - ex) * (px as f64 - ex) + (py as f64 - ey) * (py as f64 - ey)).sqrt();
                    if d < 1.8 { return true; }
                }
                let dx2 = 23 - 14;
                let dy2 = 10 - 22;
                let t2 = ((px - 14) * dx2 + (py - 22) * dy2) as f64 / (dx2 * dx2 + dy2 * dy2) as f64;
                if t2 >= 0.0 && t2 <= 1.0 {
                    let ex = 14.0 + t2 * dx2 as f64;
                    let ey = 22.0 + t2 * dy2 as f64;
                    let d = ((px as f64 - ex) * (px as f64 - ex) + (py as f64 - ey) * (py as f64 - ey)).sqrt();
                    if d < 1.8 { return true; }
                }
                false
            };

            if check(x, y) {
                pixels[idx] = 255;
                pixels[idx + 1] = 255;
                pixels[idx + 2] = 255;
                pixels[idx + 3] = 255;
            }
        }
    }

    Image::new_owned(pixels, width, height)
}

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示主界面", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let icon = generate_tray_icon();

    let tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("HiTodo - 打工人待办")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    window.show().ok();
                    window.set_focus().ok();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        window.hide().ok();
                    } else {
                        window.show().ok();
                        window.set_focus().ok();
                    }
                }
            }
        })
        .build(app)?;

    // CRITICAL: store the tray icon in app state so it stays alive
    app.manage(tray);

    Ok(())
}
