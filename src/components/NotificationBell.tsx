"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchStudioNotifications, readStudioNotifications,
  fetchClientNotifications, readClientNotifications,
  type NotifFeed,
} from "@/app/actions";
import type { NotificationRecord } from "@/lib/data";

function ago(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const TYPE_ICON: Record<string, string> = {
  new_request: "✎", changes: "↻", approved: "✓", new_version: "◆", review: "◆",
  in_progress: "▸", done: "✓", client_added: "＋", invoice: "€", info: "•",
};

export default function NotificationBell({
  scope, initial, tone = "dark", placement = "inline",
}: { scope: "studio" | "client"; initial: NotifFeed; tone?: "dark" | "light"; placement?: "inline" | "sidebar" }) {
  const [feed, setFeed] = useState<NotifFeed>(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchFn = scope === "studio" ? fetchStudioNotifications : fetchClientNotifications;
  const readFn = scope === "studio" ? readStudioNotifications : readClientNotifications;

  const refresh = useCallback(async () => {
    try { setFeed(await fetchFn()); } catch { /* ignore poll errors */ }
  }, [fetchFn]);

  // Poll for new notifications.
  useEffect(() => {
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && feed.unread > 0) {
      await readFn();
      setFeed((f) => ({ items: f.items.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })), unread: 0 }));
      router.refresh();
    }
  }

  const c = tone === "dark"
    ? { bg: "#0C0C0F", card: "#17171B", border: "rgba(255,255,255,0.13)", text: "#E9E7DE", mute: "#8C887C", accent: "#F4F1E9" }
    : { bg: "#131316", card: "#1c1c20", border: "rgba(255,255,255,0.14)", text: "#E9E7DE", mute: "#8C887C", accent: "#F4F1E9" };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={toggle} aria-label="Notifications"
        style={{ position: "relative", width: 38, height: 38, borderRadius: 10, cursor: "pointer",
          background: open ? c.card : "transparent", border: `1px solid ${c.border}`, color: c.text,
          display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {feed.unread > 0 && (
          <span style={{ position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, padding: "0 4px",
            borderRadius: 999, background: "#D2452B", color: "#fff", fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', monospace" }}>
            {feed.unread > 9 ? "9+" : feed.unread}
          </span>
        )}
      </button>

      {open && (
        <>
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998 }} />
        <div style={{ position: "fixed", zIndex: 9999,
          ...(placement === "sidebar" ? { top: 74, left: 20 } : { top: 64, right: 18 }),
          width: 360, maxWidth: "92vw",
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${c.border}`,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 1, color: c.mute }}>
            [ NOTIFICATIONS ]
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {feed.items.length === 0 && (
              <div style={{ padding: 28, textAlign: "center", color: c.mute, fontSize: 13 }}>You’re all caught up.</div>
            )}
            {feed.items.map((n: NotificationRecord) => {
              const inner = (
                <>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: c.accent, width: 18, flex: "0 0 18px" }}>
                    {TYPE_ICON[n.type] ?? "•"}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 12, color: c.mute, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>}
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: c.mute, flex: "0 0 auto" }}>{ago(n.createdAt)}</span>
                </>
              );
              const style: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 16px",
                borderBottom: `1px solid ${c.border}`, background: n.readAt ? "transparent" : (tone === "dark" ? "rgba(244,241,233,0.04)" : "rgba(255,255,255,0.03)") };
              return n.link
                ? <a key={n.id} href={n.link} onClick={() => setOpen(false)} style={style}>{inner}</a>
                : <div key={n.id} style={style}>{inner}</div>;
            })}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
