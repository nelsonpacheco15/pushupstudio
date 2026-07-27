"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDeliverableVersion } from "@/app/actions";
import type { TicketVersion } from "@/lib/data";
import { DS, dsInput, dsBtn } from "@/lib/theme";

const STATUS: Record<string, { label: string; color: string }> = {
  accepted: { label: "✓ ACCEPTED", color: "#7FB77E" },
  changes: { label: "↻ CHANGES", color: DS.amber },
  pending: { label: "PENDING", color: DS.mute },
};

export default function VersionManager({ ticketId, versions, changeNote }: { ticketId: string; versions: TicketVersion[]; changeNote?: string }) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const hasAccepted = versions.some((v) => v.status === "accepted");
  const last = versions[versions.length - 1];
  const awaitingRevision = last?.status === "changes";
  // The version shown to the client as the main design: accepted one, else the latest.
  const current = versions.find((v) => v.status === "accepted") ?? last;
  const ordered = [...versions].reverse(); // newest first

  function add() {
    if (!value.trim()) return;
    start(async () => {
      await addDeliverableVersion(ticketId, value);
      setValue("");
      router.refresh();
    });
  }

  return (
    <div>
      {versions.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {ordered.map((v) => {
            const st = STATUS[v.status] ?? STATUS.pending;
            const isCurrent = current?.id === v.id;
            const ts = new Date(v.createdAt).toLocaleString(undefined, {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
            });
            return (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
                borderTop: `1px solid ${DS.border}` }}>
                <span style={{ fontFamily: DS.mono, fontSize: 12, color: DS.text, width: 30 }}>v{v.version}</span>
                <span style={{ fontFamily: DS.mono, fontSize: 10.5, color: DS.faint, width: 96 }}>{ts}</span>
                <span style={{ fontFamily: DS.mono, fontSize: 10.5, letterSpacing: 0.5, color: st.color, width: 96 }}>{st.label}</span>
                {isCurrent && <span style={{ fontFamily: DS.mono, fontSize: 9.5, letterSpacing: 0.5, color: DS.bg,
                  background: DS.accent, borderRadius: 3, padding: "2px 6px" }}>SHOWN</span>}
                <a href={v.url} target="_blank" rel="noreferrer"
                  style={{ fontFamily: DS.mono, fontSize: 11.5, color: DS.mute, wordBreak: "break-all", flex: 1, minWidth: 0, textDecoration: "underline", textAlign: "right" }}>
                  open ↗
                </a>
              </div>
            );
          })}
        </div>
      )}

      {awaitingRevision && (
        <div style={{ background: DS.card2, border: `1px solid ${DS.amber}`, borderRadius: DS.radius, padding: "10px 14px", marginBottom: 10 }}>
          <div style={{ fontFamily: DS.mono, fontSize: 10.5, letterSpacing: 0.5, color: DS.amber, marginBottom: changeNote ? 6 : 0 }}>
            ↻ CLIENT REQUESTED CHANGES ON v{last.version} — PASTE THE REVISED VERSION BELOW
          </div>
          {changeNote && <div style={{ fontSize: 13, color: "#cfcabb", lineHeight: 1.5 }}>“{changeNote}”</div>}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={value} onChange={(e) => setValue(e.target.value)}
          placeholder={versions.length === 0 ? "Paste Google Drive link (file or folder)" : "Paste revised version link"}
          style={{ ...dsInput, flex: 1, minWidth: 220 }} />
        <button onClick={add} disabled={pending} style={{ ...dsBtn, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Adding…" : versions.length === 0 ? "Attach design" : `Add v${(versions[versions.length - 1]?.version ?? 0) + 1}`}
        </button>
      </div>
      {hasAccepted && (
        <div style={{ fontSize: 12, color: "#7FB77E", marginTop: 10, fontFamily: DS.mono }}>
          ◆ Client accepted a version — that one is shown as the final design.
        </div>
      )}
    </div>
  );
}
