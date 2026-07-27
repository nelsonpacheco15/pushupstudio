import { redirect } from "next/navigation";
import { getClientSession } from "@/lib/clientAuth";
import { getClientById, listTickets } from "@/lib/data";
import PortalBoard from "@/components/PortalBoard";

export const dynamic = "force-dynamic";

export default async function LockerRoomPage() {
  const clientId = await getClientSession();
  if (!clientId) redirect("/enter");
  const client = await getClientById(clientId);
  if (!client) redirect("/enter");
  const tickets = await listTickets(client.id);

  return <PortalBoard client={client} tickets={tickets} ticketHrefBase="/me" showLogout />;
}
