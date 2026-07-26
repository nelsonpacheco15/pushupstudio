/* Shared visual tokens + reusable inline-style objects.
   Ported from the original prototype so components read the same. */

/* Legacy tokens — now mapped onto the monochrome terminal palette so every
   not-yet-fully-restyled screen still reads black-and-white, not terracotta. */
export const INK = "#050506";     // canvas
export const PAPER = "#E9E7DE";   // text
export const PANEL = "#0C0C0F";   // surface
export const LINE = "#1E1E22";    // border
export const ACCENT = "#E9E7DE";  // highlight → white (monochrome)
export const MUTE = "#7F7C71";    // muted

export const BAND_H = 460;

import type { CSSProperties } from "react";

export const lbl: CSSProperties = {
  fontSize: 11.5, color: MUTE, display: "block", margin: "10px 0 5px",
};
export const inp: CSSProperties = {
  width: "100%", background: PANEL, border: `1px solid ${LINE}`, borderRadius: 7,
  padding: "9px 11px", color: PAPER, fontSize: 13, fontFamily: "'Hanken Grotesk'",
  boxSizing: "border-box",
};
export const taStyle: CSSProperties = { ...inp, resize: "vertical", lineHeight: 1.4 };
export const primaryBtn: CSSProperties = {
  width: "100%", marginTop: 10, background: ACCENT, color: INK, border: "none",
  borderRadius: 4, padding: "11px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
};
export const ghostBtn: CSSProperties = {
  background: "transparent", color: PAPER, border: `1px solid ${LINE}`, borderRadius: 7,
  padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  fontFamily: "'Hanken Grotesk'",
};
export const layoutBtn: CSSProperties = {
  width: "100%", textAlign: "left", border: "1px solid", borderRadius: 8,
  padding: "12px 14px", marginBottom: 8, cursor: "pointer", color: PAPER,
  fontFamily: "'Hanken Grotesk'",
};
export const chip: CSSProperties = {
  fontSize: 10.5, padding: "2px 7px", borderRadius: 999, background: "#2A2822", color: "#cfcabb",
};

/* ============================================================================
   DS — dark, retro-futuristic terminal design system.
   Near-black canvas · dark surfaces · terracotta/amber accent · Space Mono for
   data & labels · Space Grotesk display · bracket + segmented-bar motifs.
   8pt spacing scale. 60-30-10: bg (60) / card (30) / accent (10).
============================================================================ */
export const DS = {
  bg: "#050506",          // pure-black terminal canvas (60%)
  bg2: "#08080A",         // sidebar / recessed
  card: "#0C0C0F",        // surface (30%) — flat
  card2: "#17171B",       // inset / empty segment
  text: "#E9E7DE",        // off-white
  mute: "#7F7C71",        // warm muted
  faint: "#57544C",       // faint labels
  border: "rgba(255,255,255,0.13)",
  borderStrong: "rgba(255,255,255,0.22)",
  accent: "#F4F1E9",      // the single bright highlight — monochrome (white)
  accentSoft: "rgba(255,255,255,0.07)",
  amber: "#9C988C",       // mid grey — chart mid
  gold: "#68655C",        // dim grey — chart base
  ok: "#C9C6BD",
  radius: 4,              // terminal-sharp
  radiusSm: 4,
  radiusPill: 999,
  shadow: "none",
  shadowSm: "none",
  mono: "'Space Mono', ui-monospace, 'SFMono-Regular', monospace",
  display: "'Space Grotesk', system-ui, sans-serif",
  body: "'Space Grotesk', system-ui, sans-serif",
  pixel: "'Pixelify Sans', ui-monospace, monospace",  // dot-matrix / LED readout font
} as const;

export const dsCard: CSSProperties = {
  background: DS.card, border: `1px solid ${DS.border}`, borderRadius: DS.radius, boxShadow: DS.shadow,
};
export const dsInput: CSSProperties = {
  width: "100%", background: DS.bg2, border: `1px solid ${DS.border}`, borderRadius: DS.radiusSm,
  padding: "11px 13px", color: DS.text, fontSize: 14, fontFamily: DS.body, boxSizing: "border-box",
};
export const dsTextarea: CSSProperties = { ...dsInput, resize: "vertical", lineHeight: 1.45 };
export const dsBtn: CSSProperties = {
  background: DS.accent, color: DS.bg, border: "none", borderRadius: DS.radiusSm,
  padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: DS.body,
};
export const dsBtnGhost: CSSProperties = {
  background: "rgba(255,255,255,0.03)", color: DS.text, border: `1px solid ${DS.border}`, borderRadius: DS.radiusSm,
  padding: "9px 15px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: DS.body,
};
export const dsLabel: CSSProperties = {
  fontFamily: DS.mono, fontSize: 10.5, letterSpacing: 0.8, textTransform: "uppercase", color: DS.faint,
};
