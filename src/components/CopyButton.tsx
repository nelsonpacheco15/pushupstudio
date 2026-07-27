"use client";

import { useState } from "react";
import { DS } from "@/lib/theme";

export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button"
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}
      style={{ background: "transparent", color: DS.text, border: `1px solid ${DS.border}`, borderRadius: 6,
        padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: DS.mono, whiteSpace: "nowrap" }}>
      {done ? "Copied ✓" : label}
    </button>
  );
}
