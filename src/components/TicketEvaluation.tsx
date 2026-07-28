"use client";

import { useState, useTransition } from "react";
import { submitTicketFeedback } from "@/app/actions";
import { DS, dsTextarea } from "@/lib/theme";

const T = {
  en: { title: "How's the design?", score: "Your score", ph: "Anything you'd keep, change, or love?",
    approve: "✓ Approve", changes: "↻ Request changes", sending: "Sending…",
    doneApproved: "Approved — thank you!", doneChanges: "Got it — we'll make the changes.", back: "You can close this." },
  pt: { title: "O que achas do design?", score: "A tua nota", ph: "Algo que gostavas de manter, mudar ou adoras?",
    approve: "✓ Aprovar", changes: "↻ Pedir alterações", sending: "A enviar…",
    doneApproved: "Aprovado — obrigado!", doneChanges: "Entendido — vamos fazer as alterações.", back: "Já podes fechar." },
};

export default function TicketEvaluation({ token, ticketId, lang }: { token: string; ticketId: string; lang: "en" | "pt" }) {
  const t = T[lang];
  const [score, setScore] = useState(8);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<null | "approved" | "changes">(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  function submit(decision: "approved" | "changes") {
    setErr("");
    start(async () => {
      try { await submitTicketFeedback(token, ticketId, score, note, decision); setDone(decision); }
      catch (e) { setErr(e instanceof Error ? e.message : "Could not submit — try again."); }
    });
  }

  if (done) {
    return (
      <div style={{ background: DS.card, border: `1px solid ${DS.accent}`, borderRadius: 4, padding: 22, textAlign: "center" }}>
        <div style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 18 }}>{done === "approved" ? t.doneApproved : t.doneChanges}</div>
        <div style={{ fontFamily: DS.mono, fontSize: 11, color: DS.mute, marginTop: 6 }}>{t.back}</div>
      </div>
    );
  }

  return (
    <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 4, padding: 22 }}>
      <div style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 18, marginBottom: 14 }}>{t.title}</div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
        <span style={{ fontFamily: DS.mono, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: DS.faint }}>{t.score}</span>
        <span style={{ fontFamily: DS.pixel, fontSize: 22, color: DS.accent }}>{score}</span>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} onClick={() => setScore(i)} aria-label={`Score ${i}`}
            style={{ flex: 1, height: 42, borderRadius: 4, cursor: "pointer", border: "none", fontFamily: DS.mono, fontSize: 12.5,
              fontWeight: 600, background: i <= score ? DS.accent : DS.card2, color: i <= score ? DS.bg : DS.mute }}>{i}</button>
        ))}
      </div>

      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.ph} style={{ ...dsTextarea, marginTop: 14 }} rows={3} />
      {err && <div style={{ color: DS.accent, fontSize: 12.5, marginTop: 8 }}>{err}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={() => submit("changes")} disabled={pending}
          style={{ flex: 1, background: "transparent", color: DS.text, border: `1px solid ${DS.border}`, borderRadius: 4,
            padding: "11px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: DS.body }}>
          {pending ? t.sending : t.changes}
        </button>
        <button onClick={() => submit("approved")} disabled={pending}
          style={{ flex: 1, background: DS.accent, color: DS.bg, border: "none", borderRadius: 4,
            padding: "11px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: DS.body }}>
          {pending ? t.sending : t.approve}
        </button>
      </div>
    </div>
  );
}
