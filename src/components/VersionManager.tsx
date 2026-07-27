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

export default function VersionManager({ ticketId, versions }: { ticketId: string; versions: TicketVersion[] }) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const hasAccepted = versions.some((v) => v.status === "accepted");

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
          {versions.map((v) => {
            const st = STATUS[v.status] ?? STATUS.pending;
            return (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                borderTop: `1px solid ${DS.border}` }}>
                <span style={{ fontFamily: DS.mono, fontSize: 12, color: DS.text, width: 34 }}>v{v.version}</span>
                <span style={{ fontFamily: DS.mono, fontSize: 10.5, letterSpacing: 0.5, color: st.color, width: 96 }}>{st.label}</span>
                <a href={v.url} target="_blank" rel="noreferrer"
                  style={{ fontFamily: DS.mono, fontSize: 11.5, color: DS.mute, wordBreak: "break-all", flex: 1, minWidth: 0, textDecoration: "underline" }}>
                  {v.url}
                </a>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={value} onChange={(e) => setValue(e.target.value)}
          placeholder={versions.length === 0 ? "Paste Google Drive link (file or folder)" : "Paste new version link after a change request"}
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
