/* Ticket + time-tracking shared types and constants (client- and server-safe). */

export type TicketStatus = "backlog" | "ready" | "in_progress" | "review" | "done";

export const STATUSES: TicketStatus[] = ["backlog", "ready", "in_progress", "review", "done"];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  backlog: "Backlog",
  ready: "Ready to Start",
  in_progress: "In Progress",
  review: "Needs Review",
  done: "Done",
};

export const STATUS_DOT: Record<TicketStatus, string> = {
  backlog: "#8A8578",
  ready: "#5FA8D3",
  in_progress: "#E8994E",
  review: "#D2452B",
  done: "#4FB477",
};

export interface Ticket {
  id: string;
  clientId: string;
  title: string;
  description: string;
  form: Record<string, string>;
  status: TicketStatus;
  priority: number;
  position: number;
  createdBy: "studio" | "client";
  createdAt: string;
  updatedAt: string;
}

/** Options offered in the client request form. */
export const REQUEST_TYPES = [
  "Logo",
  "Brand / Stylescape",
  "Social media",
  "Website / landing page",
  "Print",
  "Packaging",
  "Illustration",
  "Other",
];

/** Coarse "time since" label, e.g. "3d 4h", "5h 12m", "just now". */
export function formatAgo(iso: string, nowMs: number): string {
  const s = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "just now";
}

/** Format seconds as e.g. "2h 05m" or "12m 30s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}
