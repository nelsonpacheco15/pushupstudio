import { notFound } from "next/navigation";
import { getClientByPortalToken, getPortalTicket, getTicketFeedback, listTicketVersions, currentVersion, getSettings, slaHoursForPlan } from "@/lib/data";
import PortalTicketView from "@/components/PortalTicketView";

export const dynamic = "force-dynamic";

export default async function PortalTicketPage({ params }: { params: Promise<{ token: string; ticketId: string }> }) {
  const { token, ticketId } = await params;
  const [client, ticket] = await Promise.all([getClientByPortalToken(token), getPortalTicket(token, ticketId)]);
  if (!client || !ticket) notFound();
  const [feedback, versions, settings] = await Promise.all([getTicketFeedback(ticketId), listTicketVersions(ticketId), getSettings()]);
  const back = client.language === "pt" ? "← O teu quadro" : "← Your board";

  return <PortalTicketView client={client} ticket={ticket} feedback={feedback} versions={versions}
    shown={currentVersion(versions)} slaHours={slaHoursForPlan(client.plan, settings)} backHref={`/portal/${token}`} backLabel={back} />;
}
