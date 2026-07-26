import type { CSSProperties, ReactNode } from "react";
import { DS } from "@/lib/theme";

/* Retro terminal / CRT building blocks: bracket-framed panels, segmented bars,
   dither corner, scanline overlay. Flat — no soft shadows. */

/** A flat panel with terracotta bracket corner-ticks (the [ ] framing). */
export function Frame({ children, style, pad = 20, accent = DS.accent }:
  { children: ReactNode; style?: CSSProperties; pad?: number; accent?: string }) {
  const tick = (s: CSSProperties): CSSProperties => ({
    position: "absolute", width: 8, height: 8, ...s,
  });
  return (
    <div style={{ position: "relative", background: DS.card, border: `1px solid ${DS.border}`,
      borderRadius: 4, padding: pad, ...style }}>
      <span style={tick({ top: -1, left: -1, borderTop: `1.5px solid ${accent}`, borderLeft: `1.5px solid ${accent}` })} />
      <span style={tick({ top: -1, right: -1, borderTop: `1.5px solid ${accent}`, borderRight: `1.5px solid ${accent}` })} />
      <span style={tick({ bottom: -1, left: -1, borderBottom: `1.5px solid ${accent}`, borderLeft: `1.5px solid ${accent}` })} />
      <span style={tick({ bottom: -1, right: -1, borderBottom: `1.5px solid ${accent}`, borderRight: `1.5px solid ${accent}` })} />
      {children}
    </div>
  );
}

/** Segmented block progress bar (like the BUDGET / battery readout). */
export function SegBar({ ratio, blocks = 40, color = DS.accent, height = 16 }:
  { ratio: number; blocks?: number; color?: string; height?: number }) {
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * blocks);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: blocks }, (_, i) => (
        <span key={i} style={{ flex: 1, height, background: i < filled ? color : DS.card2 }} />
      ))}
    </div>
  );
}

/** Faint CRT scanline overlay across the whole viewport. */
export function Scanlines() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 3,
      backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, transparent 1px, transparent 3px)" }} />
  );
}

/** Dithered checkerboard fading in from a corner (top-right by default). */
export function DitherCorner({ size = 190, corner = "100% 0" }: { size?: number; corner?: string }) {
  return (
    <div aria-hidden style={{ position: "absolute", top: 0, right: 0, width: size, height: size, pointerEvents: "none",
      backgroundImage:
        "linear-gradient(45deg, rgba(255,255,255,0.55) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.55) 75%)," +
        "linear-gradient(45deg, rgba(255,255,255,0.55) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.55) 75%)",
      backgroundSize: "6px 6px", backgroundPosition: "0 0, 3px 3px",
      WebkitMaskImage: `radial-gradient(circle at ${corner}, #000, transparent 66%)`,
      maskImage: `radial-gradient(circle at ${corner}, #000, transparent 66%)`,
      opacity: 0.32 }} />
  );
}
