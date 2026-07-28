import "server-only";
import { getEmailFrom, getStudioEmailAddr, type Lang, type Invoice, type StudioSettings } from "@/lib/data";
import { formatEUR, planFor } from "@/lib/billing";

export interface InvoiceIssuer { name: string; iban: string; bank: string; }

/* Transactional email via Resend. Best-effort (no-ops without RESEND_API_KEY).
   Terminal-branded, table-based HTML, web-safe fonts, hosted white logo.
   Client-facing copy is localized to the client's language (en / pt). */

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const LOGO = "https://jsyxwuwmzgwlpstdcpkm.supabase.co/storage/v1/object/public/stylescape-images/brand/logo-white.png";

const BG = "#0B0B0D", CARD = "#131316", TXT = "#E9E7DE", MUT = "#8C887C", LINE = "#26262B", HL = "#FFFFFF";
const MONO = "'Courier New', ui-monospace, monospace";
const SANS = "Helvetica, Arial, sans-serif";

type Attachment = { filename: string; content: string }; // content = base64
async function send(to: string, subject: string, html: string, attachments?: Attachment[]): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;
  const from = await getEmailFrom(); // from-name/address comes from Settings (falls back to env)
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(attachments?.length ? { attachments } : {}) }),
    });
    if (!res.ok) console.warn(`[email] send failed (${res.status}): ${(await res.text().catch(() => "")).slice(0, 200)}`);
  } catch (e) { console.warn("[email] error:", e); }
}

const portalUrl = (token: string) => `${APP_URL}/portal/${token}`;
const ticketUrl = (token: string, ticketId?: string) => ticketId ? `${APP_URL}/portal/${token}/${ticketId}` : `${APP_URL}/portal/${token}`;

const nowDate = (lang: Lang) => new Date().toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", { day: "2-digit", month: "long", year: "numeric" });
const nowTime = (lang: Lang) => new Date().toLocaleTimeString(lang === "pt" ? "pt-PT" : "en-GB", { hour: "2-digit", minute: "2-digit" });

/* ---- chrome ---- */

