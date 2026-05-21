import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 0) {
    const absMin = Math.abs(diffMin);
    if (absMin < 60) return `${absMin}分钟前`;
    if (absMin < 1440) return `${Math.floor(absMin / 60)}小时前`;
    return `${Math.floor(absMin / 1440)}天前`;
  }

  if (diffMin < 60) return `${diffMin}分钟后`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}小时后`;
  return `${Math.floor(diffMin / 1440)}天后`;
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

export function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
