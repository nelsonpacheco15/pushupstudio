import { notFound } from "next/navigation";
import { getClientByPortalToken, getTicket, getTicketFeedback, listTicketVersions, currentVersion, getSettings, slaHoursForPlan, listTicketAttachments } from "@/lib/data";
import PortalTicketView from "@/components/PortalTicketView";

export const dynamic = "force-dynamic";

export default async function PortalTicketPage({ params }: { params: Promise<{ token: string; ticketId: string }> }) {
  const { token, ticketId } = await params;
  // Single parallel wave — everything is keyed by token/ticketId, so fetch it all at once.
  const [client, ticket, feedback, versions, settings, attachments] = await Promise.all([
    getClientByPortalToken(token), getTicket(ticketId), getTicketFeedback(ticketId),
    listTicketVersions(ticketId), getSettings(), listTicketAttachments(ticketId),
  ]);
  if (!client || !ticket || ticket.clientId !== client.id) notFound(); // ownership check
  const back = client.language === "pt" ? "← O teu quadro" : "← Your board";

  return <PortalTicketView client={client} ticket={ticket} feedback={feedback} versions={versions} attachments={attachments}
    shown={currentVersion(versions)} slaHours={slaHoursForPlan(client.plan, settings)} backHref={`/portal/${token}`} backLabel={back} />;
}
