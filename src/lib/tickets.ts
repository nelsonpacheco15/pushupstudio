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
  deliverableUrl: string | null; // Google Drive link to the design
  createdAt: string;
  updatedAt: string;
}

/** Turn a Google Drive share link into an embeddable iframe URL (file or folder). */
export function driveEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  const folder = url.match(/\/folders\/([-\w]+)/);
  if (folder) return `https://drive.google.com/embeddedfolderview?id=${folder[1]}#grid`;
  const file = url.match(/\/file\/d\/([-\w]+)/) || url.match(/[?&]id=([-\w]+)/);
  if (file) return `https://drive.google.com/file/d/${file[1]}/preview`;
  return url.startsWith("http") ? url : null;
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

/** Extra intake fields tailored per request type (request templates). Answers are
    stored on the ticket form and appended to the brief. */
export interface TemplateField { name: string; label: string; placeholder?: string; }
export const REQUEST_TEMPLATES: Record<string, TemplateField[]> = {
  "Logo": [
    { name: "Brand name", label: "Brand / business name", placeholder: "Name to feature" },
    { name: "Style", label: "Style you're after", placeholder: "Minimal, playful, bold…" },
    { name: "Usage", label: "Where it'll be used", placeholder: "Web, print, app icon…" },
  ],
  "Social media": [
    { name: "Platform", label: "Platform(s)", placeholder: "Instagram, LinkedIn…" },
    { name: "Format", label: "Format", placeholder: "Post, story, carousel…" },
    { name: "How many", label: "How many", placeholder: "e.g. 3 posts" },
    { name: "On-design copy", label: "Text to include", placeholder: "Any copy on the design" },
  ],
  "Website / landing page": [
    { name: "Sections", label: "Pages / sections", placeholder: "Hero, features, pricing…" },
    { name: "Inspiration", label: "Sites you like", placeholder: "Links" },
  ],
  "Print": [
    { name: "Size", label: "Size / dimensions", placeholder: "A4, business card…" },
    { name: "Quantity", label: "Quantity", placeholder: "e.g. 500" },
  ],
  "Packaging": [
    { name: "Product", label: "Product", placeholder: "What's being packaged" },
    { name: "Dimensions", label: "Dimensions", placeholder: "Box / label size…" },
  ],
  "Illustration": [
    { name: "Subject", label: "Subject", placeholder: "What to illustrate" },
    { name: "Style", label: "Style", placeholder: "Flat, line, 3D…" },
  ],
};

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
