import Link from "next/link";
import { listClients, getTimeStats, getRunningTimer, getUpNext, getWeeklyHours, getSettings, getArchivedClients } from "@/lib/data";
import StudioNav from "@/components/StudioNav";
import ClientsSection from "@/components/ClientsSection";
import WeekHoursChart from "@/components/WeekHoursChart";
import { Frame, Scanlines, DitherCorner } from "@/components/crt";
import { formatDuration, formatAgo } from "@/lib/tickets";
import { RunningBanner } from "@/components/LiveTimer";
import { DS } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ" };

const PRI = ["Normal", "High", "Urgent"];
const priColor = (p: number) => (p >= 2 ? DS.accent : p === 1 ? DS.amber : DS.mute);

export default async function Overview() {
  const [clients, stats, running, upNext, week, settings, archived] = await Promise.all([
    listClients(), getTimeStats(), getRunningTimer(), getUpNext(), getWeeklyHours(), getSettings(), getArchivedClients(),
  ]);
  const nowMs = Date.now();
  const slaHours = settings.slaHours;

  const attention = clients
    .filter((c) => c.oldestOpenAt && nowMs - new Date(c.oldestOpenAt).getTime() > slaHours * 3600 * 1000)
    .sort((a, b) => new Date(a.oldestOpenAt!).getTime() - new Date(b.oldestOpenAt!).getTime());

  const tiles = [
    { label: "Today", value: formatDuration(stats.todaySeconds) },
    { label: "This week", value: formatDuration(stats.weekSeconds) },
    { label: "In progress", value: String(stats.inProgressCount) },
    { label: "Queue depth", value: String(stats.queueDepth) },
    { label: "Awaiting client", value: String(stats.awaitingClient) },
    { label: "Avg turnaround", value: stats.avgTurnaroundSeconds ? formatDuration(stats.avgTurnaroundSeconds) : "—" },
  ];

  const mono = (extra: React.CSSProperties = {}) => ({ fontFamily: DS.mono, ...extra });

  return (
    <div style={{ display: "flex", background: DS.bg, minHeight: "100vh", color: DS.text }}>
      <Scanlines />
      <StudioNav active="overview" />
      <main style={{ flex: 1, minWidth: 0, padding: "34px 40px", maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        <DitherCorner />
        <div style={mono({ fontSize: 11, letterSpacing: 1.2, color: DS.mute })}>┌─ STUDIO / HQ ───────</div>
        <h1 style={{ fontFamily: DS.pixel, fontWeight: 700, fontSize: 56, letterSpacing: 1, textTransform: "uppercase",
          margin: "10px 0 30px", lineHeight: 1, color: DS.text }}>HQ</h1>

        {running && (
          <RunningBanner ticketId={running.ticketId} clientId={running.clientId} ticketTitle={running.ticketTitle}
            clientName={running.clientName} startedAt={running.startedAt} />
        )}

        {/* stat readout */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(172px, 1fr))", gap: 12, marginBottom: 16 }}>
          {tiles.map((t) => (
            <Frame key={t.label} pad={16}>
              <div style={mono({ fontSize: 10, letterSpacing: 0.8, color: DS.faint, marginBottom: 14 })}>[ {t.label.toUpperCase()} ]</div>
              <div style={{ fontFamily: DS.pixel, fontWeight: 600, fontSize: 30, letterSpacing: 0.5, color: DS.text }}>{t.value}</div>
            </Frame>
          ))}
        </div>

        {/* attention */}
        {attention.length > 0 && (
          <Frame accent={DS.accent} pad={16} style={{ marginBottom: 16, background: DS.accentSoft }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={mono({ color: DS.accent, fontSize: 11, letterSpacing: 1 })}>▓ ATTENTION</span>
              <span style={mono({ color: DS.mute, fontSize: 11.5 })}>waiting &gt; {slaHours}h for a delivery</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {attention.map((c) => (
                <Link key={c.id} href={`/client/${c.id}`}
                  style={{ display: "inline-flex", gap: 8, alignItems: "center", background: DS.bg, border: `1px solid ${DS.border}`,
                    padding: "5px 12px", fontSize: 12.5 }}>
                  <b>{c.name}</b>
                  <span style={mono({ fontSize: 11, color: DS.accent })}>{formatAgo(c.oldestOpenAt!, nowMs)}</span>
                </Link>
              ))}
            </div>
          </Frame>
        )}

        {/* up next + chart */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.25fr)", gap: 16, marginBottom: 36 }}>
          <Frame pad={20} style={{ display: "flex", flexDirection: "column" }}>
            <div style={mono({ fontSize: 10, letterSpacing: 0.8, color: DS.faint, marginBottom: 16 })}>[ ▸ UP NEXT ]</div>
            {upNext ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={mono({ fontSize: 10, color: priColor(upNext.priority), border: `1px solid ${priColor(upNext.priority)}`,
                    padding: "2px 9px", textTransform: "uppercase", letterSpacing: 0.5 })}>{PRI[upNext.priority] ?? "Normal"}</span>
                  <span style={mono({ fontSize: 11, color: upNext.status === "ready" ? DS.amber : DS.faint })}>
                    {upNext.status === "ready" ? "READY TO START" : "BACKLOG"}
                  </span>
                </div>
                <div style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 22, letterSpacing: -0.3, lineHeight: 1.15 }}>{upNext.title}</div>
                <div style={{ fontSize: 13, color: DS.mute, marginTop: 4 }}>{upNext.clientName}</div>
                <Link href={`/ticket/${upNext.ticketId}`}
                  style={{ marginTop: 20, alignSelf: "flex-start", background: DS.accent, color: DS.bg,
                    padding: "9px 16px", fontSize: 13, fontWeight: 700 }}>
                  Open ticket →
                </Link>
              </>
            ) : (
              <div style={{ color: DS.mute, fontSize: 14, margin: "auto 0" }}>Queue is clear — nothing waiting to start.</div>
            )}
          </Frame>

          <WeekHoursChart days={week} />
        </div>

        <ClientsSection clients={clients} nowMs={nowMs} archived={archived} />
      </main>
    </div>
  );
}
