import { notFound } from "next/navigation";
import { getStylescapeByToken } from "@/lib/data";
import ReviewClient from "./ReviewClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Design Review" };

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const stylescape = await getStylescapeByToken(token);
  if (!stylescape) notFound();
  return <ReviewClient stylescape={stylescape} token={token} />;
}
