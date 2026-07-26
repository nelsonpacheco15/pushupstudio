import { notFound } from "next/navigation";
import { getStylescapeById, getReviews, getClientById } from "@/lib/data";
import BuilderClient from "./BuilderClient";

export const dynamic = "force-dynamic";

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stylescape = await getStylescapeById(id);
  if (!stylescape) notFound();
  const reviews = await getReviews(id);
  const client = stylescape.clientId ? await getClientById(stylescape.clientId) : null;

  return (
    <BuilderClient
      initial={stylescape}
      reviews={reviews}
      clientId={stylescape.clientId}
      clientName={client?.name ?? null}
    />
  );
}
