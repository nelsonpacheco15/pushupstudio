import "server-only";
import Stripe from "stripe";
import type { PlanKey } from "@/lib/billing";

/* Stripe is fully optional. Everything here no-ops (or throws a clear error)
   until STRIPE_SECRET_KEY is set, so bank-transfer billing works without it.
   Set these env vars to activate card billing:
     STRIPE_SECRET_KEY        sk_test_… / sk_live_…
     STRIPE_WEBHOOK_SECRET    whsec_…            (from the webhook endpoint)
     STRIPE_PRICE_GROWTH      price_…            (recurring €800/mo price id)
     STRIPE_PRICE_SCALE       price_…            (recurring €1299/mo price id) */

let _stripe: Stripe | null = null;

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

/** The Stripe price id for a plan, from env. Null if not configured. */
export function priceForPlan(plan: PlanKey | string): string | null {
  if (plan === "scale") return process.env.STRIPE_PRICE_SCALE || null;
  return process.env.STRIPE_PRICE_GROWTH || null;
}

export const webhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || "";
