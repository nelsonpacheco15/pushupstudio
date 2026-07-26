"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, STATUS_LABELS, type TicketStatus } from "@/lib/tickets";
import { moveTicket, deleteTicket } from "@/app/actions";
import { PAPER, LINE, ACCENT, MUTE } from "@/lib/theme";

export default function TicketActions({
  ticketId, clientId, status,
}: {
  ticketId: string;
  clientId: string;
  status: TicketStatus;
}) {
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function change(next: TicketStatus) {
    setErr("");
    start(async () => {
      try { await moveTicket(ticketId, clientId, next); router.refresh(); }
      catch (e) { setErr(e instanceof Error ? e.message : "Could not update status."); }
    });
  }

  function remove() {
    if (!confirm("Delete this ticket and its time entries?")) return;
    start(async () => {
      try { await deleteTicket(ticketId, clientId); }
      catch { router.refresh(); }
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: MUTE }}>Status</span>
        <select value={status} disabled={pending} onChange={(e) => change(e.target.value as TicketStatus)}
          style={{ background: "#14130F", color: PAPER, border: `1px solid ${LINE}`, borderRadius: 7,
            fontSize: 13, padding: "8px 10px", cursor: "pointer" }}>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <button onClick={remove} disabled={pending}
          style={{ marginLeft: "auto", background: "transparent", color: MUTE, border: `1px solid ${LINE}`,
            borderRadius: 7, padding: "8px 12px", fontSize: 12.5, cursor: "pointer" }}>
          Delete
        </button>
      </div>
      {err && <div style={{ color: ACCENT, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
    </div>
  );
}
