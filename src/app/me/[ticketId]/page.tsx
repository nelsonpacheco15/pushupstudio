import { redirect, notFound } from "next/navigation";
import { getClientSession } from "@/lib/clientAuth";
import { getClientById, getTicket, getTicketFeedback, listTicketVersions, currentVersion, getSettings, slaHoursForPlan, listTicketAttachments } from "@/lib/data";
import PortalTicketView from "@/components/PortalTicketView";

export const dynamic = "force-dynamic";

export default async function LockerRoomTicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const clientId = await getClientSession();
  if (!clientId) redirect("/enter");
  // Single parallel wave.
  const [client, ticket, feedback, versions, settings, attachments] = await Promise.all([
    getClientById(clientId), getTicket(ticketId), getTicketFeedback(ticketId),
    listTicketVersions(ticketId), getSettings(), listTicketAttachments(ticketId),
  ]);
  if (!client) redirect("/enter");
  if (!ticket || ticket.clientId !== clientId) notFound(); // can only see own reps
  const back = client.language === "pt" ? "← O teu quadro" : "← Your board";

  return <PortalTicketView client={client} ticket={ticket} feedback={feedback} versions={versions} attachments={attachments}
    shown={currentVersion(versions)} slaHours={slaHoursForPlan(client.plan, settings)} backHref="/me" backLabel={back} />;
}
