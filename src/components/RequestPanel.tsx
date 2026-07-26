"use client";

import { useState } from "react";
import VoiceRequest from "@/components/VoiceRequest";
import RequestForm from "@/components/RequestForm";
import { LINE, ACCENT, MUTE } from "@/lib/theme";

export default function RequestPanel({ clientId, portalToken }: { clientId: string; portalToken: string }) {
  const [mode, setMode] = useState<"voice" | "form">("voice");
  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "#14130F", border: `1px solid ${LINE}`,
        borderRadius: 999, padding: 3, marginBottom: 12, width: "fit-content" }}>
        {(["voice", "form"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 16px", fontSize: 12.5,
              fontWeight: 600, fontFamily: "'Hanken Grotesk'",
              color: mode === m ? "#fff" : MUTE, background: mode === m ? ACCENT : "transparent" }}>
            {m === "voice" ? "🎙 Voice" : "Type it"}
          </button>
        ))}
      </div>
      {mode === "voice"
        ? <VoiceRequest portalToken={portalToken} />
        : <RequestForm clientId={clientId} portalToken={portalToken} />}
    </div>
  );
}
