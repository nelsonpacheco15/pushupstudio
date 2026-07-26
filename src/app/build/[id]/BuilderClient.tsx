"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Band from "@/components/Band";
import { LAYOUTS, flattenTiles, roleForTileKey, type Stylescape } from "@/lib/layouts";
import type { ReviewRow } from "@/lib/data";
import {
  saveStylescape, uploadTileImage, suggestConcepts, suggestPalette,
  type Concept,
} from "@/app/actions";
import {
  INK, PAPER, PANEL, LINE, ACCENT, MUTE,
  lbl, inp, taStyle, primaryBtn, ghostBtn, layoutBtn, chip,
} from "@/lib/theme";

function pad5(a: string[]): string[] {
  return [...a, "", "", "", "", ""].slice(0, 5);
}

export default function BuilderClient({
  initial, reviews, clientId, clientName,
}: {
  initial: Stylescape;
  reviews: ReviewRow[];
  clientId: string | null;
  clientName: string | null;
}) {
  const id = initial.id;
  const [title, setTitle] = useState(initial.title);
  const [conceptNote, setConceptNote] = useState(initial.conceptNote);
  const [layoutKey, setLayoutKey] = useState(initial.layoutKey);
  const [attributes, setAttributes] = useState(pad5(initial.attributes));
  const [palette, setPalette] = useState(
    initial.palette.length ? initial.palette : LAYOUTS[initial.layoutKey].palette
  );
  const [images, setImages] = useState<Record<string, string>>(initial.images);

  const [brief, setBrief] = useState("");
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState<"concepts" | "palette" | null>(null);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState("");

  useEffect(() => {
    setShareLink(`${window.location.origin}/review/${initial.shareToken}`);
  }, [initial.shareToken]);

  // Debounced autosave of the concept meta.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await saveStylescape(id, { title, conceptNote, layoutKey, attributes, palette });
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [id, title, conceptNote, layoutKey, attributes, palette]);

  function switchLayout(k: string) {
    // Keep the current (possibly AI-generated / hand-edited) palette — don't
    // clobber it with the layout default. Use "Suggest palette" for a new one.
    setLayoutKey(k);
  }
  function setAttr(i: number, v: string) {
    const a = [...attributes];
    a[i] = v;
    setAttributes(a);
  }
  function applyConcept(c: Concept) {
    setTitle(c.name);
    setConceptNote(c.direction);
    setAttributes(pad5(c.attributes || []));
    if (c.palette?.length) setPalette(c.palette);
  }

  async function onSuggestConcepts() {
    if (!brief.trim()) { setErr("Add a briefing first."); return; }
    setErr(""); setLoading("concepts");
    try { setConcepts(await suggestConcepts(brief)); }
    catch { setErr("Concept call failed. Check your GROQ_API_KEY and try again."); }
    setLoading(null);
  }
  async function onSuggestPalette() {
    setErr(""); setLoading("palette");
    try {
      const p = await suggestPalette(title, attributes);
      if (Array.isArray(p) && p.length >= 3) setPalette(p);
      else setErr("The palette suggestion came back empty. Keeping your current one.");
    } catch { setErr("Palette call failed. Try again."); }
    setLoading(null);
  }

  async function onUpload(tileKey: string, file: File) {
    setUploading((u) => ({ ...u, [tileKey]: true }));
    try {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("tileKey", tileKey);
      fd.set("file", file);
      const url = await uploadTileImage(fd);
      setImages((im) => ({ ...im, [tileKey]: url }));
    } catch {
      setErr("Image upload failed.");
    }
    setUploading((u) => ({ ...u, [tileKey]: false }));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  }

  const validKeys = new Set(flattenTiles(layoutKey).map((t) => t.id));
  const filled = Object.keys(images).filter((k) => validKeys.has(k)).length;
  // Matches the client review page, where every non-intro tile (logos included) is rateable.
  const totalTiles = LAYOUTS[layoutKey].columns.flatMap((c) => c.tiles)
    .filter((t) => t.kind !== "intro").length;

  const overallReviews = reviews.filter((r) => r.tile_key === null);
  const tileReviews = reviews.filter((r) => r.tile_key !== null);

  return (
    <div style={{ background: INK, minHeight: "100vh", color: PAPER }}>
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: `1px solid ${LINE}`, position: "sticky", top: 0, zIndex: 40, background: INK }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <Link href={clientId ? `/client/${clientId}` : "/"} style={{ color: MUTE, fontSize: 13 }}>
            ← {clientName || "Clients"}
          </Link>
          <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700 }}>{title || "Untitled"}</span>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE }}>
            {saveState === "saving" ? "saving…" : saveState === "saved" ? "saved" : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={copyLink} style={ghostBtn}>{copied ? "Copied ✓" : "Copy client link"}</button>
          <a href={shareLink} target="_blank" rel="noreferrer" style={{ ...primaryBtn, width: "auto", marginTop: 0, padding: "9px 16px", display: "inline-block" }}>
            Open client link ↗
          </a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", minHeight: "calc(100vh - 53px)" }}>
        {/* left rail */}
        <div style={{ borderRight: `1px solid ${LINE}`, padding: 22, overflowY: "auto", height: "calc(100vh - 53px)" }}>
          <Section label="01 — Briefing → concepts">
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)}
              placeholder="Paste the client brief: who they are, audience, tone, sector…"
              style={taStyle} rows={4} />
            <button onClick={onSuggestConcepts} style={primaryBtn}>
              {loading === "concepts" ? "Thinking…" : "Suggest 3 concepts"}
            </button>
            {err && <div style={{ color: ACCENT, fontSize: 12, marginTop: 8 }}>{err}</div>}
            {concepts.map((c, i) => (
              <div key={i} onClick={() => applyConcept(c)}
                style={{ marginTop: 10, padding: 12, border: `1px solid ${LINE}`, borderRadius: 8, cursor: "pointer", background: PANEL }}>
                <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: MUTE, margin: "4px 0 8px" }}>{c.direction}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(c.attributes || []).map((a, j) => <span key={j} style={chip}>{a}</span>)}
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
                  {(c.palette || []).map((p, j) => (
                    <span key={j} style={{ width: 20, height: 20, borderRadius: 3, background: p, border: `1px solid ${LINE}` }} />
                  ))}
                </div>
              </div>
            ))}
          </Section>

          <Section label="02 — Layout">
            {Object.entries(LAYOUTS).map(([k, L]) => (
              <button key={k} onClick={() => switchLayout(k)}
                style={{ ...layoutBtn, borderColor: layoutKey === k ? ACCENT : LINE, background: layoutKey === k ? "#241E1B" : PANEL }}>
                <div style={{ fontWeight: 700, fontFamily: "'Bricolage Grotesque'" }}>{L.name}</div>
                <div style={{ fontSize: 11.5, color: MUTE, marginTop: 2 }}>{L.note}</div>
              </button>
            ))}
          </Section>

          <Section label="03 — Concept details">
            <label style={lbl}>Project title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inp} />
            <label style={lbl}>Background note</label>
            <textarea value={conceptNote} onChange={(e) => setConceptNote(e.target.value)} style={taStyle} rows={2} />
            <label style={lbl}>5 attributes</label>
            <div style={{ display: "grid", gap: 6 }}>
              {attributes.map((a, i) => (
                <input key={i} value={a} onChange={(e) => setAttr(i, e.target.value)}
                  placeholder={`Attribute ${i + 1}`} style={inp} />
              ))}
            </div>
          </Section>

          <Section label="04 — Palette">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {palette.map((p, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: p, border: `1px solid ${LINE}` }} />
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: MUTE, marginTop: 3 }}>{p}</div>
                </div>
              ))}
            </div>
            <button onClick={onSuggestPalette} style={ghostBtn}>
              {loading === "palette" ? "Thinking…" : "Suggest palette from attributes"}
            </button>
          </Section>
        </div>

        {/* canvas */}
        <div style={{ padding: 26, overflowY: "auto", height: "calc(100vh - 53px)", background: "#0E0D0A" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE }}>
              CANVAS · {LAYOUTS[layoutKey].name} · click a tile to attach an image
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE }}>{filled} images attached</div>
          </div>

          <Band layoutKey={layoutKey} title={title} conceptNote={conceptNote}
            attributes={attributes} palette={palette} images={images}
            editable onUpload={onUpload} uploading={uploading} />

          <div style={{ marginTop: 22, padding: 16, border: `1px dashed ${LINE}`, borderRadius: 8, fontSize: 13, color: MUTE }}>
            Seeded swatches are placeholders. Attach real brand-material images per tile, then send the client link.
            The <b style={{ color: PAPER }}>Logo set</b> tile takes one image showing your 5 logo options together. {totalTiles} rateable materials in this layout.
          </div>

          {/* feedback */}
          <div style={{ marginTop: 34 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              Client feedback {reviews.length ? `· ${overallReviews.length} submitted` : ""}
            </div>
            {reviews.length === 0 ? (
              <div style={{ fontSize: 13, color: MUTE }}>No feedback yet. It appears here the moment a client submits the link.</div>
            ) : (
              <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 10, padding: 18, maxWidth: 720 }}>
                {overallReviews.map((r, i) => (
                  <div key={`o-${i}`} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${LINE}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600 }}>{r.reviewer_name || "Client"} · overall</span>
                      <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, color: ACCENT, fontSize: 18 }}>{r.score}/10</span>
                    </div>
                    {r.note && <div style={{ fontSize: 13, color: "#cfcabb", marginTop: 6 }}>{r.note}</div>}
                  </div>
                ))}
                {tileReviews.map((r, i) => (
                  <div key={`t-${i}`} style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: i === 0 ? "none" : `1px solid ${LINE}` }}>
                    <span style={{ width: 30, fontFamily: "'Bricolage Grotesque'", fontWeight: 700, color: ACCENT }}>{r.score}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {roleForTileKey(layoutKey, r.tile_key as string)}
                        <span style={{ color: MUTE, fontWeight: 400 }}> · {r.reviewer_name || "Client"}</span>
                      </div>
                      {r.note && <div style={{ fontSize: 12.5, color: MUTE }}>{r.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10.5, letterSpacing: 0.5, color: MUTE, marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}
