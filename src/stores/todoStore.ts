import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  completed: boolean;
  snooze_until: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  completed: boolean;
  snooze_until: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TodoState {
  tasks: Task[];
  isLoading: boolean;
  focusedTaskId: string | null;
  error: string | null;

  fetchTasks: () => Promise<void>;
  addTask: (title: string, description: string, dueDate: string | null) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  snoozeTask: (id: string, minutes: number) => Promise<void>;
  reorderTasks: (ids: string[]) => Promise<void>;
  setFocus: (taskId: string | null) => void;
  clearError: () => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  tasks: [],
  isLoading: false,
  focusedTaskId: null,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await invoke<Task[]>("get_tasks");
      set({ tasks, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addTask: async (title, description, dueDate) => {
    set({ error: null });
    const now = new Date().toISOString();
    const task: CreateTaskInput = {
      id: crypto.randomUUID(),
      title,
      description,
      due_date: dueDate,
      completed: false,
      snooze_until: null,
      sort_order: get().tasks.length,
      created_at: now,
      updated_at: now,
    };

    try {
      await invoke("create_task", { task });
      await get().fetchTasks();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  updateTask: async (id, data) => {
    set({ error: null });
    const existing = get().tasks.find((t) => t.id === id);
    if (!existing) return;

    const updated = { ...existing, ...data, updated_at: new Date().toISOString() };

    try {
      await invoke("update_task", { task: updated });
      await get().fetchTasks();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  removeTask: async (id) => {
    set({ error: null });
    try {
      await invoke("delete_task", { id });
      set((s) => ({
        tasks: s.tasks.filter((t) => t.id !== id),
        focusedTaskId: s.focusedTaskId === id ? null : s.focusedTaskId,
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  completeTask: async (id) => {
    set({ error: null });
    try {
      await invoke("complete_task", { id });
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, completed: true, snooze_until: null } : t
        ),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  snoozeTask: async (id, minutes) => {
    set({ error: null });
    try {
      await invoke("snooze_task", { id, minutes });
      await get().fetchTasks();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  reorderTasks: async (ids) => {
    set({ error: null });
    // Optimistic update
    const oldTasks = get().tasks;
    const reordered = ids
      .map((id) => oldTasks.find((t) => t.id === id)!)
      .filter(Boolean);
    // Fill in any missing tasks at the end
    const remaining = oldTasks.filter((t) => !ids.includes(t.id));
    set({ tasks: [...reordered, ...remaining] });

    try {
      await invoke("reorder_tasks", { ids });
    } catch (e) {
      set({ tasks: oldTasks, error: String(e) });
    }
  },

  setFocus: (taskId) => {
    set({ focusedTaskId: taskId });
  },

  clearError: () => set({ error: null }),
}));
