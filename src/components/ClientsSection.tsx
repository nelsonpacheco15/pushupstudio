"use client";

import { useState } from "react";
import Link from "next/link";
import type { ClientSummary } from "@/lib/data";
import { createClient } from "@/app/actions";
import { formatDuration, formatAgo } from "@/lib/tickets";
import { DS, dsCard, dsInput, dsTextarea, dsBtn, dsBtnGhost, dsLabel } from "@/lib/theme";

type Period = "week" | "month";
const WAIT_LIMIT_MS = 45 * 3600 * 1000;

export default function ClientsSection({ clients, nowMs }: { clients: ClientSummary[]; nowMs: number }) {
  const [period, setPeriod] = useState<Period>("week");
  const [newOpen, setNewOpen] = useState(false);

  const secondsFor = (c: ClientSummary) => (period === "week" ? c.weekSeconds : c.monthSeconds);
  const sorted = [...clients].sort((a, b) => secondsFor(b) - secondsFor(a));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 22, letterSpacing: -0.5, margin: 0 }}>Clients</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", background: DS.card2, border: `1px solid ${DS.border}`, borderRadius: 999, padding: 3 }}>
            {(["week", "month"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 15px", fontSize: 12.5,
                  fontWeight: 700, fontFamily: DS.body, color: period === p ? DS.bg : DS.mute,
                  background: period === p ? DS.accent : "transparent" }}>
                {p === "week" ? "This week" : "This month"}
              </button>
            ))}
          </div>
          <button onClick={() => setNewOpen(true)} style={dsBtn}>+ New client</button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ ...dsCard, padding: 52, textAlign: "center", color: DS.mute }}>
          <div style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 20, color: DS.text, marginBottom: 6 }}>No clients yet</div>
          Add your first client to start their board.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {sorted.map((c) => {
            const waiting = c.oldestOpenAt ? nowMs - new Date(c.oldestOpenAt).getTime() : 0;
            const overdue = waiting > WAIT_LIMIT_MS;
            return (
              <Link key={c.id} href={`/client/${c.id}`}
                style={{ ...dsCard, display: "block", padding: 20, borderColor: overdue ? DS.accent : DS.border }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  {c.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logoUrl} alt="" style={{ width: 46, height: 46, borderRadius: 12, objectFit: "cover", border: `1px solid ${DS.border}` }} />
                  ) : (
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: c.brandColor, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DS.display, fontWeight: 700, fontSize: 20 }}>
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>{c.name}</div>
                    {c.company && <div style={{ fontSize: 13, color: DS.mute }}>{c.company}</div>}
                  </div>
                  {overdue && <span style={{ fontFamily: DS.mono, fontSize: 10, color: DS.accent, border: `1px solid ${DS.accent}`, borderRadius: 999, padding: "2px 8px" }}>45h+</span>}
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18,
                  paddingTop: 16, borderTop: `1px solid ${DS.border}` }}>
                  <div>
                    <div style={{ fontFamily: DS.pixel, fontWeight: 600, fontSize: 26, letterSpacing: 0.5 }}>{formatDuration(secondsFor(c))}</div>
                    <div style={{ ...dsLabel, marginTop: 3 }}>[ {period === "week" ? "This week" : "This month"} ]</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: DS.pixel, fontWeight: 600, fontSize: 26, letterSpacing: 0.5,
                      color: c.ticketCounts.ready ? DS.amber : DS.faint }}>{c.ticketCounts.ready}</div>
                    <div style={{ ...dsLabel, marginTop: 3 }}>[ Queue depth ]</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 14, fontFamily: DS.mono, fontSize: 11, color: DS.mute }}>
                  <span>{c.ticketCounts.in_progress} in prog</span>
                  <span>{c.ticketCounts.backlog} backlog</span>
                  <span style={{ marginLeft: "auto", color: overdue ? DS.accent : DS.mute }}>
                    {c.lastCompletedAt ? `del. ${formatAgo(c.lastCompletedAt, nowMs)} ago` : "no deliveries"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {newOpen && <NewClientModal onClose={() => setNewOpen(false)} />}
    </div>
  );
}

function NewClientModal({ onClose }: { onClose: () => void }) {
  const lbl = { ...dsLabel, display: "block" as const, marginBottom: 6 };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      zIndex: 60, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <form action={createClient} onClick={(e) => e.stopPropagation()}
        style={{ ...dsCard, padding: 26, width: 480, maxWidth: "100%", marginTop: 44 }}>
        <div style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 22, letterSpacing: -0.4, marginBottom: 16 }}>New client</div>

        <label style={lbl}>Client / brand name</label>
        <input name="name" required placeholder="e.g. Estrela da Manhã" style={dsInput} />
        <label style={{ ...lbl, marginTop: 12 }}>Company</label>
        <input name="company" placeholder="Company name" style={dsInput} />
        <label style={{ ...lbl, marginTop: 12 }}>Primary email</label>
        <input name="email" type="email" placeholder="main@company.com" style={dsInput} />
        <label style={{ ...lbl, marginTop: 12 }}>Invite people (one email per line)</label>
        <textarea name="contacts" placeholder="teammate@company.com&#10;another@company.com" style={dsTextarea} rows={2} />
        <label style={{ ...lbl, marginTop: 12 }}>Logo</label>
        <input name="logo" type="file" accept="image/*" style={{ ...dsInput, padding: 8 }} />
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Brand colour</label>
            <input name="brandColor" type="color" defaultValue="#D2452B" style={{ ...dsInput, height: 42, padding: 4 }} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={lbl}>Brand font (optional)</label>
            <input name="brandFont" placeholder="e.g. Space Grotesk" style={dsInput} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={dsBtnGhost}>Cancel</button>
          <button type="submit" style={dsBtn}>Create client</button>
        </div>
      </form>
    </div>
  );
}
