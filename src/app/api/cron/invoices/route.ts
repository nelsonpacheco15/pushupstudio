import { NextResponse, type NextRequest } from "next/server";
import { getSettings, listClientsForBilling, hasInvoiceForPeriod } from "@/lib/data";
import { issueMonthlyInvoice } from "@/lib/invoicing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Recurring monthly invoices. Vercel Cron hits this daily; it issues each
   bank-transfer client's invoice once on/after their anniversary day-of-month,
   guarded so a client is never billed twice in the same month. Card (Stripe)
   clients are billed by Stripe, so they're skipped here.

   Secure by setting CRON_SECRET — Vercel then sends `Authorization: Bearer <secret>`. */

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();
  if (!settings.autoInvoice) return NextResponse.json({ skipped: "auto-invoicing disabled in settings" });

  const now = new Date();
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const clients = await listClientsForBilling();

  let issued = 0;
  const results: string[] = [];
  for (const c of clients) {
    if (c.status === "paused") continue; // paused subscription — don't bill
    if (c.paymentMethod === "stripe") continue; // Stripe handles recurring billing
    const created = c.createdAt ? new Date(c.createdAt) : null;
    const anchor = created ? Math.min(created.getDate(), daysInMonth) : 1;
    if (day < anchor) continue; // not their billing day yet this month

    const label = now.toLocaleDateString(c.language === "pt" ? "pt-PT" : "en-GB", { month: "long", year: "numeric" });
    if (await hasInvoiceForPeriod(c.id, label)) continue; // already billed this month

    const inv = await issueMonthlyInvoice(c, settings, label);
    if (inv) { issued++; results.push(`${c.name}:${inv.number}`); }
  }

  return NextResponse.json({ ok: true, issued, results });
}