function shell(inner: string, footerNote: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:30px 12px;"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;">
      <tr><td style="padding:2px 4px 20px;"><img src="${LOGO}" alt="PushUP Studio" height="20" style="height:20px;display:block;"/></td></tr>
      <tr><td style="background:${CARD};border:1px solid ${LINE};border-radius:6px;padding:32px 30px;">${inner}</td></tr>
      <tr><td align="center" style="padding:20px 0 8px;font-family:${MONO};font-size:14px;letter-spacing:6px;color:${LINE};">◆&nbsp;▚&nbsp;◇&nbsp;▪&nbsp;⌐&nbsp;¬&nbsp;◆&nbsp;▚&nbsp;◇&nbsp;▪&nbsp;⌐&nbsp;¬&nbsp;◆&nbsp;▚&nbsp;◇</td></tr>
      <tr><td align="center" style="padding:4px 0 10px;"><img src="${LOGO}" alt="PushUP Studio" height="15" style="height:15px;opacity:0.5;display:inline-block;"/></td></tr>
      <tr><td align="center" style="padding:2px 4px;font-family:${MONO};font-size:11px;letter-spacing:0.5px;color:${MUT};line-height:1.7;">
        ${footerNote}<br/><a href="${APP_URL}" style="color:${MUT};text-decoration:underline;">${APP_URL.replace(/^https?:\/\//, "")}</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
const heading = (t: string) => `<div style="font-family:${MONO};font-weight:bold;font-size:23px;letter-spacing:1px;color:${TXT};margin:0 0 14px;text-transform:uppercase;">${t}</div>`;
const para = (t: string) => `<div style="font-family:${SANS};font-size:15px;line-height:1.65;color:#CFCCC2;margin:0 0 14px;">${t}</div>`;
const button = (label: string, url: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 2px;"><tr><td style="background:${HL};border-radius:4px;"><a href="${url}" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:14px;font-weight:bold;color:${BG};text-decoration:none;">${label}</a></td></tr></table>`;
/** Escape user-controlled text before putting it in email HTML. */
const esc = (t: string) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bold = (t: string) => `<b style="color:${TXT};">${esc(t)}</b>`;

/* ---- onboarding progress (welcome email) ---- */
const STEP_LABELS: Record<Lang, string[]> = {
  en: ["Registration", "Onboarding", "WhatsApp channel", "Drive folder"],
  pt: ["Registo", "Onboarding", "Canal WhatsApp", "Pasta Drive"],
};
function progress(lang: Lang, doneCount: number): string {
  const cell = (label: string, i: number) => {
    const done = i < doneCount;
    const box = done
      ? `<span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;background:${HL};color:${BG};font-family:${MONO};font-weight:bold;font-size:12px;">✓</span>`
      : `<span style="display:inline-block;width:22px;height:22px;line-height:20px;text-align:center;border:1px solid ${LINE};color:${MUT};font-family:${MONO};font-size:12px;">${i + 1}</span>`;
    return `<td width="25%" align="center" style="padding:0 2px;">${box}<div style="font-family:${MONO};font-size:9.5px;letter-spacing:0.3px;color:${done ? TXT : MUT};margin-top:8px;text-transform:uppercase;">${label}</div></td>`;
  };
  const label = lang === "pt" ? "[ ONBOARDING ]" : "[ ONBOARDING ]";
  return `<div style="font-family:${MONO};font-size:10px;letter-spacing:1px;color:${MUT};margin:24px 0 12px;">${label}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${STEP_LABELS[lang].map((s, i) => cell(s, i)).join("")}</tr></table>`;
}

export interface ClientLite { name: string; email: string; portalToken: string; language: Lang; }
const footer: Record<Lang, string> = { en: "[ SENT BY PushUP STUDIO ]", pt: "[ ENVIADO PELA PushUP STUDIO ]" };

/* ============================ client-facing ============================ */

/** Invite email prompting the client/seat to set their own password + access the dashboard. */
export async function emailSetupInvite(opts: { email: string; name: string; clientName: string; setupUrl: string; language: Lang }): Promise<void> {
  if (!opts.email) return;
  const L = opts.language;
  const t = L === "pt"
    ? { subject: `Cria o teu acesso — ${opts.clientName}`, h: "Bem-vindo — cria o teu acesso",
        p: `Olá${opts.name ? ` ${opts.name}` : ""}, foste adicionado ao espaço de ${bold(opts.clientName)} na PushUP. Define a tua palavra-passe para entrares no teu dashboard e começares a criar pedidos.`,
        cta: "Definir palavra-passe e entrar",
        note: "Este link é pessoal — não o partilhes." }
    : { subject: `Set up your access — ${opts.clientName}`, h: "Welcome — set up your access",
        p: `Hi${opts.name ? ` ${opts.name}` : ""}, you've been added to ${bold(opts.clientName)}'s space on PushUP. Set your password to open your dashboard and start creating requests.`,
        cta: "Set password & open dashboard",
        note: "This link is personal — please don't share it." };
  await send(opts.email, t.subject,
    shell(heading(t.h) + para(t.p) + button(t.cta, opts.setupUrl) + para(`<span style="font-size:13px;color:${MUT};">${t.note}</span>`), footer[L]));
}

export async function emailClientWelcome(c: ClientLite): Promise<void> {
  const L = c.language;
  const t = {
    en: {
      subject: "Welcome to PushUP Studio",
      h: `Welcome, ${c.name}`,
      p1: `You now have access to your private space where you can create requests. Every request will be ready for you within ${bold("48h")}. So create your request, sit back, and we'll do the work for you in the background.`,
      pun: `Time to give your brand a workout — you send the reps, we do the heavy lifting. 💪`,
      cta: "Open your board",
      note: "Registration is done. We'll walk you through onboarding, set up your WhatsApp channel, and share your Drive folder next.",
    },
    pt: {
      subject: "Bem-vindo à PushUP Studio",
      h: `Bem-vindo, ${c.name}`,
      p1: `Já tens acesso ao teu espaço privado onde podes criar pedidos. Cada pedido fica pronto em até ${bold("48h")}. Então cria o teu pedido, descontrai, e nós tratamos de tudo nos bastidores.`,
      pun: `Está na hora de dar treino à tua marca — tu fazes os pedidos, nós fazemos o esforço. 💪`,
      cta: "Abrir o teu quadro",
      note: "O registo está feito. A seguir tratamos do onboarding, do teu canal de WhatsApp e da tua pasta no Drive.",
    },
  }[L];
  await send(c.email, t.subject,
    shell(heading(t.h) + para(t.p1) + para(t.pun) + button(t.cta, portalUrl(c.portalToken)) + progress(L, 1) +
      para(`<span style="font-size:13px;color:${MUT};">${t.note}</span>`), footer[L]));
}

export async function emailRequestReceived(c: ClientLite, ticketTitle: string, ticketId?: string): Promise<void> {
  const t = {
    en: { subject: "We got your request", h: "Request received",
      p: `Thank you for your request. We'll start working on it as soon as possible — and the moment we do, you'll be notified. You can also follow the progress in real time in your dashboard.`, cta: "Open your request" },
    pt: { subject: "Recebemos o teu pedido", h: "Pedido recebido",
      p: `Obrigado pelo teu pedido. Vamos começar a trabalhar nele o mais rápido possível — e assim que começarmos, serás notificado. Podes também acompanhar o progresso em tempo real no teu dashboard.`, cta: "Abrir o teu pedido" },
  }[c.language];
  await send(c.email, t.subject, shell(heading(t.h) + para(t.p) + button(t.cta, ticketUrl(c.portalToken, ticketId)), footer[c.language]));
}

export async function emailInProgress(c: ClientLite, ticketTitle: string, ticketId?: string): Promise<void> {
  const L = c.language;
  const t = {
    en: { subject: `We're working on "${ticketTitle}"`, h: "We're on it",
      p: `Good news — your request is moving. We started on ${bold(ticketTitle)} on ${bold(nowDate(L))} at ${bold(nowTime(L))}. We'll let you know in a few hours when it's ready. Sit back and get ready to see your design!`, cta: "Follow progress" },
    pt: { subject: `Estamos a trabalhar em "${ticketTitle}"`, h: "Estamos a tratar disso",
      p: `Boas notícias — o teu pedido está a avançar. Começámos ${bold(ticketTitle)} em ${bold(nowDate(L))} às ${bold(nowTime(L))}. Avisamos-te dentro de algumas horas quando estiver pronto. Descontrai e prepara-te para ver o teu design!`, cta: "Acompanhar progresso" },
  }[L];
  await send(c.email, t.subject, shell(heading(t.h) + para(t.p) + button(t.cta, ticketUrl(c.portalToken, ticketId)), footer[L]));
}

export async function emailReadyForReview(c: ClientLite, ticketTitle: string, ticketId?: string): Promise<void> {
  const t = {
    en: { subject: `Ready for your approval: "${ticketTitle}"`, h: "Ready for approval",
      p: `Your ${bold(ticketTitle)} is ready, ${c.name}. Take a look and tell us what you think.`, cta: "Review it now" },
    pt: { subject: `Pronto para aprovação: "${ticketTitle}"`, h: "Pronto para aprovação",
      p: `O teu ${bold(ticketTitle)} está pronto, ${c.name}. Dá uma vista de olhos e diz-nos o que achas.`, cta: "Rever agora" },
  }[c.language];
  await send(c.email, t.subject, shell(heading(t.h) + para(t.p) + button(t.cta, ticketUrl(c.portalToken, ticketId)), footer[c.language]));
}

/** Sent when the studio uploads a revised design (v2+) after a change request. */
export async function emailNewVersion(c: ClientLite, ticketTitle: string, version: number, changeNote?: string, ticketId?: string): Promise<void> {
  const L = c.language;
  const t = {
    en: { subject: `New version ready: "${ticketTitle}" (v${version})`, h: "New version ready",
      p: `We've applied the changes you asked for, ${c.name}. Version ${bold(`v${version}`)} of ${bold(ticketTitle)} is ready to review.`,
      yourReq: "Your request", cta: "Review the new version" },
    pt: { subject: `Nova versão pronta: "${ticketTitle}" (v${version})`, h: "Nova versão pronta",
      p: `Aplicámos as alterações que pediste, ${c.name}. A versão ${bold(`v${version}`)} de ${bold(ticketTitle)} está pronta para reveres.`,
      yourReq: "O teu pedido", cta: "Rever a nova versão" },
  }[L];
  const noteBlock = changeNote
    ? para(`<span style="font-family:${MONO};font-size:12px;color:${MUT};">[ ${t.yourReq} ]</span><br/><span style="border-left:2px solid ${LINE};padding-left:12px;display:inline-block;color:#CFCCC2;">${esc(changeNote)}</span>`)
    : "";
  await send(c.email, t.subject, shell(heading(t.h) + para(t.p) + noteBlock + button(t.cta, ticketUrl(c.portalToken, ticketId)), footer[L]));
}

export async function emailDone(c: ClientLite, ticketTitle: string, ticketId?: string): Promise<void> {
  const L = c.language;
  const t = {
    en: { subject: `Completed: "${ticketTitle}"`, h: "All done",
      p: `Hello ${c.name}, your request ${bold(ticketTitle)} was completed on ${bold(nowDate(L))}. Thank you for working with us — together we make an amazing team!`, cta: "Open your request" },
    pt: { subject: `Concluído: "${ticketTitle}"`, h: "Está tudo pronto",
      p: `Olá ${c.name}, o teu pedido ${bold(ticketTitle)} foi concluído em ${bold(nowDate(L))}. Obrigado por trabalhares connosco — juntos formamos uma equipa incrível!`, cta: "Abrir o teu pedido" },
  }[L];
  await send(c.email, t.subject, shell(heading(t.h) + para(t.p) + button(t.cta, ticketUrl(c.portalToken, ticketId)), footer[L]));
}

/** Monthly recap: everything delivered for the client last month. */
export async function emailMonthlyRecap(c: ClientLite, monthLabel: string, items: string[]): Promise<void> {
  if (!c.email || items.length === 0) return;
  const L = c.language;
  const t = L === "pt"
    ? { subject: `O teu mês na PushUP — ${monthLabel}`, h: "O teu mês em revista",
        p: `Olá ${c.name}, aqui está tudo o que criámos para ti em ${bold(monthLabel)} — ${bold(String(items.length))} ${items.length === 1 ? "entrega" : "entregas"}. Obrigado por continuares a puxar connosco! 💪`,
        cta: "Abrir o teu Locker Room" }
    : { subject: `Your month at PushUP — ${monthLabel}`, h: "Your month in review",
        p: `Hi ${c.name}, here's everything we made for you in ${bold(monthLabel)} — ${bold(String(items.length))} ${items.length === 1 ? "delivery" : "deliveries"}. Thanks for keeping the reps coming! 💪`,
        cta: "Open your Locker Room" };
  const list = items.map((title) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${TXT};">✓ ${esc(title)}</td></tr>`).join("");
  const body = heading(t.h) + para(t.p) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 12px;">${list}</table>` +
    button(t.cta, portalUrl(c.portalToken));
  await send(c.email, t.subject, shell(body, footer[L]));
}

/* ============================ studio / admin ============================ */

export async function emailStudioNewClient(name: string, company?: string, language?: Lang): Promise<void> {
  const STUDIO_EMAIL = await getStudioEmailAddr();
  if (!STUDIO_EMAIL) return;
  const meta = `${company ? `${company} · ` : ""}${(language ?? "en").toUpperCase()}`;
  await send(STUDIO_EMAIL, `New client: ${name}`,
    shell(heading("New client") + para(`${bold(name)} was just added to the studio.`) +
      para(`<span style="font-family:${MONO};font-size:12px;color:${MUT};">[ ${meta} ]</span>`) +
      button("Open studio", `${APP_URL}/`), footer.en));
}

export async function emailStudioNewRequest(clientName: string, ticketTitle: string): Promise<void> {
  const STUDIO_EMAIL = await getStudioEmailAddr();
  if (!STUDIO_EMAIL) return;
  await send(STUDIO_EMAIL, `New request from ${clientName}`,
    shell(heading("New request") + para(`${bold(clientName)} just submitted a new request:`) +
      para(`<span style="font-family:${MONO};font-size:15px;color:${TXT};border-left:2px solid ${HL};padding-left:12px;display:inline-block;">${esc(ticketTitle)}</span>`) +
      button("Open studio", `${APP_URL}/`), footer.en));
}

/* ============================== invoices =============================== */

function invoiceRow(label: string, value: string, strong = false): string {
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid ${LINE};font-family:${MONO};font-size:12px;color:${MUT};">${label}</td>
    <td style="padding:9px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:${strong ? 16 : 14}px;font-weight:${strong ? "bold" : "normal"};color:${TXT};text-align:right;">${value}</td>
  </tr>`;
}

function invoiceBody(inv: Invoice, lang: Lang): string {
  const plan = planFor(inv.plan);
  const due = inv.dueAt ? new Date(inv.dueAt).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "";
  const t = lang === "pt"
    ? { plan: "Plano", period: "Período", total: "Total a pagar", due: "Data limite", issued: "Emitida" }
    : { plan: "Plan", period: "Period", total: "Amount due", due: "Due", issued: "Issued" };
  let rows = invoiceRow(t.plan, `${plan.label} — ${lang === "pt" ? "design por subscrição" : "subscription design"}`);
  rows += invoiceRow(t.period, inv.periodLabel);
  rows += invoiceRow(t.issued, new Date(inv.issuedAt).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", { day: "2-digit", month: "long", year: "numeric" }));
  if (due) rows += invoiceRow(t.due, due);
  rows += invoiceRow(t.total, formatEUR(inv.amountCents), true);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;">${rows}</table>`;
}

function bankBlock(inv: Invoice, lang: Lang, issuer: InvoiceIssuer): string {
  const t = lang === "pt"
    ? { title: "PAGAMENTO POR TRANSFERÊNCIA", ref: "Referência", iban: "IBAN", bank: "Banco", name: "Beneficiário", note: "Usa a referência acima na transferência." }
    : { title: "PAY BY BANK TRANSFER", ref: "Reference", iban: "IBAN", bank: "Bank", name: "Beneficiary", note: "Use the reference above on your transfer." };
  const line = (k: string, v: string) => v ? `<div style="font-family:${MONO};font-size:12.5px;color:${TXT};margin:4px 0;">${k}: <span style="color:${MUT};">${v}</span></div>` : "";
  return `<div style="background:${BG};border:1px solid ${LINE};border-radius:4px;padding:16px 18px;margin:6px 0 4px;">
    <div style="font-family:${MONO};font-size:11px;letter-spacing:1px;color:${MUT};margin-bottom:8px;">[ ${t.title} ]</div>
    ${line(t.name, issuer.name)}${line(t.iban, issuer.iban)}${line(t.bank, issuer.bank)}${line(t.ref, inv.number)}
    <div style="font-family:${SANS};font-size:12.5px;color:${MUT};margin-top:8px;">${t.note}</div>
  </div>`;
}

/** Email the invoice (with a PDF attached) to the client AND to the studio. */
export async function emailInvoiceIssued(
  inv: Invoice,
  client: { name: string; email: string; language: Lang; portalToken: string },
  opts?: { payUrl?: string; issuer?: InvoiceIssuer; settings?: StudioSettings },
): Promise<void> {
  const issuer = opts?.issuer ?? { name: "PushUP Design", iban: "", bank: "" };
  const L = client.language;
  const plan = planFor(inv.plan);
  const t = L === "pt"
    ? { subject: `Fatura ${inv.number} · PushUP`, h: `Fatura ${inv.number}`,
        p: `Olá ${client.name}, aqui está a fatura do teu plano ${bold(plan.label)} (${formatEUR(inv.amountCents)}/mês). A fatura em PDF está em anexo.`,
        pay: "Pagar com cartão", view: "Ver no Locker Room" }
    : { subject: `Invoice ${inv.number} · PushUP`, h: `Invoice ${inv.number}`,
        p: `Hi ${client.name}, here's your invoice for the ${bold(plan.label)} plan (${formatEUR(inv.amountCents)}/mo). The PDF invoice is attached.`,
        pay: "Pay by card", view: "View in your Locker Room" };
  const payUrl = opts?.payUrl || `${APP_URL}/me`;
  const cta = inv.method === "stripe"
    ? button(t.pay, payUrl)
    : bankBlock(inv, L, issuer) + button(t.view, `${APP_URL}/me`);
  const html = shell(heading(t.h) + para(t.p) + invoiceBody(inv, L) + cta, footer[L]);

  // Generate the branded PDF invoice and attach it.
  let attachments: { filename: string; content: string }[] | undefined;
  if (opts?.settings) {
    try {
      const { buildInvoicePdf } = await import("@/lib/invoicePdf");
      const bytes = await buildInvoicePdf(inv, { name: client.name, company: inv.clientName, email: client.email, language: L }, opts.settings);
      attachments = [{ filename: `${inv.number}.pdf`, content: Buffer.from(bytes).toString("base64") }];
    } catch (e) { console.warn("[invoice pdf] failed:", (e as Error).message); }
  }
  await send(client.email, t.subject, html, attachments);

  const STUDIO_EMAIL = await getStudioEmailAddr();
  if (STUDIO_EMAIL) {
    const meta = `${inv.clientName || client.name} · ${plan.label} · ${formatEUR(inv.amountCents)} · ${inv.method === "stripe" ? "CARD" : "BANK TRANSFER"}`;
    await send(STUDIO_EMAIL, `Invoice ${inv.number} — ${client.name}`,
      shell(heading(`Invoice ${inv.number}`) + para(`Issued to ${bold(client.name)}.`) +
        para(`<span style="font-family:${MONO};font-size:12px;color:${MUT};">[ ${meta} ]</span>`) +
        invoiceBody({ ...inv, clientName: undefined }, "en") + button("Open billing", `${APP_URL}/billing`), footer.en), attachments);
  }
}
