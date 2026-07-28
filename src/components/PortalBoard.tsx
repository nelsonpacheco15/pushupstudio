import Link from "next/link";
import { clientLogout, startClientCheckout, reorderBacklogTicket, type NotifFeed } from "@/app/actions";
import { STATUSES, STATUS_DOT, type TicketStatus, type Ticket } from "@/lib/tickets";
import type { ClientRecord } from "@/lib/data";
import NewRequestButton from "@/components/NewRequestButton";
import NotificationBell from "@/components/NotificationBell";
import LockerAccount from "@/components/LockerAccount";
import { INK, PANEL, LINE, MUTE, PAPER } from "@/lib/theme";

// Client-friendly column names (no internal jargon), consistent with the ticket timeline.
const CLIENT_STATUS: Record<"en" | "pt", Record<TicketStatus, string>> = {
  en: { backlog: "In queue", ready: "Up next", in_progress: "In progress", review: "Your review", done: "Done" },
  pt: { backlog: "Em fila", ready: "A seguir", in_progress: "Em progresso", review: "A tua revisão", done: "Concluído" },
};

export interface BillingStrip {
  planLabel: string; amountLabel: string; method: string; status: string; canPay: boolean;
}

export interface SelfService {
  plan: string; paused: boolean;
  growthLabel: string; scaleLabel: string;
  invoices: { id: string; number: string; periodLabel: string; amountLabel: string; status: string }[];
}

/* The client "Locker Room" board. Shared by the public share-link portal
   (/portal/[token]) and the logged-in account view (/me). ticketHrefBase is the
   prefix for a ticket link, e.g. `/portal/<token>` or `/me`. */

