import { useState } from "react";
import { GripVertical, Clock, Trash2, Focus, Check, AlarmClock } from "lucide-react";
import { cn, formatDueDate, isOverdue } from "@/lib/utils";
import { useTodoStore, type Task } from "@/stores/todoStore";

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

export default function TaskCard({ task, isDragging }: TaskCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const { completeTask, removeTask, setFocus, updateTask } = useTodoStore();
  const overdue = isOverdue(task.due_date);
  const isCompleted = task.completed;

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted) {
      await completeTask(task.id);
    } else {
      // Undo completion
      await updateTask(task.id, { completed: false });
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 p-4",
        "rounded-xl transition-all duration-200",
        "hover:shadow-md hover:translate-y-[-1px]",
        "border border-transparent hover:border-border/50",
        isDragging && "opacity-50 shadow-lg z-50",
        isCompleted && "opacity-60",
        // Glass card effect
        "glass-card"
      )}
    >
      {/* Drag Handle */}
      <button
        className="drag-handle mt-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
        aria-label="拖拽排序"
      >
        <GripVertical size={16} />
      </button>

      {/* Checkbox */}
      <button
        onClick={handleComplete}
        className={cn(
          "mt-0.5 w-5 h-5 rounded-full border-2 shrink-0",
          "flex items-center justify-center transition-all duration-300",
          "hover:border-primary hover:scale-110",
          isCompleted
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/30"
        )}
      >
        {isCompleted && (
          <Check size={12} strokeWidth={3} className="animate-fade-in" />
        )}
      </button>

      {/* Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => setFocus(task.id)}
      >
        <p
          className={cn(
            "text-sm font-medium leading-snug transition-all duration-300",
            isCompleted && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Due Date Badge */}
        {task.due_date && (
          <div
            className={cn(
              "inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-medium",
              "transition-colors duration-300",
              overdue && !isCompleted
                ? "bg-red-50 text-red-600 border border-red-200"
                : "bg-blue-50 text-blue-600 border border-blue-200"
            )}
          >
            {overdue && !isCompleted ? (
              <AlarmClock size={11} className="urgent-pulse rounded-full" />
            ) : (
              <Clock size={11} />
            )}
            <span>{formatDueDate(task.due_date)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
        {/* Focus button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setFocus(task.id);
          }}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="专注模式"
        >
          <Focus size={14} />
        </button>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (showDelete) {
              removeTask(task.id);
            } else {
              setShowDelete(true);
              setTimeout(() => setShowDelete(false), 3000);
            }
          }}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            showDelete
              ? "text-red-500 bg-red-50 hover:bg-red-100"
              : "text-muted-foreground hover:text-red-500 hover:bg-red-50"
          )}
          title={showDelete ? "确认删除" : "删除"}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
