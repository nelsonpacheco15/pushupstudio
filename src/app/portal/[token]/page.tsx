import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientByPortalToken, listTickets } from "@/lib/data";
import { STATUSES, STATUS_LABELS, STATUS_DOT, type TicketStatus } from "@/lib/tickets";
import RequestPanel from "@/components/RequestPanel";
import { INK, PANEL, LINE, MUTE, PAPER } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await getClientByPortalToken(token);
  if (!client) notFound();
  const tickets = await listTickets(client.id);
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
          <div style={{ fontWeight: 700, fontSize: 22,
            fontFamily: client.brandFont ? `'${client.brandFont}', 'Bricolage Grotesque'` : "'Bricolage Grotesque'" }}>{client.name}</div>
          <div style={{ fontSize: 12.5, color: MUTE }}>Your requests and how they’re progressing · {open} open</div>
        </div>
      </div>

      <div style={{ padding: 26, maxWidth: 1200, margin: "0 auto", display: "grid", gap: 26,
        gridTemplateColumns: "minmax(0, 1fr) 360px" }}>
        {/* board */}
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}>
          {STATUSES.map((status: TicketStatus) => {
            const col = tickets.filter((t) => t.status === status);
            return (
              <div key={status} style={{ width: 220, flex: "0 0 220px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: STATUS_DOT[status] }} />
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{STATUS_LABELS[status]}</span>
                  <span style={{ color: MUTE, fontFamily: "'IBM Plex Mono'", fontSize: 12 }}>{col.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.map((t) => (
                    <Link key={t.id} href={`/portal/${token}/${t.id}`}
                      style={{ display: "block", background: PANEL, border: `1px solid ${t.deliverableUrl ? PAPER : LINE}`, borderRadius: 10, padding: 12 }}>
                      {t.form?.type && <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono'", color: MUTE }}>{t.form.type}</div>}
                      <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 3 }}>{t.title}</div>
                      {t.deliverableUrl && <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono'", color: PAPER, marginTop: 6 }}>◆ design ready — tap to review</div>}
                    </Link>
                  ))}
                  {col.length === 0 && <div style={{ fontSize: 12, color: MUTE, opacity: 0.5 }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* request form */}
        <div>
          <RequestPanel clientId={client.id} portalToken={client.portalToken} />
        </div>
      </div>
    </div>
  );
}
