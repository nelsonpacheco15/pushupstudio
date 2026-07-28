import Link from "next/link";
import { STATUSES, driveEmbed, type Ticket } from "@/lib/tickets";
import type { ClientRecord, TicketFeedback, TicketVersion, TicketAttachment } from "@/lib/data";
import TicketEvaluation from "@/components/TicketEvaluation";
import { DS } from "@/lib/theme";

/* Shared client-facing ticket view. Used by the share-link portal
   (/portal/[token]/[ticketId]) and the logged-in account view (/me/[ticketId]).
   Evaluation submits via the client's portal token under the hood. */

const T = {
  en: { brief: "BRIEF", design: "YOUR DESIGN", waiting: "Your design isn't ready yet — we'll email you the moment it is.",
    reviewed: "Your feedback", steps: ["In queue", "Up next", "Designing", "Your review", "Delivered"],
    eta: "Est. delivery", delivered: "Delivered", due: "Due", overdue: "Overdue" },
  pt: { brief: "BRIEFING", design: "O TEU DESIGN", waiting: "O teu design ainda não está pronto — enviamos-te um email assim que estiver.",
    reviewed: "O teu feedback", steps: ["Em fila", "A seguir", "Em design", "A tua revisão", "Entregue"],
    eta: "Entrega prevista", delivered: "Entregue", due: "Prazo", overdue: "Atrasado" },
};

