import { NextResponse, type NextRequest } from "next/server";
import { getInvoice, getClientById, getSettings } from "@/lib/data";
import { isStudio } from "@/lib/auth";
import { getClientSession } from "@/lib/clientAuth";
import { buildInvoicePdf } from "@/lib/invoicePdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Serve a branded PDF for an invoice. Accessible to the studio owner OR the
   logged-in client the invoice belongs to. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await getInvoice(id);
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });

  let authorized = await isStudio();
  if (!authorized) {
    const sessionClientId = await getClientSession();
    authorized = !!sessionClientId && sessionClientId === inv.clientId;
  }
  if (!authorized) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const [client, settings] = await Promise.all([getClientById(inv.clientId), getSettings()]);
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 404 });

  try {
    const bytes = await buildInvoicePdf(inv, { name: client.name, company: client.company, email: client.email, language: client.language }, settings);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${inv.number}.pdf"`,
        "Content-Length": String(bytes.length),
      },
    });
  } catch (e) {
    console.error("[invoice pdf] generation failed:", e);
    return NextResponse.json({ error: "pdf generation failed", detail: (e as Error).message }, { status: 500 });
  }
}
