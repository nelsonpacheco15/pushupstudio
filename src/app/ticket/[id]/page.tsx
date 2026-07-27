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
const mono = (extra: React.CSSProperties = {}) => ({ fontFamily: "'IBM Plex Mono'", ...extra });
const sectionLabel = (extra: React.CSSProperties = {}) => mono({ fontSize: 11, letterSpacing: 1, color: MUTE, ...extra });

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
  const chips: [string, string][] = [
    ["Type", ticket.form.type],
    ["Priority", PRI[ticket.priority] ?? "Normal"],
    ["Deadline", ticket.form.deadline],
    ["From", ticket.createdBy === "client" ? (client?.name ?? "Client") : "Studio"],
  ].filter(([, v]) => v) as [string, string][];
  const details: [string, string][] = Object.entries(ticket.form)
    .filter(([k, v]) => !["type", "deadline", "references", "src"].includes(k) && v) as [string, string][];
  const references = ticket.form.references;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: INK, color: PAPER, overflow: "hidden" }}>
      {/* ---- top bar ---- */}
      <header style={{ flex: "0 0 auto", height: 58, display: "flex", alignItems: "center", gap: 14, padding: "0 20px", borderBottom: `1px solid ${LINE}` }}>
        <Link href={`/client/${ticket.clientId}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, color: PAPER, fontSize: 13, fontWeight: 600,
            border: `1px solid ${LINE}`, borderRadius: 8, padding: "7px 13px" }}>
          ← {client?.name ?? "Board"}
        </Link>
        <span style={sectionLabel({ fontSize: 10.5, color: "#57544C" })}>THE CIRCUIT / REP</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, ...mono({ fontSize: 11, color: MUTE }) }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: STATUS_DOT[ticket.status] }} />
            {STATUS_LABELS[ticket.status]}
          </span>
          {slaBadge && (
            <span style={mono({ fontSize: 10.5, letterSpacing: 0.5, color: slaBadge.color, border: `1px solid ${slaBadge.color}`, padding: "3px 8px", borderRadius: 4 })}>
              {slaBadge.text}
            </span>
          )}
          <TimerButton ticketId={id} clientId={ticket.clientId} running={isRunning}
            totalSeconds={completedTotal} runningSince={isRunning ? running!.startedAt : null} />
        </div>
      </header>

      {/* ---- two panes ---- */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* LEFT — the brief */}
        <aside style={{ width: 460, flex: "0 0 460px", overflowY: "auto", borderRight: `1px solid ${LINE}`,
          background: `linear-gradient(165deg, #141416 0%, ${INK} 55%)`, padding: "28px 26px 40px" }}>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 27, lineHeight: 1.15 }}>{ticket.title}</div>
          <div style={{ fontSize: 12, color: MUTE, marginTop: 6 }}>
            {ticket.createdBy === "client" ? "Requested by the client" : "Created in studio"} · {new Date(ticket.createdAt).toLocaleDateString()}
          </div>

          {/* status control */}
          <div style={{ margin: "20px 0", padding: "14px 0", borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
            <div style={sectionLabel({ marginBottom: 10 })}>STATUS</div>
            <TicketActions ticketId={id} clientId={ticket.clientId} status={ticket.status} />
          </div>

          {/* meta chips */}
          {chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {chips.map(([k, v]) => (
                <span key={k} style={{ display: "inline-flex", alignItems: "baseline", gap: 6, background: PANEL, border: `1px solid ${LINE}`,
                  borderRadius: 999, padding: "5px 12px", fontSize: 12.5 }}>
                  <span style={mono({ fontSize: 9.5, letterSpacing: 0.5, color: MUTE, textTransform: "uppercase" })}>{k}</span>
                  <span style={{ color: PAPER, fontWeight: 600 }}>{v}</span>
                </span>
              ))}
            </div>
          )}

          {/* brief text */}
          <div style={sectionLabel({ marginBottom: 10 })}>THE BRIEF</div>
          {ticket.description
            ? <div style={{ fontSize: 14.5, color: "#e6e2d7", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{ticket.description}</div>
            : <div style={{ fontSize: 13.5, color: MUTE, fontStyle: "italic" }}>No written brief — check the attachments and details.</div>}

          {/* structured details */}
          {details.length > 0 && (
            <div style={{ marginTop: 18, borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
              <div style={sectionLabel({ marginBottom: 8 })}>DETAILS</div>
              {details.map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 12, padding: "5px 0", fontSize: 13.5 }}>
                  <span style={{ minWidth: 120, color: MUTE, ...mono({ fontSize: 12 }) }}>{k}</span>
                  <span style={{ color: PAPER }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* reference links */}
          {references && (
            <div style={{ marginTop: 18, borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
              <div style={sectionLabel({ marginBottom: 8 })}>LINKS</div>
              {references.split(/[\s,]+/).filter(Boolean).map((r, i) => (
                <a key={i} href={/^https?:\/\//.test(r) ? r : `https://${r}`} target="_blank" rel="noreferrer"
                  style={{ display: "block", color: ACCENT, textDecoration: "underline", fontSize: 13, marginBottom: 5, wordBreak: "break-all" }}>{r}</a>
              ))}
            </div>
          )}

          {/* stylescape */}
          {isStylescapeTicket && (
            <div style={{ marginTop: 18, borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
              <div style={sectionLabel({ marginBottom: 10 })}>STYLESCAPE</div>
              {stylescape ? (
                <Link href={`/build/${stylescape.id}`} style={{ color: ACCENT, fontWeight: 600, fontSize: 14 }}>Open “{stylescape.title}” →</Link>
              ) : (
                <div>
                  <form action={createStylescapeForTicket.bind(null, id)}>
                    <button type="submit" style={{ background: ACCENT, color: INK, border: "none", borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Build a new stylescape</button>
                  </form>
                  {unattached.length > 0 && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                      {unattached.map((s) => (
                        <form key={s.id} action={attachStylescapeToTicket.bind(null, s.id, id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <span style={{ fontSize: 13 }}>{s.title}</span>
                          <button type="submit" style={{ ...ghostBtn, padding: "6px 12px", fontSize: 12 }}>Attach</button>
                        </form>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* time log */}
          {entries.length > 0 && (
            <div style={{ marginTop: 18, borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
              <div style={sectionLabel({ marginBottom: 10 })}>TIME LOG · {formatDuration(total)}</div>
              {entries.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, color: MUTE }}>
                  <span>{new Date(e.startedAt).toLocaleDateString()} {new Date(e.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span style={mono()}>{e.durationSeconds != null ? formatDuration(e.durationSeconds) : "running…"}</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* RIGHT — design, attachments, revisions */}
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "26px 30px 44px" }}>
          {/* design versions + preview */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={sectionLabel()}>DESIGN{shown ? ` · SHOWING v${shown.version}` : ""}</div>
          </div>
          <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, marginBottom: 22 }}>
            <VersionManager ticketId={id} versions={versions}
              changeNote={feedback.find((f) => f.decision === "changes")?.note || undefined} />
            {embed ? (
              <iframe src={embed} title="Design preview"
                style={{ width: "100%", height: "62vh", minHeight: 380, border: `1px solid ${LINE}`, borderRadius: 8, marginTop: 16, background: "#000" }} />
            ) : (
              <div style={{ marginTop: 16, height: 220, border: `1px dashed ${LINE}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: MUTE, fontSize: 13 }}>
                Paste a Google Drive link above to attach the design.
              </div>
            )}
            <div style={{ fontSize: 11.5, color: MUTE, marginTop: 10 }}>
              Each change request adds a version. The client sees the latest (or the one they accepted). Drive links must be shared “Anyone with the link · Viewer”.
            </div>
          </div>

          {/* attachments */}
          {attachments.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={sectionLabel({ marginBottom: 12 })}>CLIENT ATTACHMENTS · {attachments.length}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                {attachments.map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                    style={{ display: "block", border: `1px solid ${LINE}`, borderRadius: 10, overflow: "hidden", background: PANEL }}>
                    {a.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt={a.name} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: MUTE }}>⤓</div>
                    )}
                    <div style={{ padding: "7px 9px", fontSize: 10.5, color: MUTE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...mono() }}>{a.name || "file"}</div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* client feedback / revisions log */}
          {feedback.length > 0 && (
            <div>
              <div style={sectionLabel({ marginBottom: 12 })}>REVISIONS &amp; FEEDBACK</div>
              <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18 }}>
                {feedback.map((f, i) => (
                  <div key={f.id} style={{ padding: "12px 0", borderTop: i === 0 ? "none" : `1px solid ${LINE}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {f.score != null && <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18, color: ACCENT }}>{f.score}/10</span>}
                      {f.decision && <span style={mono({ fontSize: 11, letterSpacing: 0.5, color: f.decision === "approved" ? "#7FB77E" : "#9C988C" })}>{f.decision === "approved" ? "✓ APPROVED" : "↻ CHANGES REQUESTED"}</span>}
                      <span style={{ marginLeft: "auto", fontSize: 11, color: MUTE }}>{new Date(f.createdAt).toLocaleString()}</span>
                    </div>
                    {f.note && <div style={{ fontSize: 13.5, color: "#cfcabb", marginTop: 8, lineHeight: 1.55 }}>{f.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
