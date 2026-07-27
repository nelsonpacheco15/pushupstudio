"use client";

import { useState } from "react";
import RequestPanel from "@/components/RequestPanel";
import { INK, PANEL, LINE, PAPER, MUTE } from "@/lib/theme";

export default function NewRequestButton({ clientId, portalToken, brandColor }: { clientId: string; portalToken: string; brandColor?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ background: brandColor || PAPER, color: INK, border: "none", borderRadius: 10, padding: "10px 18px",
          fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Hanken Grotesk'" }}>
        + New request
      </button>
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 80,
            display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: 460, maxWidth: "100%", marginTop: 40, background: INK, border: `1px solid ${LINE}`, borderRadius: 14, padding: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px 6px" }}>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, letterSpacing: 1, color: MUTE }}>[ NEW REQUEST ]</span>
              <button onClick={() => setOpen(false)} aria-label="Close"
                style={{ background: "transparent", border: "none", color: MUTE, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "0 4px 4px" }}>
              <RequestPanel clientId={clientId} portalToken={portalToken} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
