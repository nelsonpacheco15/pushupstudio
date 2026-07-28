"use client";

import { useRef, useState } from "react";
import { transcribeVoiceRequest, submitVoiceRequest, type VoiceAnalysis } from "@/app/actions";
import { REQUEST_TYPES } from "@/lib/tickets";
import { Elapsed } from "@/components/LiveTimer";
import { INK, PANEL, LINE, ACCENT, MUTE, PAPER, inp, taStyle, ghostBtn } from "@/lib/theme";

type Mode = "idle" | "recording" | "analyzing" | "review" | "sending" | "done";
const MAX_RECORDING_MS = 3 * 60 * 1000;
const lbl = { fontSize: 11.5, color: MUTE, display: "block" as const, margin: "12px 0 5px" };

export default function VoiceRequest({ portalToken }: { portalToken: string }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => processRecording(rec.mimeType);
      recorderRef.current = rec;
      rec.start();
      setStartedAt(new Date().toISOString());
      setMode("recording");
      autoStopRef.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch {
      setError("Couldn't access the microphone. Please allow mic access and try again.");
    }
  }

  function stopRecording() {
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setMode("analyzing");
  }

  async function processRecording(mimeType: string) {
    try {
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size > 11 * 1024 * 1024) { setError("That recording is too long. Please keep it under ~3 minutes."); setMode("idle"); return; }
      const fd = new FormData();
      fd.set("audio", new File([blob], `request.${ext}`, { type: mimeType }));
      fd.set("portalToken", portalToken);
      const result = await transcribeVoiceRequest(fd);
      setAnalysis(result);
      setMode("review");
    } catch {
      setError("Sorry, we couldn't process that recording. Please try again.");
      setMode("idle");
    }
  }

  async function submit(formData: FormData) {
    setMode("sending");
    try { await submitVoiceRequest(formData); setMode("done"); }
    catch { setError("Something went wrong sending your request. Please try again."); setMode("review"); }
  }

  return (
    <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 20 }}>
      {error && <div style={{ color: ACCENT, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      {mode === "idle" && (
        <>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>New rep</div>
          <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 16 }}>Just talk — describe what you need. You’ll review it before sending.</div>
          <button onClick={startRecording}
            style={{ width: "100%", background: ACCENT, color: INK, border: "none", borderRadius: 10, padding: "16px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            ● Record your request
          </button>
        </>
      )}

      {mode === "recording" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: ACCENT, fontFamily: "'IBM Plex Mono'", fontSize: 22, marginBottom: 14 }}>● <Elapsed startedAt={startedAt} /></div>
          <button onClick={stopRecording}
            style={{ width: "100%", background: "#3a1f1a", color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            ■ Stop &amp; review
          </button>
        </div>
      )}

      {mode === "analyzing" && (
        <div style={{ textAlign: "center", color: MUTE, padding: "22px 0" }}>
          <div style={{ fontSize: 14, color: PAPER, marginBottom: 6 }}>Transcribing &amp; understanding…</div>
          <div style={{ fontSize: 12.5 }}>Give us a moment.</div>
        </div>
      )}

      {mode === "review" && analysis && (
        <form action={submit}>
          <input type="hidden" name="portalToken" value={portalToken} />
          <input type="hidden" name="audioUrl" value={analysis.audioUrl} />
          {analysis.audioUrl && (
            <div style={{ marginBottom: 12 }}>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls src={analysis.audioUrl} style={{ width: "100%", height: 38 }} />
            </div>
          )}
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Review your request</div>
          <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 12 }}>Edit anything below, then send. We picked a category for you.</div>

          <label style={lbl}>Title</label>
          <input name="title" defaultValue={analysis.title} required style={inp} />

          <label style={lbl}>What you said (edit if needed)</label>
          <textarea name="description" defaultValue={analysis.transcript} rows={6} style={{ ...taStyle, lineHeight: 1.6 }} />

          <label style={lbl}>Category <span style={{ color: ACCENT }}>· auto-selected</span></label>
          <select name="type" defaultValue={analysis.type} style={inp}>
            {REQUEST_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <select name="priority" defaultValue={String(analysis.priority)} style={{ ...inp, flex: 1, minWidth: 130 }}>
              <option value="0">Priority · Normal</option>
              <option value="1">Priority · High</option>
              <option value="2">Priority · Urgent</option>
            </select>
            <input name="deadline" type="date" style={{ ...inp, flex: 1, minWidth: 150 }} />
          </div>
          <input name="references" defaultValue={analysis.references} placeholder="Reference links (optional)" style={{ ...inp, marginTop: 8 }} />

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" onClick={() => { setMode("idle"); setAnalysis(null); }} style={{ ...ghostBtn, flex: "0 0 auto" }}>Re-record</button>
            <button type="submit" style={{ flex: 1, background: ACCENT, color: INK, border: "none", borderRadius: 10, padding: "12px", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>
              Send request
            </button>
          </div>
        </form>
      )}

      {mode === "sending" && <div style={{ textAlign: "center", color: MUTE, padding: "22px 0" }}>Sending your request…</div>}

      {mode === "done" && (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18, color: PAPER }}>Your request was sent ✓</div>
          <div style={{ fontSize: 12.5, color: MUTE, margin: "6px 0 14px" }}>We’ll take it from here and keep you posted.</div>
          <button onClick={() => { setMode("idle"); setAnalysis(null); setError(""); }} style={ghostBtn}>Record another</button>
        </div>
      )}
    </div>
  );
}
