import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTodoStore } from "@/stores/todoStore";
import TaskCard from "./TaskCard";
import { SortableTaskCard } from "./SortableTaskCard";

export default function TaskList() {
  const { tasks, reorderTasks } = useTodoStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const unfinished = useMemo(
    () => tasks.filter((t) => !t.completed),
    [tasks]
  );
  const finished = useMemo(
    () => tasks.filter((t) => t.completed),
    [tasks]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = unfinished.findIndex((t) => t.id === active.id);
    const newIndex = unfinished.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(unfinished, oldIndex, newIndex);
    reorderTasks(reordered.map((t) => t.id));
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-fade-in">
        <div className="text-5xl mb-4 opacity-30">📋</div>
        <p className="text-sm font-medium">还没有待办事项</p>
        <p className="text-xs mt-1 opacity-60">点击下方按钮添加你的第一个任务</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-2 pb-4">
      {/* Unfinished tasks with drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={unfinished.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {unfinished.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </DndContext>

      {/* Completed tasks (no drag) */}
      {finished.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-medium text-muted-foreground/60 px-3 mb-2 uppercase tracking-wider">
            已完成 · {finished.length}
          </p>
          <div className="flex flex-col gap-1.5">
            {finished.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
