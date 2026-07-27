import { redirect, notFound } from "next/navigation";
import { getClientSession } from "@/lib/clientAuth";
import { getClientById, getTicket, getTicketFeedback, listTicketVersions, currentVersion, getSettings, slaHoursForPlan } from "@/lib/data";
import PortalTicketView from "@/components/PortalTicketView";

export const dynamic = "force-dynamic";

export default async function LockerRoomTicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const clientId = await getClientSession();
  if (!clientId) redirect("/enter");
  const [client, ticket] = await Promise.all([getClientById(clientId), getTicket(ticketId)]);
  if (!client) redirect("/enter");
  if (!ticket || ticket.clientId !== clientId) notFound(); // can only see own reps
  const [feedback, versions, settings] = await Promise.all([getTicketFeedback(ticketId), listTicketVersions(ticketId), getSettings()]);
  const back = client.language === "pt" ? "← O teu quadro" : "← Your board";

  return <PortalTicketView client={client} ticket={ticket} feedback={feedback} versions={versions}
    shown={currentVersion(versions)} slaHours={slaHoursForPlan(client.plan, settings)} backHref="/me" backLabel={back} />;
}
