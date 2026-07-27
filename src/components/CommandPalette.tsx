"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { SearchItem } from "@/lib/data";
import { DS } from "@/lib/theme";

const PAGES: SearchItem[] = [
  { type: "client", id: "hq", label: "HQ", sub: "Overview", href: "/" },
  { type: "client", id: "billing", label: "Billing", sub: "Invoices", href: "/billing" },
  { type: "client", id: "calendar", label: "Calendar", sub: "Deadlines", href: "/calendar" },
  { type: "client", id: "analytics", label: "Analytics", sub: "Reports", href: "/analytics" },
  { type: "client", id: "stylescapes", label: "Stylescapes", sub: "Brand boards", href: "/stylescapes" },
  { type: "client", id: "settings", label: "Settings", sub: "Studio config", href: "/settings" },
];

export default function CommandPalette({ index }: { index: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const all = useMemo(() => [...PAGES, ...index], [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "p" || e.key === "k")) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all.slice(0, 8);
    const scored = all
      .map((it) => {
        const label = it.label.toLowerCase();
        let score = -1;
        if (label.startsWith(s)) score = 3;
        else if (label.includes(s)) score = 2;
        else if (it.sub.toLowerCase().includes(s)) score = 1;
        return { it, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    return scored.map((x) => x.it);
  }, [q, all]);

  useEffect(() => { if (active >= results.length) setActive(0); }, [results, active]);

  function go(it: SearchItem) { setOpen(false); router.push(it.href); }

  return (
    <>
      {/* sidebar trigger */}
      <button onClick={() => setOpen(true)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left",
          background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10, padding: "9px 12px", color: DS.mute, fontFamily: DS.body }}>
        <span style={{ fontSize: 13 }}>⌕</span>
        <span style={{ fontSize: 13, flex: 1 }}>Search…</span>
        <span style={{ fontFamily: DS.mono, fontSize: 10.5, color: DS.faint, border: `1px solid ${DS.border}`, borderRadius: 5, padding: "1px 5px" }}>⌘P</span>
      </button>
      {open && (
    <div onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 200,
        display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "12vh 20px 20px" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: 560, maxWidth: "100%", background: DS.bg2, border: `1px solid ${DS.border}`, borderRadius: 14,
          overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <input ref={inputRef} value={q} placeholder="Search athletes, reps, pages…"
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]); }
          }}
          style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none", outline: "none",
            color: DS.text, fontSize: 16, padding: "18px 20px", fontFamily: DS.body, borderBottom: `1px solid ${DS.border}` }} />
        <div style={{ maxHeight: 380, overflowY: "auto", padding: 6 }}>
          {results.length === 0 && <div style={{ padding: 24, textAlign: "center", color: DS.mute, fontSize: 13 }}>No matches.</div>}
          {results.map((it, i) => (
            <button key={it.type + it.id} onMouseEnter={() => setActive(i)} onClick={() => go(it)}
              style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                background: i === active ? DS.accentSoft : "transparent", border: "none", borderRadius: 8, padding: "10px 14px" }}>
              <span style={{ fontFamily: DS.mono, fontSize: 11, color: DS.faint, width: 34, flex: "0 0 34px" }}>{it.type === "rep" ? "REP" : it.href.startsWith("/client") ? "ATH" : "GO"}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, color: DS.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
                <span style={{ display: "block", fontSize: 11.5, color: DS.mute, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.sub}</span>
              </span>
              <span style={{ fontFamily: DS.mono, fontSize: 11, color: DS.faint }}>↵</span>
            </button>
          ))}
        </div>
        <div style={{ padding: "8px 16px", borderTop: `1px solid ${DS.border}`, fontFamily: DS.mono, fontSize: 10.5, color: DS.faint }}>
          ⌘P / ⌘K · ↑↓ to navigate · ↵ to open · esc to close
        </div>
      </div>
    </div>
      )}
    </>
  );
}
