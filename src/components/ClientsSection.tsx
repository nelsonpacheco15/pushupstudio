"use client";

import { useState } from "react";
import Link from "next/link";
import type { ClientSummary, ArchivedClient } from "@/lib/data";
import { createClient, deleteClient, setClientStatus, setClientArchived, resendSetupInvite } from "@/app/actions";
import { formatDuration, formatAgo } from "@/lib/tickets";
import { DS, dsCard, dsInput, dsTextarea, dsBtn, dsBtnGhost, dsLabel } from "@/lib/theme";

type Period = "week" | "month";
const WAIT_LIMIT_MS = 45 * 3600 * 1000;

export default function ClientsSection({ clients, nowMs, archived = [] }: { clients: ClientSummary[]; nowMs: number; archived?: ArchivedClient[] }) {
  const [period, setPeriod] = useState<Period>("week");
  const [newOpen, setNewOpen] = useState(false);

  const secondsFor = (c: ClientSummary) => (period === "week" ? c.weekSeconds : c.monthSeconds);
  const sorted = [...clients].sort((a, b) => secondsFor(b) - secondsFor(a));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 22, letterSpacing: -0.5, margin: 0 }}>Athletes</h2>
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
          <button onClick={() => setNewOpen(true)} style={dsBtn}>+ New athlete</button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ ...dsCard, padding: 52, textAlign: "center", color: DS.mute }}>
          <div style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 20, color: DS.text, marginBottom: 6 }}>No athletes yet</div>
          Add your first athlete to start their board.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {sorted.map((c) => {
            const waiting = c.oldestOpenAt ? nowMs - new Date(c.oldestOpenAt).getTime() : 0;
            const overdue = waiting > WAIT_LIMIT_MS;
            return (
              <div key={c.id} style={{ ...dsCard, position: "relative", padding: 20, borderColor: overdue ? DS.accent : DS.border }}>
                <CardMenu c={c} />
                <Link href={`/client/${c.id}`} style={{ display: "block", color: "inherit" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13, paddingRight: 28 }}>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>{c.name}</div>
                      {c.status === "paused" && <span style={{ fontFamily: DS.mono, fontSize: 9, letterSpacing: 0.5, color: DS.amber, border: `1px solid ${DS.amber}`, borderRadius: 999, padding: "1px 6px" }}>PAUSED</span>}
                    </div>
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
              </div>
            );
          })}
        </div>
      )}

      {archived.length > 0 && (
        <details style={{ marginTop: 26 }}>
          <summary style={{ cursor: "pointer", fontFamily: DS.mono, fontSize: 11.5, letterSpacing: 0.5, color: DS.mute, listStyle: "none" }}>
            ▸ Archived athletes ({archived.length})
          </summary>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {archived.map((a) => (
              <div key={a.id} style={{ ...dsCard, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", opacity: 0.8 }}>
                <span style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 15 }}>{a.name}</span>
                {a.company && <span style={{ fontSize: 12.5, color: DS.mute }}>{a.company}</span>}
                <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <form action={setClientArchived.bind(null, a.id, false)}>
                    <button type="submit" style={{ ...dsBtnGhost, padding: "6px 12px", fontSize: 12 }}>Restore</button>
                  </form>
                  <form action={deleteClient.bind(null, a.id)} onSubmit={(e) => { if (!confirm(`Delete ${a.name} and all their data? This cannot be undone.`)) e.preventDefault(); }}>
                    <button type="submit" style={{ background: "transparent", color: "#D2452B", border: "1px solid #D2452B", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: DS.body }}>Delete</button>
                  </form>
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {newOpen && <NewClientModal onClose={() => setNewOpen(false)} />}
    </div>
  );
}

function CardMenu({ c }: { c: ClientSummary }) {
  const [open, setOpen] = useState(false);
  const paused = c.status === "paused";
  const item: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", background: "transparent",
    border: "none", color: DS.text, padding: "9px 14px", fontSize: 13, cursor: "pointer", fontFamily: DS.body, textDecoration: "none" };
  return (
    <>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }} aria-label="Client actions"
        style={{ position: "absolute", top: 14, right: 12, zIndex: 3, width: 28, height: 28, borderRadius: 7,
          background: open ? DS.card2 : "transparent", border: `1px solid ${open ? DS.border : "transparent"}`, color: DS.mute,
          cursor: "pointer", fontSize: 17, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>⋯</button>
      {open && (
        <>
          <div onClick={(e) => { e.preventDefault(); setOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 4 }} />
          <div style={{ position: "absolute", top: 44, right: 12, zIndex: 5, width: 210, background: DS.card,
            border: `1px solid ${DS.border}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 14px 40px rgba(0,0,0,0.5)" }}>
            <Link href={`/client/${c.id}`} style={item}>Open board</Link>
            <Link href={`/client/${c.id}/manage`} style={item}>Manage client</Link>
            {c.driveFolderUrl && <a href={c.driveFolderUrl} target="_blank" rel="noreferrer" style={item}>📁 Open Drive folder</a>}
            <form action={resendSetupInvite.bind(null, "client", c.id, c.id)}><button type="submit" style={item}>Send access invite</button></form>
            <div style={{ height: 1, background: DS.border }} />
            <form action={setClientStatus.bind(null, c.id, paused ? "active" : "paused")}>
              <button type="submit" style={item}>{paused ? "Resume billing" : "Pause billing"}</button>
            </form>
            <form action={setClientArchived.bind(null, c.id, true)}>
              <button type="submit" style={item}>Archive client</button>
            </form>
            <form action={deleteClient.bind(null, c.id)} onSubmit={(e) => { if (!confirm(`Delete ${c.name} and all their data? This cannot be undone.`)) e.preventDefault(); }}>
              <button type="submit" style={{ ...item, color: "#D2452B" }}>Delete client</button>
            </form>
          </div>
        </>
      )}
    </>
  );
}

function NewClientModal({ onClose }: { onClose: () => void }) {
  const lbl = { ...dsLabel, display: "block" as const, marginBottom: 6 };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      zIndex: 60, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <form action={createClient} onClick={(e) => e.stopPropagation()}
        style={{ ...dsCard, padding: 26, width: 480, maxWidth: "100%", marginTop: 44 }}>
        <div style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 22, letterSpacing: -0.4, marginBottom: 16 }}>New athlete</div>

        <label style={lbl}>Client / brand name</label>
        <input name="name" required placeholder="e.g. Estrela da Manhã" style={dsInput} />
        <label style={{ ...lbl, marginTop: 12 }}>Company</label>
        <input name="company" placeholder="Company name" style={dsInput} />
        <label style={{ ...lbl, marginTop: 12 }}>Primary email</label>
        <input name="email" type="email" placeholder="main@company.com" style={dsInput} />
        <label style={{ ...lbl, marginTop: 12 }}>Google Drive folder</label>
        <input name="driveFolder" type="url" placeholder="https://drive.google.com/drive/folders/…" style={dsInput} />
        <label style={{ ...lbl, marginTop: 12 }}>Language (emails &amp; portal)</label>
        <select name="language" defaultValue="en" style={dsInput}>
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Plan</label>
            <select name="plan" defaultValue="growth" style={dsInput}>
              <option value="growth">Growth — €800/mo</option>
              <option value="scale">Scale — €1299/mo</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Locker Room password</label>
            <input name="password" type="text" placeholder="Set a password" autoComplete="off" style={dsInput} />
          </div>
        </div>
        <label style={{ ...lbl, marginTop: 12 }}>Payment method</label>
        <select name="method" defaultValue="bank_transfer" style={dsInput}>
          <option value="bank_transfer">Bank transfer</option>
          <option value="stripe">Card (Stripe)</option>
        </select>
        <div style={{ fontSize: 11, color: DS.mute, marginTop: 6 }}>An invoice is created &amp; emailed to the client and to you when you add them.</div>
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
