import { useEffect } from "react";
import { useTodoStore } from "./stores/todoStore";
import AppLayout from "./components/AppLayout";
import FocusMode from "./components/FocusMode";

export default function App() {
  const { focusedTaskId, fetchTasks, setFocus } = useTodoStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Listen for popup task events and check due tasks on startup
  useEffect(() => {
    const checkDue = async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("check_due_tasks");
      } catch {
        // ignore errors from initial check
      }
    };
    checkDue();
  }, []);

  // Global keyboard shortcut: Escape to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusedTaskId) {
        setFocus(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedTaskId, setFocus]);

  if (focusedTaskId) {
    return (
      <FocusMode
        taskId={focusedTaskId}
        onClose={() => setFocus(null)}
      />
    );
  }

  return <AppLayout />;
}
