import { redirect } from "next/navigation";
import { getClientSession } from "@/lib/clientAuth";
import { getClientById, listTickets, listInvoicesForClient, listClientNotifications, getSettings, planAmountFromSettings } from "@/lib/data";
import { planFor, formatEUR } from "@/lib/billing";
import { stripeEnabled } from "@/lib/stripe";
import PortalBoard, { type BillingStrip, type SelfService } from "@/components/PortalBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Locker Room" };

export default async function LockerRoomPage() {
  const clientId = await getClientSession();
  if (!clientId) redirect("/enter");
  const client = await getClientById(clientId);
  if (!client) redirect("/enter");
  const [tickets, invoices, notifItems, settings] = await Promise.all([
    listTickets(client.id), listInvoicesForClient(client.id), listClientNotifications(client.id), getSettings(),
  ]);
  const notifications = { items: notifItems, unread: notifItems.filter((n) => !n.readAt).length };

  const plan = planFor(client.plan);
  const latest = invoices[0];
  const billing: BillingStrip = {
    planLabel: plan.label,
    amountLabel: formatEUR(planAmountFromSettings(client.plan, settings)),
    method: client.paymentMethod,
    status: latest?.status ?? "sent",
    // Card clients can pay only when Stripe is configured and there's an outstanding invoice.
    canPay: client.paymentMethod === "stripe" && stripeEnabled() && (!latest || latest.status === "sent"),
  };

  const selfService: SelfService | undefined = settings.clientSelfService ? {
    plan: client.plan,
    paused: client.status === "paused",
    growthLabel: `Growth · ${formatEUR(settings.growthCents)}`,
    scaleLabel: `Scale · ${formatEUR(settings.scaleCents)}`,
    invoices: invoices.slice(0, 6).map((inv) => ({
      id: inv.id, number: inv.number, periodLabel: inv.periodLabel, amountLabel: formatEUR(inv.amountCents), status: inv.status,
    })),
  } : undefined;

  return <PortalBoard client={client} tickets={tickets} ticketHrefBase="/me" showLogout billing={billing} notifications={notifications} selfService={selfService} />;
}
