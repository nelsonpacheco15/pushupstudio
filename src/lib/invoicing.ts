import "server-only";
import { createInvoice, notify, planAmountFromSettings, type StudioSettings, type Invoice, type Lang } from "@/lib/data";
import { planFor, formatEUR } from "@/lib/billing";
import * as mail from "@/lib/email";

export interface Billable {
  id: string; name: string; email: string; language: Lang; portalToken: string;
  plan: string; paymentMethod: string;
}

/** Create + email + notify one monthly invoice for a client. Shared by the manual
    "issue invoice" action and the recurring cron. Best-effort on side channels. */
export async function issueMonthlyInvoice(
  client: Billable, settings: StudioSettings, periodLabel?: string,
): Promise<Invoice | null> {
  const amountCents = planAmountFromSettings(client.plan, settings);
  const method = client.paymentMethod === "stripe" ? "stripe" : "bank_transfer";
  const now = new Date();
  const label = periodLabel ?? now.toLocaleDateString(client.language === "pt" ? "pt-PT" : "en-GB", { month: "long", year: "numeric" });
  const dueAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const invoice = await createInvoice({ clientId: client.id, plan: client.plan, amountCents, method, periodLabel: label, dueAt });
  if (invoice) {
    await mail.emailInvoiceIssued({ ...invoice, clientName: client.name },
      { name: client.name, email: client.email, language: client.language, portalToken: client.portalToken },
      { issuer: { name: settings.legalName, iban: settings.iban, bank: settings.bank } });
    await notify({ audience: "client", clientId: client.id, type: "invoice",
      title: `Invoice ${invoice.number}`, body: `${planFor(client.plan).label} — ${formatEUR(amountCents)}`, link: "/me" });
  }
  return invoice;
}
