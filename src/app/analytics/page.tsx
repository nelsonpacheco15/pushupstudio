import StudioNav from "@/components/StudioNav";
import { Scanlines, DitherCorner } from "@/components/crt";
import { getTimeStats, listClients, listInvoices, listAllTickets, getSettings, planAmountFromSettings } from "@/lib/data";
import { formatEUR } from "@/lib/billing";
import { formatDuration } from "@/lib/tickets";
import { DS } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

const mono = (extra: React.CSSProperties = {}) => ({ fontFamily: DS.mono, ...extra });
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: DS.radius, padding: 20 }}>{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={mono({ fontSize: 10, letterSpacing: 1, color: DS.faint, marginBottom: 14 })}>[ {children} ]</div>;
}

export default async function AnalyticsPage() {
  const [stats, clients, invoices, tickets, settings] = await Promise.all([
    getTimeStats(), listClients(), listInvoices(), listAllTickets(), getSettings(),
  ]);
  const now = new Date();
  const inMonth = (iso: string) => { const d = new Date(iso); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); };

  const activeClients = clients.filter((c) => c.status !== "paused");
  const mrr = activeClients.reduce((s, c) => s + planAmountFromSettings(c.plan, settings), 0);
  const paidThisYear = invoices.filter((i) => i.status === "paid" && new Date(i.issuedAt).getFullYear() === now.getFullYear()).reduce((s, i) => s + i.amountCents, 0);
  const outstanding = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.amountCents, 0);

  const createdThisMonth = tickets.filter((t) => inMonth(t.createdAt)).length;
  const deliveredThisMonth = tickets.filter((t) => t.status === "done" && inMonth(t.updatedAt)).length;

  const statusCounts: Record<string, number> = {};
  for (const t of tickets) statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  const STATUS_ORDER: [string, string][] = [["backlog", "Backlog"], ["ready", "Ready"], ["in_progress", "In progress"], ["review", "Review"], ["done", "Done"]];
  const maxStatus = Math.max(1, ...Object.values(statusCounts));

  const hoursPerClient = [...clients].sort((a, b) => b.monthSeconds - a.monthSeconds).filter((c) => c.monthSeconds > 0).slice(0, 12);
  const maxHours = Math.max(1, ...hoursPerClient.map((c) => c.monthSeconds));

  const tiles = [
    { label: "MRR", value: formatEUR(mrr) },
    { label: "Active athletes", value: String(activeClients.length) },
    { label: "Reps this month", value: String(createdThisMonth) },
    { label: "Delivered this month", value: String(deliveredThisMonth) },
    { label: "Hours this month", value: formatDuration(stats.monthSeconds) },
    { label: "Avg turnaround", value: stats.avgTurnaroundSeconds ? formatDuration(stats.avgTurnaroundSeconds) : "—" },
    { label: "Outstanding", value: formatEUR(outstanding) },
    { label: "Paid this year", value: formatEUR(paidThisYear) },
  ];

  // per-client monthly breakdown
  const breakdown = clients.map((c) => ({
    name: c.name,
    delivered: tickets.filter((t) => t.clientId === c.id && t.status === "done" && inMonth(t.updatedAt)).length,
    created: tickets.filter((t) => t.clientId === c.id && inMonth(t.createdAt)).length,
    hours: c.monthSeconds,
    revenue: c.status !== "paused" ? planAmountFromSettings(c.plan, settings) : 0,
  })).filter((b) => b.created || b.delivered || b.hours || b.revenue).sort((a, b) => b.hours - a.hours);

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, color: DS.text, display: "flex" }}>
      <Scanlines />
      <StudioNav active="analytics" />
      <main style={{ flex: 1, minWidth: 0, padding: "34px 40px", maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        <DitherCorner />
        <div style={mono({ fontSize: 11, letterSpacing: 1.2, color: DS.mute })}>┌─ STUDIO / ANALYTICS ───────</div>
        <h1 style={{ fontFamily: DS.pixel, fontWeight: 700, fontSize: 52, letterSpacing: 1, textTransform: "uppercase", margin: "10px 0 26px", lineHeight: 1 }}>Analytics</h1>

        <div className="grid-collapse-2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {tiles.map((t) => (
            <div key={t.label} style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: DS.radius, padding: "16px 18px" }}>
              <div style={mono({ fontSize: 9.5, letterSpacing: 1, color: DS.faint })}>[ {t.label.toUpperCase()} ]</div>
              <div style={{ fontFamily: DS.pixel, fontSize: 26, color: DS.text, marginTop: 8 }}>{t.value}</div>
            </div>
          ))}
        </div>

        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          <Card>
            <Label>REQUEST VOLUME BY STAGE</Label>
            {STATUS_ORDER.map(([k, label]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{ width: 90, fontSize: 12.5, color: DS.mute }}>{label}</span>
                <div style={{ flex: 1, height: 8, background: DS.bg2, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${((statusCounts[k] || 0) / maxStatus) * 100}%`, height: "100%", background: DS.accent }} />
                </div>
                <span style={mono({ fontSize: 12, color: DS.text, width: 30, textAlign: "right" })}>{statusCounts[k] || 0}</span>
              </div>
            ))}
          </Card>
          <Card>
            <Label>HOURS PER ATHLETE · THIS MONTH</Label>
            {hoursPerClient.length === 0 && <div style={{ color: DS.mute, fontSize: 13 }}>No time tracked yet this month.</div>}
            {hoursPerClient.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 9 }}>
                <span style={{ width: 110, fontSize: 12.5, color: DS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                <div style={{ flex: 1, height: 8, background: DS.bg2, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(c.monthSeconds / maxHours) * 100}%`, height: "100%", background: DS.amber }} />
                </div>
                <span style={mono({ fontSize: 11.5, color: DS.mute, width: 60, textAlign: "right" })}>{formatDuration(c.monthSeconds)}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* MONTHLY BREAKDOWN */}
        <Card>
          <Label>MONTHLY BREAKDOWN · {MONTHS[now.getMonth()].toUpperCase()} {now.getFullYear()}</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 100px", gap: 10, padding: "8px 0",
            borderBottom: `1px solid ${DS.border}`, ...mono({ fontSize: 10, letterSpacing: 0.5, color: DS.faint }) }}>
            <div>ATHLETE</div><div style={{ textAlign: "right" }}>REQUESTED</div><div style={{ textAlign: "right" }}>DELIVERED</div><div style={{ textAlign: "right" }}>HOURS</div><div style={{ textAlign: "right" }}>REVENUE</div>
          </div>
          {breakdown.map((b) => (
            <div key={b.name} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 100px", gap: 10, padding: "10px 0", borderBottom: `1px solid ${DS.border}`, alignItems: "center", fontSize: 13 }}>
              <div style={{ color: DS.text }}>{b.name}</div>
              <div style={{ textAlign: "right", color: DS.mute, ...mono() }}>{b.created}</div>
              <div style={{ textAlign: "right", color: b.delivered ? "#7FB77E" : DS.mute, ...mono() }}>{b.delivered}</div>
              <div style={{ textAlign: "right", color: DS.text, ...mono() }}>{formatDuration(b.hours)}</div>
              <div style={{ textAlign: "right", color: DS.text, ...mono() }}>{b.revenue ? formatEUR(b.revenue) : "—"}</div>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 100px", gap: 10, padding: "12px 0 2px", ...mono({ fontSize: 13, color: DS.text }) }}>
            <div style={{ letterSpacing: 0.5 }}>TOTAL</div>
            <div style={{ textAlign: "right" }}>{createdThisMonth}</div>
            <div style={{ textAlign: "right", color: "#7FB77E" }}>{deliveredThisMonth}</div>
            <div style={{ textAlign: "right" }}>{formatDuration(stats.monthSeconds)}</div>
            <div style={{ textAlign: "right" }}>{formatEUR(mrr)}</div>
          </div>
        </Card>
      </main>
    </div>
  );
}