export default function PortalTicketView({
  client, ticket, feedback, backHref, backLabel, versions = [], shown, slaHours = 0, attachments = [],
}: {
  client: ClientRecord; ticket: Ticket; feedback: TicketFeedback[]; backHref: string; backLabel: string;
  versions?: TicketVersion[]; shown?: TicketVersion | null; slaHours?: number; attachments?: TicketAttachment[];
}) {
  const embed = driveEmbed(shown?.url ?? ticket.deliverableUrl);
  const accepted = shown?.status === "accepted";
  const t = T[client.language];

  // Progress + ETA
  const stepIdx = STATUSES.indexOf(ticket.status);
  const done = ticket.status === "done";
  const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(client.language === "pt" ? "pt-PT" : "en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  let etaLabel = "";
  if (done) etaLabel = `${t.delivered} · ${fmtDate(new Date(ticket.updatedAt).getTime())}`;
  else if (slaHours > 0) {
    const target = new Date(ticket.createdAt).getTime() + slaHours * 3600 * 1000;
    etaLabel = target < Date.now() ? `${t.overdue}` : `${t.eta} · ${fmtDate(target)}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, color: DS.text }}>
      <div style={{ height: 4, background: client.brandColor }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 26px", borderBottom: `1px solid ${DS.border}` }}>
        {client.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logoUrl} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", border: `1px solid ${DS.border}` }} />
        )}
        <Link href={backHref} style={{ fontFamily: DS.mono, fontSize: 12, color: DS.mute }}>{backLabel}</Link>
      </div>

      <div style={{ padding: 26, maxWidth: 860, margin: "0 auto" }}>
        <h1 style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 30, letterSpacing: -0.6, margin: "0 0 18px" }}>{ticket.title}</h1>

        {/* progress timeline + ETA */}
        <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 4, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
            {t.steps.map((label, i) => {
              const state = i < stepIdx ? "done" : i === stepIdx ? "current" : "todo";
              const dot = state === "todo" ? DS.faint : DS.accent;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                  {i > 0 && <div style={{ position: "absolute", top: 6, right: "50%", width: "100%", height: 2, background: i <= stepIdx ? DS.accent : DS.border }} />}
                  <div style={{ width: 13, height: 13, borderRadius: 999, background: state === "todo" ? "transparent" : dot,
                    border: `2px solid ${dot}`, zIndex: 1, boxShadow: state === "current" ? `0 0 0 4px ${DS.accentSoft}` : "none" }} />
                  <div style={{ fontFamily: DS.mono, fontSize: 9.5, letterSpacing: 0.3, marginTop: 8, textAlign: "center",
                    color: state === "current" ? DS.text : DS.faint, fontWeight: state === "current" ? 700 : 400 }}>{label}</div>
                </div>
              );
            })}
          </div>
          {etaLabel && (
            <div style={{ fontFamily: DS.mono, fontSize: 11, color: etaLabel === t.overdue ? "#D2452B" : DS.mute, textAlign: "center", marginTop: 14 }}>
              {done ? "✓ " : "◷ "}{etaLabel}
            </div>
          )}
        </div>

        {ticket.description && (
          <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 4, padding: 18, marginBottom: 18 }}>
            <div style={{ fontFamily: DS.mono, fontSize: 10, letterSpacing: 0.8, color: DS.faint, marginBottom: 10 }}>[ {t.brief} ]</div>
            <div style={{ fontSize: 13.5, color: "#CFCCC2", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ticket.description}</div>
          </div>
        )}

        {attachments.filter((a) => a.kind === "audio").map((a) => (
          <div key={a.id} style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 4, padding: 16, marginBottom: 18 }}>
            <div style={{ fontFamily: DS.mono, fontSize: 10, letterSpacing: 0.8, color: DS.faint, marginBottom: 10 }}>🎙 {client.language === "pt" ? "A TUA GRAVAÇÃO" : "YOUR RECORDING"}</div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={a.url} style={{ width: "100%", height: 38 }} />
          </div>
        ))}

        {attachments.filter((a) => a.kind !== "audio").length > 0 && (
          <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 4, padding: 18, marginBottom: 18 }}>
            <div style={{ fontFamily: DS.mono, fontSize: 10, letterSpacing: 0.8, color: DS.faint, marginBottom: 12 }}>
              [ {client.language === "pt" ? "ANEXOS" : "ATTACHMENTS"} · {attachments.filter((a) => a.kind !== "audio").length} ]
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
              {attachments.filter((a) => a.kind !== "audio").map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                  style={{ display: "block", border: `1px solid ${DS.border}`, borderRadius: 4, overflow: "hidden", background: DS.bg }}>
                  {a.kind === "image"
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.url} alt={a.name} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                    : <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: DS.mute }}>⤓</div>}
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 10px" }}>
          <div style={{ fontFamily: DS.mono, fontSize: 10, letterSpacing: 0.8, color: DS.faint }}>[ {t.design}{shown ? ` · V${shown.version}` : ""} ]</div>
          {accepted && <span style={{ fontFamily: DS.mono, fontSize: 10, color: "#7FB77E" }}>✓ {client.language === "pt" ? "ACEITE" : "ACCEPTED"}</span>}
          {versions.length > 1 && (
            <span style={{ fontFamily: DS.mono, fontSize: 10, color: DS.faint }}>
              {client.language === "pt" ? `${versions.length} versões` : `${versions.length} versions`}
            </span>
          )}
        </div>
        {embed ? (
          <>
            <iframe src={embed} title="Design"
              style={{ width: "100%", height: 520, border: `1px solid ${DS.border}`, borderRadius: 4, background: "#000", marginBottom: 20 }} />
            {/* Evaluate when the current version is still awaiting a decision. */}
            {(shown ? shown.status === "pending" : feedback.length === 0) && (
              <TicketEvaluation token={client.portalToken} ticketId={ticket.id} lang={client.language} />
            )}
            {feedback.length > 0 && (
              <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 4, padding: 18, marginTop: 20 }}>
                <div style={{ fontFamily: DS.mono, fontSize: 10, letterSpacing: 0.8, color: DS.faint, marginBottom: 4 }}>[ {t.reviewed.toUpperCase()} ]</div>
                {feedback.map((f) => (
                  <div key={f.id} style={{ borderTop: `1px solid ${DS.border}`, padding: "10px 0", display: "flex", alignItems: "center", gap: 12 }}>
                    {f.score != null && <span style={{ fontFamily: DS.pixel, fontSize: 18, color: DS.accent }}>{f.score}/10</span>}
                    {f.decision && <span style={{ fontFamily: DS.mono, fontSize: 11, color: DS.text }}>{f.decision === "approved" ? "✓" : "↻"}</span>}
                    {f.note && <span style={{ fontSize: 13, color: DS.mute }}>{f.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 4, padding: 40, textAlign: "center", color: DS.mute }}>
            {t.waiting}
          </div>
        )}
      </div>
    </div>
  );
}