export default function PortalBoard({
  client, tickets, ticketHrefBase, showLogout = false, billing, notifications, selfService,
}: {
  client: ClientRecord; tickets: Ticket[]; ticketHrefBase: string; showLogout?: boolean;
  billing?: BillingStrip; notifications?: NotifFeed; selfService?: SelfService;
}) {
  const open = tickets.filter((t) => t.status !== "done").length;
  const reviewCount = tickets.filter((t) => t.status === "review").length;
  const isPt = client.language === "pt";
  const subtitle = reviewCount > 0
    ? (isPt ? `${reviewCount} design${reviewCount > 1 ? "s" : ""} à tua espera para reveres ✦` : `${reviewCount} design${reviewCount > 1 ? "s" : ""} waiting for your review ✦`)
    : (isPt ? `Os teus pedidos e como estão a avançar · ${open} em curso` : `Your requests and how they’re progressing · ${open} open`);

  return (
    <div style={{ minHeight: "100vh", background: INK, color: PAPER }}>
      <div style={{ height: 4, background: client.brandColor }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", borderBottom: `1px solid ${LINE}`, flexWrap: "wrap", rowGap: 12 }}>
        {client.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: `1px solid ${LINE}` }} />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono'", letterSpacing: 2, color: MUTE, textTransform: "uppercase" }}>Locker Room</div>
          <div style={{ fontWeight: 700, fontSize: 22, marginTop: 2,
            fontFamily: client.brandFont ? `'${client.brandFont}', 'Bricolage Grotesque'` : "'Bricolage Grotesque'" }}>{client.name}</div>
          <div style={{ fontSize: 12.5, color: reviewCount > 0 ? "#E9C46A" : MUTE }}>{subtitle}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <NewRequestButton clientId={client.id} portalToken={client.portalToken} brandColor={client.brandColor} />
          {notifications && <NotificationBell scope="client" initial={notifications} tone="light" />}
          {showLogout && (
            <form action={clientLogout}>
              <button type="submit" style={{ background: "transparent", color: MUTE, border: `1px solid ${LINE}`,
                borderRadius: 8, padding: "8px 14px", fontSize: 12.5, cursor: "pointer", fontFamily: "'IBM Plex Mono'" }}>
                Log out
              </button>
            </form>
          )}
        </div>
      </div>

      {billing && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 26px", borderBottom: `1px solid ${LINE}`,
          background: PANEL, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, letterSpacing: 1, color: MUTE }}>[ PLAN ]</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{billing.planLabel}</span>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: PAPER }}>{billing.amountLabel}/mo</span>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: billing.status === "paid" ? "#7FB77E" : MUTE }}>
            · {billing.status === "paid" ? "PAID" : billing.status === "sent" ? "PAYMENT DUE" : billing.status.toUpperCase()}
          </span>
          {billing.canPay && (
            <form action={startClientCheckout} style={{ marginLeft: "auto" }}>
              <button type="submit" style={{ background: PAPER, color: INK, border: "none", borderRadius: 8,
                padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'IBM Plex Mono'" }}>
                Pay by card
              </button>
            </form>
          )}
        </div>
      )}

      <div style={{ padding: "22px 20px", maxWidth: 1440, margin: "0 auto" }}>
        {tickets.length === 0 ? (
          <div style={{ background: PANEL, border: `1px dashed ${LINE}`, borderRadius: 14, padding: "48px 24px", textAlign: "center", maxWidth: 480, margin: "18px auto" }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>💪</div>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 22 }}>{isPt ? "Vamos a isto!" : "Let’s get started!"}</div>
            <div style={{ fontSize: 13.5, color: MUTE, margin: "8px auto 20px", maxWidth: 320, lineHeight: 1.6 }}>
              {isPt ? "Ainda não tens pedidos. Descreve o que precisas — por voz ou texto — e nós tratamos do resto." : "You have no requests yet. Tell us what you need — by voice or text — and we’ll take it from there."}
            </div>
            <NewRequestButton clientId={client.id} portalToken={client.portalToken} brandColor={client.brandColor} />
          </div>
        ) : (
        /* board — full width, the main focus */
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}>
          {STATUSES.map((status: TicketStatus) => {
            const col = tickets.filter((t) => t.status === status);
            if (status === "backlog") col.sort((a, b) => a.position - b.position);
            const reorderable = status === "backlog" && col.length > 1;
            const isReview = status === "review" && col.length > 0;
            return (
              <div key={status} style={{ width: 230, flex: "0 0 230px",
                ...(isReview ? { background: "rgba(233,196,106,0.06)", border: "1px solid rgba(233,196,106,0.35)", borderRadius: 12, padding: 8 } : {}) }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: isReview ? "2px 4px" : 0 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: isReview ? "#E9C46A" : STATUS_DOT[status] }} />
                  <span style={{ fontWeight: 600, fontSize: 13.5, color: isReview ? "#E9C46A" : PAPER }}>{CLIENT_STATUS[isPt ? "pt" : "en"][status]}</span>
                  <span style={{ color: MUTE, fontFamily: "'IBM Plex Mono'", fontSize: 12 }}>{col.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.map((t, i) => {
                    const card = (
                      <Link href={`${ticketHrefBase}/${t.id}`}
                        style={{ display: "block", flex: 1, minWidth: 0, background: PANEL, border: `1px solid ${t.deliverableUrl ? PAPER : LINE}`, borderRadius: 10, padding: 12 }}>
                        {t.form?.type && <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono'", color: MUTE }}>{t.form.type}</div>}
                        <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 3 }}>{t.title}</div>
                        {t.deliverableUrl && (
                          <span style={{ display: "inline-block", marginTop: 8, background: "#E9C46A", color: INK, borderRadius: 999,
                            padding: "3px 9px", fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono'" }}>
                            {isPt ? "◆ PRONTO — TOCA PARA REVER" : "◆ READY — TAP TO REVIEW"}
                          </span>
                        )}
                      </Link>
                    );
                    if (!reorderable) return <div key={t.id}>{card}</div>;
                    const arrow = (dir: "up" | "down", label: string, disabled: boolean) => (
                      <form action={reorderBacklogTicket.bind(null, client.portalToken, t.id, dir)} style={{ flex: 1, display: "flex" }}>
                        <button type="submit" disabled={disabled} aria-label={dir === "up" ? "Move up" : "Move down"}
                          style={{ flex: 1, minHeight: 34, background: "transparent", color: disabled ? "#3a382f" : MUTE, border: `1px solid ${LINE}`,
                            borderRadius: 7, cursor: disabled ? "default" : "pointer", fontSize: 12, lineHeight: 1 }}>{label}</button>
                      </form>
                    );
                    return (
                      <div key={t.id} style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                        {card}
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 30, flex: "0 0 30px" }}>
                          {arrow("up", "▲", i === 0)}
                          {arrow("down", "▼", i === col.length - 1)}
                        </div>
                      </div>
                    );
                  })}
                  {col.length === 0 && <div style={{ fontSize: 12, color: MUTE, opacity: 0.4, padding: "8px 4px" }}>{isPt ? "vazio" : "empty"}</div>}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* account panel — below the board, no longer covering it */}
        {selfService && (
          <LockerAccount selfService={selfService} language={client.language} />
        )}
      </div>
    </div>
  );
}
