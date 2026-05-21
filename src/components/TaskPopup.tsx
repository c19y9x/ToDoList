import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { AlarmClock, BellRing, CheckCircle2, ChevronRight } from "lucide-react";
import { cn, formatDueDate } from "@/lib/utils";
import type { Task } from "@/stores/todoStore";
import ConfettiEffect from "./ConfettiEffect";

type SnoozeOption = { label: string; minutes: number };

const SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: "5 分钟", minutes: 5 },
  { label: "15 分钟", minutes: 15 },
  { label: "30 分钟", minutes: 30 },
];

export default function TaskPopup() {
  const [task, setTask] = useState<Task | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Listen for incoming task data from Rust backend
  useEffect(() => {
    const unlisten = listen<Task>("popup-task", (event) => {
      setTask(event.payload);
      setShowSnoozeMenu(false);
      setIsCompleting(false);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleComplete = useCallback(async () => {
    if (!task || isCompleting) return;
    setIsCompleting(true);

    // Trigger confetti first
    setShowConfetti(true);

    // Wait for confetti to be visible, then complete
    setTimeout(async () => {
      try {
        await invoke("complete_task", { id: task.id });
        setTask(null);
        setShowConfetti(false);
        setIsCompleting(false);
      } catch {
        setIsCompleting(false);
      }
    }, 800);
  }, [task, isCompleting]);

  const handleSnooze = useCallback(
    async (minutes: number) => {
      if (!task) return;
      setShowSnoozeMenu(false);
      try {
        await invoke("snooze_task", { id: task.id, minutes });
        setTask(null);
      } catch {
        // ignore
      }
    },
    [task]
  );

  // No task to show
  if (!task) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative w-full h-screen flex items-center justify-center",
        "select-none"
      )}
    >
      {/* Confetti overlay */}
      {showConfetti && <ConfettiEffect />}

      {/* Main popup card */}
      <div
        className={cn(
          "w-[380px] rounded-2xl overflow-hidden",
          "animate-fade-in",
          "bg-gray-900/95 backdrop-blur-xl",
          "border border-white/10",
          "shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]"
        )}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <BellRing size={16} className="text-red-400" />
            </div>
            <span className="text-xs font-medium text-red-400 uppercase tracking-wider">
              任务到期
            </span>
          </div>

          <h2 className="text-base font-semibold text-white leading-snug">
            {task.title}
          </h2>

          {task.due_date && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
              <AlarmClock size={12} />
              <span>截止时间: {formatDueDate(task.due_date)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 pt-2 space-y-2">
          {/* Snooze Section */}
          {!showSnoozeMenu ? (
            <button
              onClick={() => setShowSnoozeMenu(true)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 rounded-xl",
                "text-sm text-gray-300 font-medium",
                "bg-white/5 hover:bg-white/10",
                "border border-white/10 hover:border-white/20",
                "transition-all duration-200"
              )}
            >
              <span className="flex items-center gap-2">
                <AlarmClock size={15} />
                稍后提醒
              </span>
              <ChevronRight size={14} className="text-gray-500" />
            </button>
          ) : (
            <div className="flex gap-2 animate-slide-up">
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  onClick={() => handleSnooze(opt.minutes)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-xs font-medium",
                    "bg-white/5 hover:bg-white/10",
                    "border border-white/10 hover:border-white/20",
                    "text-gray-300 transition-all duration-200"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Complete Button */}
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
              "text-sm font-semibold text-white",
              "bg-gradient-to-r from-emerald-500 to-teal-500",
              "hover:from-emerald-400 hover:to-teal-400",
              "shadow-lg shadow-emerald-500/25",
              "transition-all duration-200",
              "active:scale-[0.98]",
              isCompleting && "opacity-70 pointer-events-none"
            )}
          >
            <CheckCircle2 size={16} />
            {isCompleting ? "完成中..." : "已完成"}
          </button>
        </div>

        {/* Subtle hint */}
        <div className="px-6 pb-4">
          <p className="text-[10px] text-gray-500 text-center">
            请选择一项操作以关闭此提醒
          </p>
        </div>
      </div>
    </div>
  );
}
