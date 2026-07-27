import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTicket, getClientById, getTicketTimeEntries, getTicketTotalSeconds,
  getRunningTimer, getStylescapeForTicket, listUnattachedStylescapes, getTicketFeedback,
  listTicketVersions, currentVersion,
} from "@/lib/data";
import { STATUS_LABELS, STATUS_DOT, formatDuration, driveEmbed } from "@/lib/tickets";
import { TimerButton } from "@/components/LiveTimer";
import TicketActions from "@/components/TicketActions";
import VersionManager from "@/components/VersionManager";
import { createStylescapeForTicket, attachStylescapeToTicket } from "@/app/actions";
import { INK, PANEL, LINE, ACCENT, MUTE, PAPER, ghostBtn } from "@/lib/theme";

export const dynamic = "force-dynamic";

const STYLESCAPE_TYPE = "Brand / Stylescape";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();
  const isStylescapeTicket = ticket.form.type === STYLESCAPE_TYPE;
  const [client, entries, total, running, stylescape, unattached, feedback, versions] = await Promise.all([
    getClientById(ticket.clientId),
    getTicketTimeEntries(id),
    getTicketTotalSeconds(id),
    getRunningTimer(),
    getStylescapeForTicket(id),
    isStylescapeTicket ? listUnattachedStylescapes(ticket.clientId) : Promise.resolve([]),
    getTicketFeedback(id),
    listTicketVersions(id),
  ]);
  const shown = currentVersion(versions);
  const embed = driveEmbed(shown?.url ?? ticket.deliverableUrl);
  const isRunning = running?.ticketId === id;
  const completedTotal = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);

  const intake: [string, string][] = [
    ["Type", ticket.form.type],
    ["Deadline", ticket.form.deadline],
    ["References", ticket.form.references],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div style={{ minHeight: "100vh", background: INK, color: PAPER }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 26px", borderBottom: `1px solid ${LINE}` }}>
        <Link href={`/client/${ticket.clientId}`} style={{ color: MUTE, fontSize: 13 }}>← {client?.name ?? "Client"}</Link>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: STATUS_DOT[ticket.status] }} />
          {STATUS_LABELS[ticket.status]}
        </span>
      </div>

      <div style={{ padding: 26, maxWidth: 760, margin: "0 auto" }}>
        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 28 }}>{ticket.title}</div>
        {ticket.createdBy === "client" && (
          <div style={{ fontSize: 12, color: MUTE, marginTop: 4 }}>Requested by the client</div>
        )}

        {/* timer + status */}
        <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, margin: "18px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE }}>TIME TRACKED</div>
            <TimerButton ticketId={id} clientId={ticket.clientId} running={isRunning}
              totalSeconds={completedTotal} runningSince={isRunning ? running!.startedAt : null} />
          </div>
          <TicketActions ticketId={id} clientId={ticket.clientId} status={ticket.status} />
        </div>

        {/* intake */}
        {(intake.length > 0 || ticket.description) && (
          <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE, marginBottom: 12 }}>REQUEST</div>
            {intake.map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 12, padding: "5px 0", fontSize: 13.5 }}>
                <span style={{ width: 90, color: MUTE }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
            {ticket.description && <div style={{ fontSize: 13.5, color: "#cfcabb", marginTop: 10, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ticket.description}</div>}
          </div>
        )}

        {/* stylescape deliverable — only for stylescape-type tickets */}
        {isStylescapeTicket && (
          <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE, marginBottom: 12 }}>STYLESCAPE</div>
            {stylescape ? (
              <Link href={`/build/${stylescape.id}`} style={{ color: ACCENT, fontWeight: 600, fontSize: 14 }}>
                Open “{stylescape.title}” →
              </Link>
            ) : (
              <div>
                <form action={createStylescapeForTicket.bind(null, id)}>
                  <button type="submit" style={{ background: ACCENT, color: INK, border: "none", borderRadius: 7,
                    padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    + Build a new stylescape
                  </button>
                </form>
                {unattached.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, color: MUTE, marginBottom: 8 }}>…or attach an existing one for this client:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {unattached.map((s) => (
                        <form key={s.id} action={attachStylescapeToTicket.bind(null, s.id, id)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <span style={{ fontSize: 13 }}>{s.title}</span>
                          <button type="submit" style={{ ...ghostBtn, padding: "6px 12px", fontSize: 12 }}>Attach</button>
                        </form>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* deliverable — the design the client reviews */}
        <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE, marginBottom: 12 }}>
            DESIGN VERSIONS · GOOGLE DRIVE{shown ? ` · showing v${shown.version}` : ""}
          </div>
          <VersionManager ticketId={id} versions={versions} />
          {embed && (
            <iframe src={embed} title="Design preview"
              style={{ width: "100%", height: 420, border: `1px solid ${LINE}`, borderRadius: 8, marginTop: 14, background: "#000" }} />
          )}
          <div style={{ fontSize: 12, color: MUTE, marginTop: 10 }}>
            Each change request adds a new version. The client sees the latest (or the one they accepted) and can rate + approve / request changes. Drive links must be shared “Anyone with the link · Viewer”.
          </div>
        </div>

        {/* client feedback */}
        {feedback.length > 0 && (
          <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE, marginBottom: 4 }}>CLIENT FEEDBACK</div>
            {feedback.map((f) => (
              <div key={f.id} style={{ borderTop: `1px solid ${LINE}`, padding: "12px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {f.score != null && <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18, color: ACCENT }}>{f.score}/10</span>}
                  {f.decision && <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, letterSpacing: 0.5, color: ACCENT }}>{f.decision === "approved" ? "✓ APPROVED" : "↻ CHANGES REQUESTED"}</span>}
                  <span style={{ marginLeft: "auto", fontSize: 11, color: MUTE }}>{new Date(f.createdAt).toLocaleString()}</span>
                </div>
                {f.note && <div style={{ fontSize: 13, color: "#cfcabb", marginTop: 8, lineHeight: 1.5 }}>{f.note}</div>}
              </div>
            ))}
          </div>
        )}

        {/* time log */}
        {entries.length > 0 && (
          <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE, marginBottom: 12 }}>
              TIME LOG · {formatDuration(total)} total
            </div>
            {entries.map((e) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                borderTop: `1px solid ${LINE}`, fontSize: 12.5 }}>
                <span style={{ color: MUTE }}>{new Date(e.startedAt).toLocaleString()}</span>
                <span style={{ fontFamily: "'IBM Plex Mono'" }}>
                  {e.durationSeconds != null ? formatDuration(e.durationSeconds) : "running…"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
