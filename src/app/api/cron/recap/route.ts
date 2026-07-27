import { NextResponse, type NextRequest } from "next/server";
import { getSettings, listClientsForBilling, completedTicketsInRange } from "@/lib/data";
import * as mail from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Monthly recap. Vercel Cron hits this daily; it only acts on the 1st, emailing
   each active client a summary of everything delivered the previous month. */

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const force = req.nextUrl.searchParams.get("force") === "1";
  if (now.getDate() !== 1 && !force) return NextResponse.json({ skipped: "only runs on the 1st" });

  const settings = await getSettings();
  if (!settings.autoRecap) return NextResponse.json({ skipped: "monthly recap disabled" });

  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const startISO = start.toISOString(), endISO = end.toISOString();

  const clients = await listClientsForBilling();
  let sent = 0;
  for (const c of clients) {
    if (c.status === "paused") continue;
    const items = await completedTicketsInRange(c.id, startISO, endISO);
    if (items.length === 0) continue;
    const monthLabel = start.toLocaleDateString(c.language === "pt" ? "pt-PT" : "en-GB", { month: "long", year: "numeric" });
    await mail.emailMonthlyRecap(
      { name: c.name, email: c.email, portalToken: c.portalToken, language: c.language },
      monthLabel, items,
    );
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
