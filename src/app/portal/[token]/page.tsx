import { notFound } from "next/navigation";
import { getClientByPortalToken, listTickets } from "@/lib/data";
import PortalBoard from "@/components/PortalBoard";

export const dynamic = "force-dynamic";

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await getClientByPortalToken(token);
  if (!client) notFound();
  const tickets = await listTickets(client.id);

  return <PortalBoard client={client} tickets={tickets} ticketHrefBase={`/portal/${token}`} />;
}
