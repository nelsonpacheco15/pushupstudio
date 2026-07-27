import { DS } from "@/lib/theme";

export default function Loading() {
  return (
    <div style={{ minHeight: "100vh", background: DS.bg, color: DS.mute,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundImage: "radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)", backgroundSize: "6px 6px" }}>
      <div style={{ fontFamily: DS.mono, fontSize: 13, letterSpacing: 2, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: DS.accent }}>◆</span>
        LOADING
        <span style={{ display: "inline-block", width: 8, height: 15, background: DS.accent, animation: "ds-blink 1s steps(1) infinite" }} />
      </div>
    </div>
  );
}
