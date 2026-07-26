"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  STATUSES, STATUS_LABELS, REQUEST_TYPES,
  type Ticket, type TicketStatus,
} from "@/lib/tickets";
import { moveTicket, createTicket, startTimer, stopTimer } from "@/app/actions";
import { Elapsed } from "@/components/LiveTimer";
import { INK, PAPER, PANEL, LINE, ACCENT, MUTE, inp, taStyle, ghostBtn, primaryBtn, DS } from "@/lib/theme";

export default function KanbanBoard({
  clientId, portalToken, tickets, runningTicketId,
}: {
  clientId: string;
  portalToken: string;
  tickets: Ticket[];
  runningTicketId: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(tickets);
  const [err, setErr] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [portalLink, setPortalLink] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<TicketStatus | null>(null);
  const [, startMove] = useTransition();

  // Keep local state in sync with fresh server data after a refresh.
  useEffect(() => { setItems(tickets); }, [tickets]);
  useEffect(() => {
    setPortalLink(`${window.location.origin}/portal/${portalToken}`);
  }, [portalToken]);

  function toggleTimer(ticketId: string, isRunning: boolean) {
    setErr("");
    startMove(async () => {
      try {
        if (isRunning) await stopTimer(ticketId, clientId);
        else await startTimer(ticketId, clientId);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not start the timer.");
      }
    });
  }

  function onDropTo(status: TicketStatus, id: string | null) {
    setOverStatus(null);
    setDraggingId(null);
    if (!id) return;
    const t = items.find((x) => x.id === id);
    if (!t || t.status === status) return;

    const prev = items;
    // Optimistic: move the card immediately, then confirm with the server.
    setItems(items.map((x) => (x.id === id ? { ...x, status, updatedAt: new Date().toISOString() } : x)));
    setErr("");
    startMove(async () => {
      try {
        await moveTicket(id, clientId, status);
        router.refresh();
      } catch (e) {
        setItems(prev); // revert on failure (e.g. WIP rule)
        setErr(e instanceof Error ? e.message : "Could not move ticket.");
      }
    });
  }

  async function copyPortal() {
    try {
      await navigator.clipboard.writeText(portalLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE }}>
          {items.filter((t) => t.status !== "done").length} open · drag cards between columns · one In Progress at a time
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={copyPortal} style={ghostBtn}>{copied ? "Copied ✓" : "Copy client portal link"}</button>
          <button onClick={() => setNewOpen(true)} style={{ ...primaryBtn, width: "auto", marginTop: 0, padding: "9px 16px" }}>
            + New ticket
          </button>
        </div>
      </div>

      {err && <div style={{ color: ACCENT, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}>
        {STATUSES.map((status) => {
          const col = items.filter((t) => t.status === status);
          const isOver = overStatus === status;
          return (
            <div key={status}
              onDragOver={(e) => { e.preventDefault(); if (overStatus !== status) setOverStatus(status); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStatus(null); }}
              onDrop={(e) => { e.preventDefault(); onDropTo(status, e.dataTransfer.getData("text/plain") || draggingId); }}
              style={{ width: 280, flex: "0 0 280px", borderRadius: 12, padding: 6,
                background: isOver ? "rgba(210,69,43,0.08)" : "transparent",
                outline: isOver ? `1px dashed ${ACCENT}` : "1px dashed transparent", transition: "background 0.12s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 4px 12px",
                paddingBottom: 8, borderBottom: `1px solid ${DS.border}` }}>
                <span style={{ width: 6, height: 6, background: DS.mute }} />
                <span style={{ fontFamily: DS.mono, fontSize: 11.5, letterSpacing: 0.5, textTransform: "uppercase", color: DS.text }}>{STATUS_LABELS[status]}</span>
                <span style={{ marginLeft: "auto", color: DS.faint, fontFamily: DS.mono, fontSize: 12 }}>{String(col.length).padStart(2, "0")}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                {col.map((t) => (
                  <TicketCard key={t.id} t={t} running={t.id === runningTicketId}
                    dragging={t.id === draggingId}
                    onStart={() => setDraggingId(t.id)}
                    onEnd={() => setDraggingId(null)}
                    onToggleTimer={() => toggleTimer(t.id, t.id === runningTicketId)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {newOpen && <NewTicketModal clientId={clientId} onClose={() => setNewOpen(false)} />}
    </div>
  );
}

function TicketCard({ t, running, dragging, onStart, onEnd, onToggleTimer }: {
  t: Ticket; running: boolean; dragging: boolean;
  onStart: () => void; onEnd: () => void; onToggleTimer: () => void;
}) {
  const router = useRouter();
  const inProgress = t.status === "in_progress";
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; onStart(); }}
      onDragEnd={onEnd}
      onClick={() => router.push(`/ticket/${t.id}`)}
      style={{
        background: PANEL, border: `1px solid ${running ? ACCENT : LINE}`, borderRadius: 4, padding: 13,
        cursor: "grab", opacity: dragging ? 0.4 : 1, userSelect: "none",
      }}>
      {t.form?.type && (
        <span style={{ fontSize: 9.5, fontFamily: DS.mono, letterSpacing: 0.4, textTransform: "uppercase", color: DS.faint }}>{t.form.type}</span>
      )}
      <div style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 14.5, margin: "4px 0 0", color: PAPER, letterSpacing: -0.2 }}>{t.title}</div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8,
        fontSize: 11, color: MUTE, fontFamily: "'IBM Plex Mono'" }}>
        {inProgress ? (
          <span style={{ color: ACCENT }}>⏱ <Elapsed startedAt={t.updatedAt} /> in progress</span>
        ) : t.form?.deadline ? (
          <span>Due {t.form.deadline}</span>
        ) : <span />}
        {running && <span style={{ color: ACCENT }}>● tracking</span>}
      </div>

      {/* Start/stop timer — only on In Progress cards. */}
      {inProgress && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleTimer(); }}
          onDragStart={(e) => e.preventDefault()}
          style={{ marginTop: 11, width: "100%", cursor: "pointer", borderRadius: 4, padding: "7px", fontSize: 12,
            fontWeight: 700, fontFamily: DS.body,
            border: `1px solid ${ACCENT}`,
            background: running ? "transparent" : ACCENT, color: running ? ACCENT : INK }}>
          {running ? "■ Stop timer" : "▶ Start timer"}
        </button>
      )}
    </div>
  );
}

function NewTicketModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form action={createTicket} onClick={(e) => e.stopPropagation()}
        style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 22, width: 460, maxWidth: "100%" }}>
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="createdBy" value="studio" />
        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 20, marginBottom: 14 }}>New ticket</div>
        <input name="title" required placeholder="Title" style={inp} />
        <select name="type" style={{ ...inp, marginTop: 8 }}>
          {REQUEST_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <textarea name="description" placeholder="Description / brief" style={{ ...taStyle, marginTop: 8 }} rows={3} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input name="deadline" type="date" style={{ ...inp, flex: 1 }} />
          <input name="references" placeholder="Reference links" style={{ ...inp, flex: 2 }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
          <button type="submit" style={{ ...primaryBtn, width: "auto", marginTop: 0 }}>Create ticket</button>
        </div>
      </form>
    </div>
  );
}
