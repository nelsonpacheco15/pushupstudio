/* Billing config: subscription plans + issuer/bank details for invoices.
   Money is stored and handled in integer cents to avoid float errors. */

export type PlanKey = "growth" | "scale";
export type PaymentMethod = "stripe" | "bank_transfer";
export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface Plan { key: PlanKey; label: string; amountCents: number; }

export const PLANS: Record<PlanKey, Plan> = {
  growth: { key: "growth", label: "Growth", amountCents: 80000 },   // €800 / mo
  scale: { key: "scale", label: "Scale", amountCents: 129900 },     // €1299 / mo
};

export function planFor(key: string | null | undefined): Plan {
  return PLANS[(key as PlanKey)] ?? PLANS.growth;
}

export const CURRENCY = "eur";

/** €X.XX from integer cents. */
export function formatEUR(cents: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** Your business details shown on invoices. Set these via env; safe placeholders otherwise. */
export const ISSUER = {
  name: process.env.PUSHUP_LEGAL_NAME || "PushUP Design",
  vat: process.env.PUSHUP_VAT || "",           // NIF / VAT number
  address: process.env.PUSHUP_ADDRESS || "",
  iban: process.env.PUSHUP_IBAN || "",
  bank: process.env.PUSHUP_BANK || "",
  email: process.env.STUDIO_EMAIL || "hey@dashboard.pushupdesign.com",
};
