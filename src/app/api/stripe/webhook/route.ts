import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, webhookSecret } from "@/lib/stripe";
import { admin, createInvoice, getClientById } from "@/lib/data";
import { planFor } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Stripe subscription webhook. Verifies the signature, then keeps our internal
   invoices in sync: the first checkout + every recurring charge marks the
   client's outstanding invoice paid (or records a fresh paid invoice). */

async function findClientIdByCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await admin.from("clients").select("id").eq("stripe_customer_id", customerId).limit(1);
  return (data?.[0] as { id: string } | undefined)?.id ?? null;
}

/** Mark the client's most recent outstanding invoice paid, or create a paid one. */
async function recordPayment(clientId: string, periodLabel: string): Promise<void> {
  const { data } = await admin.from("invoices").select("id").eq("client_id", clientId).eq("status", "sent")
    .order("issued_at", { ascending: false }).limit(1);
  const open = (data?.[0] as { id: string } | undefined)?.id;
  if (open) {
    await admin.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", open);
    return;
  }
  const client = await getClientById(clientId);
  if (!client) return;
  await createInvoice({
    clientId, plan: client.plan, amountCents: planFor(client.plan).amountCents,
    method: "stripe", periodLabel, status: "paid",
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = webhookSecret();
  if (!stripe || !secret) return NextResponse.json({ error: "stripe not configured" }, { status: 503 });

  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.warn("[stripe] bad signature:", (err as Error).message);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const clientId = s.metadata?.clientId || (await findClientIdByCustomer(typeof s.customer === "string" ? s.customer : null));
      if (clientId) {
        if (typeof s.subscription === "string") await admin.from("clients").update({ stripe_subscription_id: s.subscription }).eq("id", clientId);
        if (typeof s.customer === "string") await admin.from("clients").update({ stripe_customer_id: s.customer }).eq("id", clientId);
        const period = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        await recordPayment(clientId, period);
      }
    } else if (event.type === "invoice.paid") {
      const inv = event.data.object as Stripe.Invoice;
      const clientId = await findClientIdByCustomer(typeof inv.customer === "string" ? inv.customer : null);
      if (clientId) {
        const period = new Date((inv.period_end || Math.floor(Date.now() / 1000)) * 1000)
          .toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        await recordPayment(clientId, period);
      }
    }
  } catch (err) {
    console.warn("[stripe] handler error:", (err as Error).message);
  }

  return NextResponse.json({ received: true });
}
