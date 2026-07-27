import Link from "next/link";
import { clientLogout, startClientCheckout, reorderBacklogTicket, clientChangePlan, clientTogglePause, type NotifFeed } from "@/app/actions";
import { STATUSES, STATUS_LABELS, STATUS_DOT, type TicketStatus, type Ticket } from "@/lib/tickets";
import type { ClientRecord } from "@/lib/data";
import NewRequestButton from "@/components/NewRequestButton";
import NotificationBell from "@/components/NotificationBell";
import { INK, PANEL, LINE, MUTE, PAPER } from "@/lib/theme";

export interface BillingStrip {
  planLabel: string; amountLabel: string; method: string; status: string; canPay: boolean;
}

export interface SelfService {
  plan: string; paused: boolean;
  growthLabel: string; scaleLabel: string;
  invoices: { number: string; periodLabel: string; amountLabel: string; status: string }[];
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

  return (
    <div style={{ minHeight: "100vh", background: INK, color: PAPER }}>
      <div style={{ height: 4, background: client.brandColor }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 26px", borderBottom: `1px solid ${LINE}` }}>
        {client.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: `1px solid ${LINE}` }} />
        )}
        <div>
          <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono'", letterSpacing: 2, color: MUTE, textTransform: "uppercase" }}>Locker Room</div>
          <div style={{ fontWeight: 700, fontSize: 22, marginTop: 2,
            fontFamily: client.brandFont ? `'${client.brandFont}', 'Bricolage Grotesque'` : "'Bricolage Grotesque'" }}>{client.name}</div>
          <div style={{ fontSize: 12.5, color: MUTE }}>Your reps and how they’re progressing · {open} open</div>
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

      <div style={{ padding: 26, maxWidth: 1440, margin: "0 auto" }}>
        {/* board — full width, the main focus */}
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}>
          {STATUSES.map((status: TicketStatus) => {
            const col = tickets.filter((t) => t.status === status);
            if (status === "backlog") col.sort((a, b) => a.position - b.position);
            const reorderable = status === "backlog" && col.length > 1;
            return (
              <div key={status} style={{ width: 220, flex: "0 0 220px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: STATUS_DOT[status] }} />
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{STATUS_LABELS[status]}</span>
                  <span style={{ color: MUTE, fontFamily: "'IBM Plex Mono'", fontSize: 12 }}>{col.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.map((t, i) => {
                    const card = (
                      <Link href={`${ticketHrefBase}/${t.id}`}
                        style={{ display: "block", flex: 1, minWidth: 0, background: PANEL, border: `1px solid ${t.deliverableUrl ? PAPER : LINE}`, borderRadius: 10, padding: 12 }}>
                        {t.form?.type && <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono'", color: MUTE }}>{t.form.type}</div>}
                        <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 3 }}>{t.title}</div>
                        {t.deliverableUrl && <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono'", color: PAPER, marginTop: 6 }}>◆ design ready — tap to review</div>}
                      </Link>
                    );
                    if (!reorderable) return <div key={t.id}>{card}</div>;
                    const arrow = (dir: "up" | "down", label: string, disabled: boolean) => (
                      <form action={reorderBacklogTicket.bind(null, client.portalToken, t.id, dir)} style={{ flex: 1, display: "flex" }}>
                        <button type="submit" disabled={disabled} title={dir === "up" ? "Move up" : "Move down"}
                          style={{ flex: 1, background: "transparent", color: disabled ? "#3a382f" : MUTE, border: `1px solid ${LINE}`,
                            borderRadius: 6, cursor: disabled ? "default" : "pointer", fontSize: 11, lineHeight: 1, padding: "2px 0" }}>{label}</button>
                      </form>
                    );
                    return (
                      <div key={t.id} style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                        {card}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 22 }}>
                          {arrow("up", "▲", i === 0)}
                          {arrow("down", "▼", i === col.length - 1)}
                        </div>
                      </div>
                    );
                  })}
                  {col.length === 0 && <div style={{ fontSize: 12, color: MUTE, opacity: 0.5 }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* account panel — below the board, no longer covering it */}
        {selfService && (
          <div style={{ marginTop: 24, maxWidth: 560 }}>
            <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, color: MUTE, marginBottom: 12 }}>[ YOUR PLAN ]</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {(["growth", "scale"] as const).map((p) => {
                  const on = selfService.plan === p;
                  const label = p === "growth" ? selfService.growthLabel : selfService.scaleLabel;
                  return (
                    <form key={p} action={clientChangePlan.bind(null, p)} style={{ flex: 1 }}>
                      <button type="submit" disabled={on}
                        style={{ width: "100%", cursor: on ? "default" : "pointer", borderRadius: 8, padding: "10px 8px",
                          border: `1px solid ${on ? PAPER : LINE}`, background: on ? PAPER : "transparent", color: on ? INK : PAPER,
                          fontSize: 12.5, fontWeight: 700, fontFamily: "'IBM Plex Mono'" }}>
                        {label}{on ? " ✓" : ""}
                      </button>
                    </form>
                  );
                })}
              </div>
              <form action={clientTogglePause}>
                <button type="submit" style={{ width: "100%", background: "transparent", color: selfService.paused ? "#7FB77E" : MUTE,
                  border: `1px solid ${LINE}`, borderRadius: 8, padding: "8px", fontSize: 12, cursor: "pointer", fontFamily: "'IBM Plex Mono'" }}>
                  {selfService.paused ? "▶ Resume subscription" : "⏸ Pause subscription"}
                </button>
              </form>
              {selfService.paused && <div style={{ fontSize: 11, color: MUTE, marginTop: 8 }}>Your subscription is paused — no new invoices until you resume.</div>}

              {selfService.invoices.length > 0 && (
                <>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, color: MUTE, margin: "16px 0 8px" }}>[ INVOICES ]</div>
                  {selfService.invoices.map((inv) => (
                    <div key={inv.number} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: `1px solid ${LINE}`, fontSize: 12 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono'", color: PAPER }}>{inv.number}</span>
                      <span style={{ color: MUTE, flex: 1 }}>{inv.periodLabel}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono'" }}>{inv.amountLabel}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: inv.status === "paid" ? "#7FB77E" : MUTE }}>{inv.status.toUpperCase()}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
