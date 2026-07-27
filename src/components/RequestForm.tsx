"use client";

import { useRef } from "react";
import { REQUEST_TYPES } from "@/lib/tickets";
import { createTicket } from "@/app/actions";
import { INK, PANEL, LINE, ACCENT, MUTE, inp, taStyle } from "@/lib/theme";

export default function RequestForm({ clientId, portalToken }: { clientId: string; portalToken: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={async (fd) => { await createTicket(fd); ref.current?.reset(); }}
      style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 20 }}>
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="createdBy" value="client" />
      <input type="hidden" name="portalToken" value={portalToken} />
      <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>New rep</div>
      <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 14 }}>Tell us what you need. It lands in your backlog and we pick it up.</div>
      <input name="title" required placeholder="What do you need? (title)" style={inp} />
      <select name="type" style={{ ...inp, marginTop: 8 }}>
        {REQUEST_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <textarea name="description" placeholder="Describe it — goal, audience, any details" style={{ ...taStyle, marginTop: 8 }} rows={3} />
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <select name="priority" defaultValue="0" style={{ ...inp, flex: 1, minWidth: 130 }}>
          <option value="0">Priority · Normal</option>
          <option value="1">Priority · High</option>
          <option value="2">Priority · Urgent</option>
        </select>
        <input name="deadline" type="date" style={{ ...inp, flex: 1, minWidth: 150 }} />
      </div>
      <input name="references" placeholder="Reference links (optional)" style={{ ...inp, marginTop: 8 }} />
      <button type="submit" style={{ marginTop: 14, background: ACCENT, color: INK, border: "none", borderRadius: 8,
        padding: "11px 22px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
        Submit request
      </button>
    </form>
  );
}
