import Link from "next/link";
import { STATUS_LABELS, driveEmbed, type Ticket } from "@/lib/tickets";
import type { ClientRecord, TicketFeedback } from "@/lib/data";
import TicketEvaluation from "@/components/TicketEvaluation";
import { DS } from "@/lib/theme";

/* Shared client-facing ticket view. Used by the share-link portal
   (/portal/[token]/[ticketId]) and the logged-in account view (/me/[ticketId]).
   Evaluation submits via the client's portal token under the hood. */

const T = {
  en: { brief: "BRIEF", design: "YOUR DESIGN", waiting: "Your design isn't ready yet — we'll email you the moment it is.",
    reviewed: "Your feedback" },
  pt: { brief: "BRIEFING", design: "O TEU DESIGN", waiting: "O teu design ainda não está pronto — enviamos-te um email assim que estiver.",
    reviewed: "O teu feedback" },
};

export default function PortalTicketView({
  client, ticket, feedback, backHref, backLabel,
}: {
  client: ClientRecord; ticket: Ticket; feedback: TicketFeedback[]; backHref: string; backLabel: string;
}) {
  const embed = driveEmbed(ticket.deliverableUrl);
  const t = T[client.language];

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
        <div style={{ fontFamily: DS.mono, fontSize: 11, letterSpacing: 0.8, color: DS.faint }}>[ {STATUS_LABELS[ticket.status].toUpperCase()} ]</div>
        <h1 style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 30, letterSpacing: -0.6, margin: "6px 0 20px" }}>{ticket.title}</h1>

        {ticket.description && (
          <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 4, padding: 18, marginBottom: 18 }}>
            <div style={{ fontFamily: DS.mono, fontSize: 10, letterSpacing: 0.8, color: DS.faint, marginBottom: 10 }}>[ {t.brief} ]</div>
            <div style={{ fontSize: 13.5, color: "#CFCCC2", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ticket.description}</div>
          </div>
        )}

        <div style={{ fontFamily: DS.mono, fontSize: 10, letterSpacing: 0.8, color: DS.faint, margin: "6px 0 10px" }}>[ {t.design} ]</div>
        {embed ? (
          <>
            <iframe src={embed} title="Design"
              style={{ width: "100%", height: 520, border: `1px solid ${DS.border}`, borderRadius: 4, background: "#000", marginBottom: 20 }} />
            {feedback.length > 0 ? (
              <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 4, padding: 18 }}>
                <div style={{ fontFamily: DS.mono, fontSize: 10, letterSpacing: 0.8, color: DS.faint, marginBottom: 4 }}>[ {t.reviewed.toUpperCase()} ]</div>
                {feedback.map((f) => (
                  <div key={f.id} style={{ borderTop: `1px solid ${DS.border}`, padding: "10px 0", display: "flex", alignItems: "center", gap: 12 }}>
                    {f.score != null && <span style={{ fontFamily: DS.pixel, fontSize: 18, color: DS.accent }}>{f.score}/10</span>}
                    {f.decision && <span style={{ fontFamily: DS.mono, fontSize: 11, color: DS.text }}>{f.decision === "approved" ? "✓" : "↻"}</span>}
                    {f.note && <span style={{ fontSize: 13, color: DS.mute }}>{f.note}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <TicketEvaluation token={client.portalToken} ticketId={ticket.id} lang={client.language} />
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
