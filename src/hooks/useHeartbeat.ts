import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

/**
 * Optional frontend-side heartbeat. The Rust backend already runs a 60s
 * interval, but this hook can force an immediate check when the main window
 * regains focus after being minimized.
 */
export function useHeartbeat() {
  useEffect(() => {
    const handleFocus = () => {
      invoke("check_due_tasks").catch(() => {});
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);
}
