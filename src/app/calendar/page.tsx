import Link from "next/link";
import StudioNav from "@/components/StudioNav";
import { Scanlines } from "@/components/crt";
import { listAllTickets } from "@/lib/data";
import { STATUS_DOT, type TicketStatus } from "@/lib/tickets";
import { DS } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar" };

const mono = (extra: React.CSSProperties = {}) => ({ fontFamily: DS.mono, ...extra });
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const now = new Date();
  const [yy, mm] = (m && /^\d{4}-\d{2}$/.test(m)) ? m.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const year = yy, monthIdx = mm - 1;

  const tickets = await listAllTickets();
  // index reps by due-date (parseable deadline) and deliveries (done → updatedAt)
  const byDay = new Map<string, { id: string; title: string; client: string; status: string; kind: "due" | "delivered" }[]>();
  const push = (key: string, v: { id: string; title: string; client: string; status: string; kind: "due" | "delivered" }) => {
    if (!byDay.has(key)) byDay.set(key, []); byDay.get(key)!.push(v);
  };
  for (const t of tickets) {
    if (t.deadline) { const d = new Date(t.deadline); if (!isNaN(d.getTime())) push(ymd(d), { id: t.id, title: t.title, client: t.clientName, status: t.status, kind: "due" }); }
    if (t.status === "done" && t.updatedAt) { const d = new Date(t.updatedAt); if (!isNaN(d.getTime())) push(ymd(d), { id: t.id, title: t.title, client: t.clientName, status: t.status, kind: "delivered" }); }
  }

  const first = new Date(year, monthIdx, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const prev = monthIdx === 0 ? `${year - 1}-12` : `${year}-${String(monthIdx).padStart(2, "0")}`;
  const next = monthIdx === 11 ? `${year + 1}-01` : `${year}-${String(monthIdx + 2).padStart(2, "0")}`;
  const todayKey = ymd(now);

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, color: DS.text, display: "flex" }}>
      <Scanlines />
      <StudioNav active="calendar" />
      <main style={{ flex: 1, minWidth: 0, padding: "34px 40px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={mono({ fontSize: 11, letterSpacing: 1.2, color: DS.mute })}>┌─ STUDIO / CALENDAR ───────</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "10px 0 24px" }}>
          <h1 style={{ fontFamily: DS.pixel, fontWeight: 700, fontSize: 44, letterSpacing: 1, textTransform: "uppercase", margin: 0, lineHeight: 1 }}>
            {MONTHS[monthIdx]} {year}
          </h1>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Link href={`/calendar?m=${prev}`} style={{ ...mono({ fontSize: 13 }), border: `1px solid ${DS.border}`, borderRadius: 8, padding: "7px 12px", color: DS.text }}>← Prev</Link>
            <Link href="/calendar" style={{ ...mono({ fontSize: 13 }), border: `1px solid ${DS.border}`, borderRadius: 8, padding: "7px 12px", color: DS.text }}>Today</Link>
            <Link href={`/calendar?m=${next}`} style={{ ...mono({ fontSize: 13 }), border: `1px solid ${DS.border}`, borderRadius: 8, padding: "7px 12px", color: DS.text }}>Next →</Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: DS.border, border: `1px solid ${DS.border}`, borderRadius: 8, overflow: "hidden" }}>
          {DOW.map((d) => (
            <div key={d} style={{ background: DS.bg2, padding: "8px 10px", ...mono({ fontSize: 10, letterSpacing: 1, color: DS.faint }) }}>{d.toUpperCase()}</div>
          ))}
          {cells.map((day, i) => {
            const key = day ? ymd(new Date(year, monthIdx, day)) : "";
            const items = day ? (byDay.get(key) ?? []) : [];
            const isToday = key === todayKey;
            return (
              <div key={i} style={{ background: DS.card, minHeight: 104, padding: 8, opacity: day ? 1 : 0.35 }}>
                {day && (
                  <>
                    <div style={{ ...mono({ fontSize: 11 }), color: isToday ? DS.bg : DS.faint, marginBottom: 6,
                      ...(isToday ? { background: DS.accent, borderRadius: 999, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" } : {}) }}>{day}</div>
                    {items.slice(0, 4).map((it) => (
                      <Link key={it.kind + it.id} href={`/ticket/${it.id}`}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 5px", marginBottom: 3, borderRadius: 5,
                          background: DS.card2, fontSize: 10.5, color: DS.text, overflow: "hidden" }}>
                        <span style={{ width: 6, height: 6, borderRadius: 999, flex: "0 0 6px", background: it.kind === "delivered" ? "#7FB77E" : STATUS_DOT[it.status as TicketStatus] }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                      </Link>
                    ))}
                    {items.length > 4 && <div style={{ ...mono({ fontSize: 9.5, color: DS.faint }) }}>+{items.length - 4} more</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 14, ...mono({ fontSize: 11, color: DS.mute }) }}>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: DS.amber, marginRight: 6 }} />Due date</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: "#7FB77E", marginRight: 6 }} />Delivered</span>
        </div>
      </main>
    </div>
  );
}
