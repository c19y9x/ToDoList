import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LayoutList, Download, Check, AlertCircle } from "lucide-react";
import TaskList from "./TaskList";
import TaskForm from "./TaskForm";

export default function AppLayout() {
  const [exportStatus, setExportStatus] = useState<"idle" | "ok" | "err">("idle");
  const [exportPath, setExportPath] = useState("");

  const handleExport = async () => {
    try {
      const path = await invoke<string>("export_tasks");
      setExportPath(path);
      setExportStatus("ok");
      setTimeout(() => setExportStatus("idle"), 4000);
    } catch {
      setExportStatus("err");
      setTimeout(() => setExportStatus("idle"), 4000);
    }
  };

  return (
    <div className="h-screen flex flex-col mica-bg rounded-xl overflow-hidden">
      {/* Title Bar — draggable region for Tauri */}
      <header
        data-tauri-drag-region
        className="shrink-0 flex items-center justify-between px-5 pt-5 pb-2"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/90 flex items-center justify-center shadow-sm shadow-primary/20">
            <LayoutList size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">HiTodo</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">
              打工人待办
            </p>
          </div>
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          data-tauri-drag-region="false"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-muted-foreground
                     hover:text-foreground hover:bg-accent transition-colors"
          title="导出全部任务为 JSON"
        >
          {exportStatus === "ok" ? (
            <Check size={13} className="text-emerald-500" />
          ) : exportStatus === "err" ? (
            <AlertCircle size={13} className="text-red-500" />
          ) : (
            <Download size={13} />
          )}
          导出
        </button>
      </header>

      {/* Export status toast */}
      {exportStatus !== "idle" && (
        <div className="px-5 pb-1 animate-slide-up">
          <p className={`text-[10px] ${exportStatus === "ok" ? "text-emerald-600" : "text-red-500"}`}>
            {exportStatus === "ok"
              ? `已导出到: ${exportPath}`
              : "导出失败"}
          </p>
        </div>
      )}

      {/* Task Count */}
      <div className="px-5 pb-1" data-tauri-drag-region>
        <p className="text-[11px] text-muted-foreground font-medium">
          今日待办 · 保持专注
        </p>
      </div>

      {/* Scrollable Task List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2">
        <TaskList />
      </div>

      {/* Bottom: Add Task Form */}
      <div className="shrink-0">
        <TaskForm />
      </div>
    </div>
  );
}
