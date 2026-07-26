"use client";

import { useRef, useState } from "react";
import { submitVoiceRequest } from "@/app/actions";
import { Elapsed } from "@/components/LiveTimer";
import { INK, PANEL, LINE, ACCENT, MUTE, PAPER, ghostBtn } from "@/lib/theme";

type Mode = "idle" | "recording" | "sending" | "done";

const MAX_RECORDING_MS = 3 * 60 * 1000; // auto-stop at 3 minutes

export default function VoiceRequest({ portalToken }: { portalToken: string }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
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
    setMode("sending");
  }

  async function processRecording(mimeType: string) {
    try {
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size > 11 * 1024 * 1024) {
        setError("That recording is too long to send. Please keep it under about 3 minutes.");
        setMode("idle");
        return;
      }
      const fd = new FormData();
      fd.set("audio", new File([blob], `request.${ext}`, { type: mimeType }));
      fd.set("portalToken", portalToken);
      await submitVoiceRequest(fd);
      setMode("done");
    } catch {
      setError("Sorry, something went wrong sending your request. Please try again.");
      setMode("idle");
    }
  }

  return (
    <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>New request</div>
      <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 16 }}>
        Just talk — describe what you need and we’ll take it from there.
      </div>

      {error && <div style={{ color: ACCENT, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      {mode === "idle" && (
        <button onClick={startRecording}
          style={{ width: "100%", background: ACCENT, color: INK, border: "none", borderRadius: 10,
            padding: "16px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          ● Record your request
        </button>
      )}

      {mode === "recording" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: ACCENT, fontFamily: "'IBM Plex Mono'", fontSize: 22, marginBottom: 14 }}>
            ● <Elapsed startedAt={startedAt} />
          </div>
          <button onClick={stopRecording}
            style={{ width: "100%", background: "#3a1f1a", color: ACCENT, border: `1px solid ${ACCENT}`,
              borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            ■ Stop &amp; send
          </button>
        </div>
      )}

      {mode === "sending" && (
        <div style={{ textAlign: "center", color: MUTE, padding: "18px 0" }}>Sending your request…</div>
      )}

      {mode === "done" && (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18, color: PAPER }}>Your request was sent ✓</div>
          <div style={{ fontSize: 12.5, color: MUTE, margin: "6px 0 14px" }}>We’ll take it from here and keep you posted.</div>
          <button onClick={() => { setMode("idle"); setError(""); }} style={ghostBtn}>Record another</button>
        </div>
      )}
    </div>
  );
}
