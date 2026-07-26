"use client";

import { useState } from "react";
import Band from "@/components/Band";
import { LAYOUTS, roleForTileKey, type Stylescape } from "@/lib/layouts";
import { submitReview } from "@/app/actions";
import { INK, PAPER, PANEL, LINE, ACCENT, MUTE, taStyle, primaryBtn, ghostBtn, inp } from "@/lib/theme";

type TileReview = { score: number; note: string };

export default function ReviewClient({ stylescape, token }: { stylescape: Stylescape; token: string }) {
  const [tiles, setTiles] = useState<Record<string, TileReview>>({});
  const [overallScore, setOverallScore] = useState(7);
  const [overallNote, setOverallNote] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [active, setActive] = useState<{ id: string; role: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const total = LAYOUTS[stylescape.layoutKey].columns
    .flatMap((c) => c.tiles).filter((t) => t.kind !== "intro").length;
  const scored = Object.keys(tiles).length;

  function saveTile(id: string, score: number, note: string) {
    setTiles((t) => ({ ...t, [id]: { score, note } }));
    setActive(null);
  }

  async function onSubmit() {
    setSending(true); setErr("");
    try {
      await submitReview(token, { reviewerName, overallScore, overallNote, tiles });
      setSubmitted(true);
    } catch {
      setErr("Could not send feedback. Please try again.");
    }
    setSending(false);
  }

  if (submitted) return <ThankYou stylescape={stylescape} tiles={tiles} overallScore={overallScore} overallNote={overallNote} />;

  return (
    <div style={{ background: "#0E0D0A", minHeight: "100vh", color: PAPER }}>
      <div style={{ padding: "20px 26px", borderBottom: `1px solid ${LINE}`, background: INK,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 22 }}>{stylescape.title}</div>
          <div style={{ fontSize: 12.5, color: MUTE }}>
            Tap any material to rate it 0–10 and leave a note. Rate the whole direction at the end.
          </div>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, color: MUTE }}>{scored}/{total} rated</div>
      </div>

      <div style={{ padding: 26 }}>
        <Band layoutKey={stylescape.layoutKey} title={stylescape.title} conceptNote={stylescape.conceptNote}
          attributes={stylescape.attributes} palette={stylescape.palette} images={stylescape.images}
          review={tiles} onTileClick={(id, role) => setActive({ id, role })} />

        <div style={{ marginTop: 28, maxWidth: 620 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
            Overall, how does this direction feel?
          </div>
          <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 14 }}>
            One score for the whole concept. Note what you would keep, drop, or mix from another direction.
          </div>
          <ScoreRow value={overallScore} onChange={setOverallScore} />
          <textarea value={overallNote} onChange={(e) => setOverallNote(e.target.value)}
            placeholder="What resonates? What is off? Anything to combine with another direction?"
            style={{ ...taStyle, marginTop: 12 }} rows={3} />
          <label style={{ fontSize: 11.5, color: MUTE, display: "block", margin: "12px 0 5px" }}>Your name (optional)</label>
          <input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} placeholder="So the studio knows who reviewed" style={inp} />
          {err && <div style={{ color: ACCENT, fontSize: 12, marginTop: 10 }}>{err}</div>}
          <button onClick={onSubmit} disabled={sending}
            style={{ ...primaryBtn, marginTop: 14, width: "auto", padding: "12px 28px", opacity: sending ? 0.6 : 1 }}>
            {sending ? "Sending…" : "Submit feedback"}
          </button>
        </div>
      </div>

      {active && (
        <TileModal role={active.role} existing={tiles[active.id]}
          onClose={() => setActive(null)} onSave={(s, n) => saveTile(active.id, s, n)} />
      )}
    </div>
  );
}

function TileModal({ role, existing, onClose, onSave }:
  { role: string; existing?: TileReview; onClose: () => void; onSave: (s: number, n: string) => void }) {
  const [score, setScore] = useState(existing?.score ?? 7);
  const [note, setNote] = useState(existing?.note ?? "");
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12,
        padding: 22, width: 440, maxWidth: "100%" }}>
        <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE }}>MATERIAL</div>
        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 20, marginBottom: 16 }}>{role}</div>
        <ScoreRow value={score} onChange={setScore} />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What do you like or not like here?"
          style={{ ...taStyle, marginTop: 12 }} rows={3} />
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={() => onSave(score, note)} style={{ ...primaryBtn, width: "auto", marginTop: 0 }}>Save rating</button>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: MUTE }}>Score</span>
        <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 22, color: ACCENT }}>{value}</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} onClick={() => onChange(i)}
            style={{ flex: 1, height: 30, borderRadius: 5, cursor: "pointer", border: "none", fontWeight: 600, fontSize: 12,
              background: i <= value ? ACCENT : "#2A2822", color: i <= value ? "#fff" : MUTE }}>{i}</button>
        ))}
      </div>
    </div>
  );
}

function ThankYou({ stylescape, tiles, overallScore, overallNote }:
  { stylescape: Stylescape; tiles: Record<string, TileReview>; overallScore: number; overallNote: string }) {
  const rows = Object.entries(tiles);
  return (
    <div style={{ background: INK, minHeight: "100vh", color: PAPER }}>
      <div style={{ padding: 40, maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 30 }}>Feedback received.</div>
        <div style={{ color: MUTE, marginTop: 6, marginBottom: 24 }}>Thank you — the studio has your notes on {stylescape.title}.</div>
        <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 10, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: `1px solid ${LINE}` }}>
            <span style={{ fontWeight: 600 }}>Overall direction</span>
            <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, color: ACCENT, fontSize: 20 }}>{overallScore}/10</span>
          </div>
          {overallNote && <div style={{ fontSize: 13, color: "#cfcabb", padding: "10px 0" }}>{overallNote}</div>}
          <div style={{ marginTop: 8 }}>
            {rows.length === 0 && <div style={{ color: MUTE, fontSize: 13 }}>No individual materials rated.</div>}
            {rows.map(([id, r]) => (
              <div key={id} style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: `1px solid ${LINE}` }}>
                <span style={{ width: 34, fontFamily: "'Bricolage Grotesque'", fontWeight: 700, color: ACCENT }}>{r.score}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{roleForTileKey(stylescape.layoutKey, id)}</div>
                  {r.note && <div style={{ fontSize: 12.5, color: MUTE }}>{r.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
