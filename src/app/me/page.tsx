import { redirect } from "next/navigation";
import { getClientSession } from "@/lib/clientAuth";
import { getClientById, listTickets, listInvoicesForClient } from "@/lib/data";
import { planFor, formatEUR } from "@/lib/billing";
import { stripeEnabled } from "@/lib/stripe";
import PortalBoard, { type BillingStrip } from "@/components/PortalBoard";

export const dynamic = "force-dynamic";

export default async function LockerRoomPage() {
  const clientId = await getClientSession();
  if (!clientId) redirect("/enter");
  const client = await getClientById(clientId);
  if (!client) redirect("/enter");
  const [tickets, invoices] = await Promise.all([listTickets(client.id), listInvoicesForClient(client.id)]);

  const plan = planFor(client.plan);
  const latest = invoices[0];
  const billing: BillingStrip = {
    planLabel: plan.label,
    amountLabel: formatEUR(plan.amountCents),
    method: client.paymentMethod,
    status: latest?.status ?? "sent",
    // Card clients can pay only when Stripe is configured and there's an outstanding invoice.
    canPay: client.paymentMethod === "stripe" && stripeEnabled() && (!latest || latest.status === "sent"),
  };

  return <PortalBoard client={client} tickets={tickets} ticketHrefBase="/me" showLogout billing={billing} />;
}
