import { notFound } from "next/navigation";
import { getClientById, listTickets, getRunningTimer } from "@/lib/data";
import KanbanBoard from "@/components/KanbanBoard";
import ClientBoardHeader from "@/components/ClientBoardHeader";
import { Scanlines } from "@/components/crt";
import { DS } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  return { title: client ? `${client.name} · The Circuit` : "The Circuit" };
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();
  const tickets = await listTickets(id);
  const running = await getRunningTimer();

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, color: DS.text }}>
      <Scanlines />
      <ClientBoardHeader client={client} />
      <div style={{ padding: "26px 40px" }}>
        <KanbanBoard
          clientId={client.id}
          portalToken={client.portalToken}
          tickets={tickets}
          runningTicketId={running?.ticketId ?? null}
        />
      </div>
    </div>
  );
}
