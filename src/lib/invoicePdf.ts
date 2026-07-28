import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Invoice, StudioSettings } from "@/lib/data";
import { planFor, formatEUR } from "@/lib/billing";
import { PUSHUP_LOGO_PNG_B64 } from "@/lib/invoiceLogo";

const INK = rgb(0.04, 0.04, 0.05);
const MUTE = rgb(0.45, 0.44, 0.4);
const LINE = rgb(0.85, 0.84, 0.8);

/** Build a branded A4 PDF invoice. Returns raw PDF bytes. */
export async function buildInvoicePdf(
  inv: Invoice,
  client: { name: string; company?: string; email?: string; language: "en" | "pt" },
  settings: StudioSettings,
): Promise<Uint8Array> {
  const pt = client.language === "pt";
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28;
  const M = 52; // margin
  let y = 792;

  // The standard PDF font only encodes WinAnsi (Latin-1 + €); strip emoji / other symbols.
  const safe = (s: string) => (s || "").replace(/[^\x00-\xFF€]/g, "");
  const text = (s: string, x: number, yy: number, size: number, f = font, color = INK) =>
    page.drawText(safe(s), { x, y: yy, size, font: f, color });
  const right = (s: string, xRight: number, yy: number, size: number, f = font, color = INK) => {
    const clean = safe(s);
    const w = f.widthOfTextAtSize(clean, size);
    page.drawText(clean, { x: xRight - w, y: yy, size, font: f, color });
  };

  // --- brand mark: the real PushUP logo (lime square, black UP) ---
  let logoW = 0;
  try {
    const png = await doc.embedPng(Buffer.from(PUSHUP_LOGO_PNG_B64, "base64"));
    const size = 34;
    page.drawImage(png, { x: M, y: y - size + 8, width: size, height: size });
    logoW = size + 12;
  } catch { logoW = 0; }
  text("PushUP Design", M + logoW, y - 4, 17, bold);
  text(settings.legalName || "PushUP Design", M + logoW, y - 20, 9, font, MUTE);
  if (settings.vat) text(`${pt ? "NIF" : "VAT"}: ${settings.vat}`, M + logoW, y - 31, 9, font, MUTE);
  if (settings.address) text(settings.address, M + logoW, y - 42, 9, font, MUTE);

  // --- invoice meta (right) ---
  right(pt ? "FATURA" : "INVOICE", W - M, y, 22, bold);
  right(inv.number, W - M, y - 22, 11, bold, MUTE);
  const d = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(pt ? "pt-PT" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  right(`${pt ? "Emitida" : "Issued"}: ${d(inv.issuedAt)}`, W - M, y - 40, 9, font, MUTE);
  right(`${pt ? "Vencimento" : "Due"}: ${d(inv.dueAt)}`, W - M, y - 52, 9, font, MUTE);

  y -= 84;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: LINE });
  y -= 26;

  // --- bill to ---
  text(pt ? "FATURAR A" : "BILL TO", M, y, 8, bold, MUTE);
  y -= 15;
  text(client.name, M, y, 13, bold);
  y -= 15;
  if (client.company && client.company !== client.name) { text(client.company, M, y, 10, font, MUTE); y -= 13; }
  if (client.email) { text(client.email, M, y, 10, font, MUTE); y -= 13; }

  // --- line items table ---
  y -= 22;
  text(pt ? "DESCRIÇÃO" : "DESCRIPTION", M, y, 8, bold, MUTE);
  right(pt ? "VALOR" : "AMOUNT", W - M, y, 8, bold, MUTE);
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: LINE });
  y -= 22;

  const plan = planFor(inv.plan);
  const desc = pt
    ? `Subscrição mensal · ${inv.periodLabel} · Plano ${plan.label}`
    : `Monthly subscription · ${inv.periodLabel} · ${plan.label} Plan`;
  text(desc, M, y, 11, font, INK);
  right(formatEUR(inv.amountCents), W - M, y, 11, font, INK);
  y -= 20;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: LINE });
  y -= 24;

  // --- total ---
  right(pt ? "TOTAL A PAGAR" : "TOTAL DUE", W - M - 130, y, 10, bold, MUTE);
  right(formatEUR(inv.amountCents), W - M, y, 16, bold, INK);
  y -= 44;

  // --- bank transfer details ---
  if (inv.method !== "stripe" && (settings.iban || settings.bank)) {
    page.drawRectangle({ x: M, y: y - 66, width: W - 2 * M, height: 78, borderColor: LINE, borderWidth: 1, color: rgb(0.98, 0.97, 0.95) });
    let by = y - 4;
    text(pt ? "PAGAMENTO POR TRANSFERÊNCIA" : "PAY BY BANK TRANSFER", M + 14, by, 8, bold, MUTE);
    by -= 16;
    const kv = (k: string, v: string) => { if (!v) return; text(`${k}:`, M + 14, by, 9.5, bold, INK); text(v, M + 90, by, 9.5, font, INK); by -= 14; };
    kv(pt ? "Beneficiário" : "Beneficiary", settings.legalName || "PushUP Design");
    kv("IBAN", settings.iban);
    kv(pt ? "Banco" : "Bank", settings.bank);
    kv(pt ? "Referência" : "Reference", inv.number);
    y -= 90;
  }

  // --- footer ---
  const appUrl = (process.env.APP_URL || "").replace(/^https?:\/\//, "");
  page.drawLine({ start: { x: M, y: 70 }, end: { x: W - M, y: 70 }, thickness: 0.8, color: LINE });
  text(pt ? "Obrigado por trabalhares com a PushUP Design." : "Thank you for working with PushUP Design.", M, 54, 9, font, MUTE);
  if (appUrl) right(appUrl, W - M, 54, 9, font, MUTE);

  return doc.save();
}
