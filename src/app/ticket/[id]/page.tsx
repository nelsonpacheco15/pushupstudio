import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTicket, getClientById, getTicketTimeEntries, getTicketTotalSeconds,
  getRunningTimer, getStylescapeForTicket, listUnattachedStylescapes, getTicketFeedback,
  listTicketVersions, currentVersion, getSettings, slaHoursForPlan, listTicketAttachments,
} from "@/lib/data";
import { STATUS_LABELS, STATUS_DOT, formatDuration, driveEmbed } from "@/lib/tickets";
import { TimerButton } from "@/components/LiveTimer";
import TicketActions from "@/components/TicketActions";
import VersionManager from "@/components/VersionManager";
import { createStylescapeForTicket, attachStylescapeToTicket } from "@/app/actions";
import { INK, PANEL, LINE, ACCENT, MUTE, PAPER, ghostBtn } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicket(id);
  return { title: ticket?.title ? `${ticket.title} · Rep` : "Rep" };
}

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
  const attachments = await listTicketAttachments(id);
  const settings = await getSettings();
  // Per-plan turnaround SLA: target = created + plan hours; badge while still open.
  const slaHours = client ? slaHoursForPlan(client.plan, settings) : 0;
  const targetMs = new Date(ticket.createdAt).getTime() + slaHours * 3600 * 1000;
  const openStatus = ticket.status !== "done";
  const hoursLeft = (targetMs - Date.now()) / 3600000;
  const slaBadge = openStatus && slaHours > 0
    ? (hoursLeft < 0
        ? { text: `OVERDUE ${Math.round(-hoursLeft)}h`, color: "#D2452B" }
        : { text: `DUE IN ${Math.max(0, Math.round(hoursLeft))}h`, color: hoursLeft < slaHours * 0.25 ? "#9C988C" : "#7FB77E" })
    : null;
  const shown = currentVersion(versions);
  const embed = driveEmbed(shown?.url ?? ticket.deliverableUrl);
  const isRunning = running?.ticketId === id;
  const completedTotal = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);

  const PRI = ["Normal", "High", "Urgent"];
  // Meta chips shown at the top of the brief.
  const chips: [string, string][] = [
    ["Type", ticket.form.type],
    ["Priority", PRI[ticket.priority] ?? "Normal"],
    ["Deadline", ticket.form.deadline],
    ["From", ticket.createdBy === "client" ? (client?.name ?? "Client") : "Studio"],
  ].filter(([, v]) => v) as [string, string][];
  // Template/extra answers (any form key beyond the standard ones).
  const details: [string, string][] = Object.entries(ticket.form)
    .filter(([k, v]) => !["type", "deadline", "references", "src"].includes(k) && v) as [string, string][];
  const references = ticket.form.references;

  return (
    <div style={{ minHeight: "100vh", background: INK, color: PAPER }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 26px", borderBottom: `1px solid ${LINE}` }}>
        <Link href={`/client/${ticket.clientId}`} style={{ color: MUTE, fontSize: 13 }}>← {client?.name ?? "Client"}</Link>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: STATUS_DOT[ticket.status] }} />
          {STATUS_LABELS[ticket.status]}
        </span>
        {slaBadge && (
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10.5, letterSpacing: 0.5, color: slaBadge.color,
            border: `1px solid ${slaBadge.color}`, padding: "3px 8px", borderRadius: 4 }}>
            {slaBadge.text}
          </span>
        )}
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

        {/* the brief — what the designer works from */}
        <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 20, marginBottom: 18 }}>
          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, letterSpacing: 1, color: MUTE, marginBottom: 14 }}>THE BRIEF</div>

          {/* meta chips */}
          {chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: ticket.description || details.length ? 16 : 0 }}>
              {chips.map(([k, v]) => (
                <span key={k} style={{ display: "inline-flex", alignItems: "baseline", gap: 6, background: INK, border: `1px solid ${LINE}`,
                  borderRadius: 999, padding: "5px 12px", fontSize: 12.5 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9.5, letterSpacing: 0.5, color: MUTE, textTransform: "uppercase" }}>{k}</span>
                  <span style={{ color: PAPER, fontWeight: 600 }}>{v}</span>
                </span>
              ))}
            </div>
          )}

          {/* the request text */}
          {ticket.description
            ? <div style={{ fontSize: 15, color: "#e6e2d7", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{ticket.description}</div>
            : <div style={{ fontSize: 13.5, color: MUTE, fontStyle: "italic" }}>No written brief — check the attachments and details.</div>}

          {/* extra structured answers */}
          {details.length > 0 && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
              {details.map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 12, padding: "5px 0", fontSize: 13.5 }}>
                  <span style={{ minWidth: 120, color: MUTE, fontFamily: "'IBM Plex Mono'", fontSize: 12 }}>{k}</span>
                  <span style={{ color: PAPER }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* reference links */}
          {references && (
            <div style={{ marginTop: 14, fontSize: 13 }}>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE, marginRight: 8 }}>LINKS</span>
              {references.split(/[\s,]+/).filter(Boolean).map((r, i) => (
                <a key={i} href={/^https?:\/\//.test(r) ? r : `https://${r}`} target="_blank" rel="noreferrer"
                  style={{ color: ACCENT, textDecoration: "underline", marginRight: 12, wordBreak: "break-all" }}>{r}</a>
              ))}
            </div>
          )}
        </div>

        {/* attachments the client sent */}
        {attachments.length > 0 && (
          <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 20, marginBottom: 18 }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, letterSpacing: 1, color: MUTE, marginBottom: 14 }}>
              ATTACHMENTS · {attachments.length}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
              {attachments.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                  style={{ display: "block", border: `1px solid ${LINE}`, borderRadius: 8, overflow: "hidden", background: INK }}>
                  {a.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.name} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: MUTE }}>⤓</div>
                  )}
                  <div style={{ padding: "6px 8px", fontSize: 10.5, color: MUTE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'IBM Plex Mono'" }}>{a.name || "file"}</div>
                </a>
              ))}
            </div>
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
          <VersionManager ticketId={id} versions={versions}
            changeNote={feedback.find((f) => f.decision === "changes")?.note || undefined} />
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
