"use client";

import { useRef } from "react";
import { LAYOUTS, type Layout } from "@/lib/layouts";
import { INK, ACCENT, BAND_H } from "@/lib/theme";

type ReviewMap = Record<string, { score: number; note: string }>;

interface BandProps {
  layoutKey: string;
  title: string;
  conceptNote: string;
  attributes: string[];
  palette: string[];
  images: Record<string, string>;
  editable?: boolean;
  onUpload?: (tileKey: string, file: File) => void;
  review?: ReviewMap;
  onTileClick?: (tileKey: string, role: string) => void;
  uploading?: Record<string, boolean>;
}

export default function Band({
  layoutKey, title, conceptNote, attributes, palette, images,
  editable, onUpload, review, onTileClick, uploading,
}: BandProps) {
  const L = LAYOUTS[layoutKey];
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  if (!L) return null;

  function pickFile(id: string) {
    fileRefs.current[id]?.click();
  }
  function onFile(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && onUpload) onUpload(id, f);
    e.target.value = "";
  }

  return (
    <div style={{ overflowX: "auto", paddingBottom: 10 }}>
      <div style={{ display: "flex", height: BAND_H, gap: 6, width: "max-content",
        background: L.palette[2], padding: 6, borderRadius: L.radius + 4 }}>
        {L.columns.map((col, ci) => (
          <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 6, width: col.w }}>
            {col.tiles.map((t, ti) => {
              const id = `${ci}-${ti}`;
              const src = images[id];
              const r = review?.[id];
              const isIntro = t.kind === "intro";
              const isLogos = t.kind === "logos";
              const busy = uploading?.[id];
              const clickable = editable || (!!onTileClick && !isIntro);

              return (
                <div key={id}
                  onClick={() => {
                    if (editable) return pickFile(id);
                    if (onTileClick && !isIntro) onTileClick(id, t.role);
                  }}
                  style={{
                    flex: `0 0 ${t.h * 100}%`, height: 0, minHeight: 0, position: "relative",
                    borderRadius: L.radius, overflow: "hidden", cursor: clickable ? "pointer" : "default",
                    background: isIntro ? L.palette[0] : src ? "#000" : (t.seed || L.palette[3]),
                    border: r ? `2px solid ${ACCENT}` : "1px solid rgba(0,0,0,0.06)",
                    display: "flex", flexDirection: "column",
                  }}>
                  {editable && (
                    <input type="file" accept="image/*"
                      ref={(el) => { fileRefs.current[id] = el; }}
                      onChange={(e) => onFile(id, e)} style={{ display: "none" }} />
                  )}

                  {isIntro ? (
                    <IntroBlock title={title} note={conceptNote} attrs={attributes} palette={palette} />
                  ) : isLogos ? (
                    <LogoSet src={src} L={L} />
                  ) : src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={t.role} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      color: "rgba(0,0,0,0.45)", fontSize: 11, fontFamily: "'IBM Plex Mono'",
                      textAlign: "center", padding: 6 }}>
                      {busy ? "Uploading…" : t.role}
                    </div>
                  )}

                  {!isIntro && (
                    <div style={{ position: "absolute", left: 6, bottom: 6, fontSize: 9.5,
                      fontFamily: "'IBM Plex Mono'", color: "#fff", background: "rgba(0,0,0,0.55)",
                      padding: "2px 6px", borderRadius: 3 }}>
                      {t.role}
                    </div>
                  )}
                  {r && (
                    <div style={{ position: "absolute", right: 6, top: 6, width: 26, height: 26,
                      borderRadius: 999, background: ACCENT, color: INK, fontSize: 12, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>{r.score}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function IntroBlock({ title, note, attrs, palette }:
  { title: string; note: string; attrs: string[]; palette: string[] }) {
  return (
    <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column",
      justifyContent: "space-between", color: palette[2] }}>
      <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, opacity: 0.6 }}>STYLESCAPE</div>
      <div>
        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 34, lineHeight: 1, letterSpacing: -1 }}>{title}</div>
        <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 10, lineHeight: 1.4 }}>{note}</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {attrs.filter(Boolean).map((a, i) => (
          <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999,
            border: `1px solid ${palette[1]}`, color: palette[1] }}>{a}</span>
        ))}
      </div>
    </div>
  );
}

function LogoSet({ src, L }: { src?: string; L: Layout }) {
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Logo set" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 2, padding: 6, background: L.palette[2] }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ background: L.palette[0], borderRadius: 3, display: "flex", alignItems: "center",
          justifyContent: "center", color: L.palette[2], fontSize: 9, fontFamily: "'IBM Plex Mono'" }}>L{i + 1}</div>
      ))}
    </div>
  );
}
