#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Create and enter a Tokio runtime so that tokio::spawn works
    // inside Tauri commands and setup hooks.
    let rt = tokio::runtime::Runtime::new().expect("failed to create Tokio runtime");
    let _guard = rt.enter();
    // The runtime must stay alive for the entire app lifetime.
    // run() blocks until the app exits, so rt is not dropped early.
    hitodo_lib::run();
    drop(_guard);
    drop(rt);
}
