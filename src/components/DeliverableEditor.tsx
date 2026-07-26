"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDeliverableUrl } from "@/app/actions";
import { DS, dsInput, dsBtn, dsBtnGhost } from "@/lib/theme";

export default function DeliverableEditor({ ticketId, url }: { ticketId: string; url: string | null }) {
  const [value, setValue] = useState(url ?? "");
  const [editing, setEditing] = useState(!url);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    start(async () => {
      await setDeliverableUrl(ticketId, value);
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing && url) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: DS.mono, fontSize: 12, color: DS.mute, wordBreak: "break-all", flex: 1, minWidth: 0 }}>{url}</span>
        <button onClick={() => setEditing(true)} style={{ ...dsBtnGhost, padding: "6px 12px", fontSize: 12 }}>Change link</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste Google Drive link (file or folder)"
        style={{ ...dsInput, flex: 1, minWidth: 220 }} />
      <button onClick={save} disabled={pending} style={{ ...dsBtn, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Saving…" : "Attach design"}
      </button>
    </div>
  );
}
