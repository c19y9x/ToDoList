import { useState } from "react";
import { Plus, Calendar, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useTodoStore } from "@/stores/todoStore";
import { cn } from "@/lib/utils";

export default function TaskForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const { addTask } = useTodoStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let dueDateTime: string | null = null;
    if (dueDate) {
      const time = dueTime || "23:59";
      dueDateTime = `${dueDate}T${time}:00`;
    }

    await addTask(title.trim(), description.trim(), dueDateTime);

    setTitle("");
    setDescription("");
    setDueDate("");
    setDueTime("");
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="px-4 pb-4">
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl",
            "text-sm text-muted-foreground font-medium",
            "border-2 border-dashed border-border/60",
            "hover:border-primary/40 hover:text-primary hover:bg-primary/5",
            "transition-all duration-200"
          )}
        >
          <Plus size={16} />
          添加新任务
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <form
        onSubmit={handleSubmit}
        className="glass-card p-4 space-y-3 animate-slide-up"
      >
        {/* Title */}
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="任务标题..."
            className="flex-1 border-0 bg-transparent px-0 text-sm font-medium placeholder:text-muted-foreground/60 focus-visible:ring-0"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="添加描述..."
          rows={2}
          className="w-full bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus-visible:ring-0"
        />

        {/* Due Date & Time */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 h-8 px-2 rounded-md text-xs bg-muted/50 text-foreground border border-border/50
                         hover:border-primary/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30
                         cursor-pointer transition-colors"
              style={{ colorScheme: 'light dark' }}
            />
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              placeholder="截止时间"
              className="w-[90px] h-8 px-2 rounded-md text-xs bg-muted/50 text-foreground border border-border/50
                         hover:border-primary/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30
                         cursor-pointer transition-colors"
              style={{ colorScheme: 'light dark' }}
            />
          </div>
          {(dueDate || dueTime) && (
            <button
              type="button"
              onClick={() => { setDueDate(""); setDueTime(""); }}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="清除截止时间"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            取消
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!title.trim()}
            className="gap-1.5"
          >
            <Plus size={14} />
            添加
          </Button>
        </div>
      </form>
    </div>
  );
}
