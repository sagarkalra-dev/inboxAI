import type { Email, Priority } from "@/lib/email/types";

export function emailParamId(e: Email | { accountId: string; id: string }): string {
  return encodeURIComponent(`${e.accountId}|${e.id}`);
}

export function priorityRank(p: Priority | undefined): number {
  switch (p) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}

export function priorityClass(p: Priority | undefined): string {
  switch (p) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

export function priorityLabel(p: Priority | undefined): string {
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "Unrated";
}

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}
