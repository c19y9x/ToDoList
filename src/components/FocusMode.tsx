import { useState, useEffect, useCallback } from "react";
import { X, Play, Pause, RotateCcw, Check } from "lucide-react";
import { useTodoStore } from "@/stores/todoStore";
import { cn } from "@/lib/utils";

interface FocusModeProps {
  taskId: string;
  onClose: () => void;
}

const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds

export default function FocusMode({ taskId, onClose }: FocusModeProps) {
  const { tasks, completeTask } = useTodoStore();
  const task = tasks.find((t) => t.id === taskId);

  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const progress = 1 - timeLeft / FOCUS_DURATION;

  // Timer logic
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleReset = useCallback(() => {
    setTimeLeft(FOCUS_DURATION);
    setIsRunning(false);
    setIsFinished(false);
  }, []);

  const handleComplete = useCallback(async () => {
    await completeTask(taskId);
    onClose();
  }, [completeTask, taskId, onClose]);

  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 focus-overlay flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X size={20} />
      </button>

      <div className="text-center space-y-8 animate-fade-in px-6">
        {/* Task title */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-white/40 uppercase tracking-[0.2em]">
            专注模式
          </p>
          <h1 className="text-2xl font-bold text-white max-w-md leading-snug">
            {task.title}
          </h1>
          {task.description && (
            <p className="text-sm text-white/50 max-w-sm mx-auto">
              {task.description}
            </p>
          )}
        </div>

        {/* Timer ring */}
        <div className="relative w-56 h-56 mx-auto">
          {/* Background ring */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="3"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${progress * 276.46} 276.46`}
              className="transition-all duration-1000 ease-linear"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>

          {/* Timer text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "text-5xl font-mono font-bold text-white tabular-nums",
                isFinished && "text-emerald-400"
              )}
            >
              {isFinished ? "完成!" : formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {isFinished ? (
            <>
              <button
                onClick={handleComplete}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl",
                  "bg-emerald-500 hover:bg-emerald-400 text-white font-semibold",
                  "shadow-lg shadow-emerald-500/25",
                  "transition-all duration-200 active:scale-95"
                )}
              >
                <Check size={18} />
                标记完成
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-3 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RotateCcw size={18} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95",
                  isRunning
                    ? "bg-white/10 hover:bg-white/15 text-white"
                    : "bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25"
                )}
              >
                {isRunning ? (
                  <>
                    <Pause size={18} /> 暂停
                  </>
                ) : (
                  <>
                    <Play size={18} /> {timeLeft < FOCUS_DURATION ? "继续" : "开始专注"}
                  </>
                )}
              </button>

              {!isRunning && timeLeft < FOCUS_DURATION && (
                <button
                  onClick={handleReset}
                  className="px-4 py-3 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <RotateCcw size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
