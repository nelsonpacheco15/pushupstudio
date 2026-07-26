import "server-only";

/* Transactional email via Resend (https://resend.com). Every send is
   best-effort: if RESEND_API_KEY is missing or the call fails, it logs and
   returns — it must NEVER break the action that triggered it. */

const FROM = process.env.EMAIL_FROM || "PushUP Studio <onboarding@resend.dev>";
const STUDIO_EMAIL = process.env.STUDIO_EMAIL || "";
const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const ACCENT = "#D2452B";

async function send(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[email] send failed (${res.status}): ${detail.slice(0, 200)}`);
    }
  } catch (e) {
    console.warn("[email] error:", e);
  }
}

/** Shared branded shell. */
function layout(heading: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;margin-top:8px">${cta.label}</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f0e9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14130f">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="font-weight:800;letter-spacing:-0.5px;font-size:18px;margin-bottom:24px">PushUP <span style="color:${ACCENT}">Studio</span></div>
    <div style="background:#fff;border:1px solid #e7e3d8;border-radius:14px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
      <div style="font-size:14px;line-height:1.6;color:#3a3730">${bodyHtml}</div>
      ${button ? `<div style="margin-top:18px">${button}</div>` : ""}
    </div>
    <div style="font-size:11px;color:#8a8578;margin-top:18px">Sent by PushUP Studio</div>
  </div></body></html>`;
}

const portalUrl = (token: string) => `${APP_URL}/portal/${token}`;

interface ClientLite { name: string; email: string; portalToken: string; }

/* ---- client-facing ---- */

export async function emailClientWelcome(c: ClientLite): Promise<void> {
  await send(
    c.email,
    "Welcome to PushUP Studio",
    layout(
      `Welcome, ${c.name} 👋`,
      `You now have a private space with us. Use your board to send design requests — by voice or in writing — and follow every request from backlog to done, in real time.`,
      { label: "Open your board", url: portalUrl(c.portalToken) }
    )
  );
}

export async function emailRequestReceived(c: ClientLite, ticketTitle: string): Promise<void> {
  await send(
    c.email,
    "We got your request",
    layout(
      "Request received ✅",
      `Thanks, ${c.name}. We’ve logged your request <b>“${ticketTitle}”</b> and we’ll start on it shortly. You’ll get an email the moment it moves into progress.`,
      { label: "View your board", url: portalUrl(c.portalToken) }
    )
  );
}

export async function emailInProgress(c: ClientLite, ticketTitle: string): Promise<void> {
  await send(
    c.email,
    `We’re working on “${ticketTitle}”`,
    layout(
      "We’re on it right now ✍️",
      `Good news, ${c.name} — we’ve started on <b>“${ticketTitle}”</b>. We’ll let you know within the next few hours when it’s ready for your approval.`,
      { label: "Follow progress", url: portalUrl(c.portalToken) }
    )
  );
}

export async function emailReadyForReview(c: ClientLite, ticketTitle: string): Promise<void> {
  await send(
    c.email,
    `Ready for your approval: “${ticketTitle}”`,
    layout(
      "Ready for your approval 🎯",
      `<b>“${ticketTitle}”</b> is ready, ${c.name}. Take a look and let us know what you think — approve it or tell us what to change.`,
      { label: "Review it now", url: portalUrl(c.portalToken) }
    )
  );
}

export async function emailDone(c: ClientLite, ticketTitle: string): Promise<void> {
  await send(
    c.email,
    `Completed: “${ticketTitle}”`,
    layout(
      "All done ✨",
      `<b>“${ticketTitle}”</b> is complete, ${c.name}. Thanks for working with us — send your next request whenever you’re ready.`,
      { label: "Open your board", url: portalUrl(c.portalToken) }
    )
  );
}

/* ---- studio-facing (internal) ---- */

export async function emailStudioNewClient(name: string): Promise<void> {
  if (!STUDIO_EMAIL) return;
  await send(STUDIO_EMAIL, `New client added: ${name}`,
    layout("New client", `<b>${name}</b> was just added to the studio.`,
      { label: "Open studio", url: `${APP_URL}/` }));
}

export async function emailStudioNewRequest(clientName: string, ticketTitle: string): Promise<void> {
  if (!STUDIO_EMAIL) return;
  await send(STUDIO_EMAIL, `New request from ${clientName}`,
    layout("New request", `<b>${clientName}</b> submitted <b>“${ticketTitle}”</b>.`,
      { label: "Open studio", url: `${APP_URL}/` }));
}
