import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Stylescape } from "./layouts";
import type { Ticket, TicketStatus } from "./tickets";

/* Server-only Supabase client using the service-role key. Because every DB
   operation runs here (never in the browser), we can lock the tables down with
   RLS and no public policies — the service role bypasses RLS. */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // Fail loud in the server logs rather than silently returning empty data.
  console.warn(
    "[stylescape] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Copy .env.local.example to .env.local and fill them in."
  );
}

// Fallbacks keep the app importable/buildable without secrets; real queries
// simply fail at runtime until the env vars are set.
export const admin = createClient(
  url || "https://placeholder.supabase.co",
  serviceKey || "placeholder-key",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export const BUCKET = "stylescape-images";

interface Row {
  id: string;
  client_id: string | null;
  title: string;
  concept_note: string | null;
  layout_key: string;
  attributes: string[] | null;
  palette: string[] | null;
  share_token: string;
  created_at: string;
}

interface TileRow {
  tile_key: string;
  image_url: string | null;
}

function toStylescape(row: Row, tiles: TileRow[]): Stylescape {
  const images: Record<string, string> = {};
  for (const t of tiles) if (t.image_url) images[t.tile_key] = t.image_url;
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    conceptNote: row.concept_note ?? "",
    layoutKey: row.layout_key,
    attributes: row.attributes ?? [],
    palette: row.palette ?? [],
    shareToken: row.share_token,
    images,
  };
}

export type Lang = "en" | "pt";

export interface ClientRecord {
  id: string;
  name: string;
  company: string;
  email: string;
  logoUrl: string | null;
  brandColor: string;
  brandFont: string;
  language: Lang;
  portalToken: string;
  plan: string;
  paymentMethod: string;
  status: string;
  brandPalette: string[];
  brandGuidelines: string;
  whatsappPhone: string;
  whatsappApiKey: string;
  driveFolderUrl: string;
}

// "*" so a not-yet-migrated column (language/onboarding/logo_url…) can't break
// client queries — mapClient defaults anything missing.
const CLIENT_COLS = "*";

interface ClientRow {
  id: string; name: string; company: string | null; email: string | null;
  logo_url: string | null; brand_color: string | null; brand_font: string | null;
  language: string | null; portal_token: string; created_at?: string;
  password_hash?: string | null; plan?: string | null; payment_method?: string | null;
  status?: string | null; brand_palette?: string[] | null; brand_guidelines?: string | null;
  whatsapp_phone?: string | null; whatsapp_apikey?: string | null; drive_folder_url?: string | null;
}

function mapClient(data: ClientRow): ClientRecord {
  return {
    id: data.id, name: data.name, company: data.company ?? "", email: data.email ?? "",
    logoUrl: data.logo_url, brandColor: data.brand_color || "#D2452B", brandFont: data.brand_font ?? "",
    language: (data.language === "pt" ? "pt" : "en"), portalToken: data.portal_token,
    plan: data.plan || "growth", paymentMethod: data.payment_method || "bank_transfer",
    status: data.status || "active",
    brandPalette: Array.isArray(data.brand_palette) ? data.brand_palette : [],
    brandGuidelines: data.brand_guidelines ?? "",
    whatsappPhone: data.whatsapp_phone ?? "", whatsappApiKey: data.whatsapp_apikey ?? "",
    driveFolderUrl: data.drive_folder_url ?? "",
  };
}


export interface BrandAsset { id: string; name: string; url: string; kind: string; createdAt: string; }

export async function listBrandAssets(clientId: string): Promise<BrandAsset[]> {
  const { data } = await admin.from("brand_assets").select("id, name, url, kind, created_at")
    .eq("client_id", clientId).order("created_at", { ascending: false });
  return (data ?? []).map((a) => ({ id: a.id, name: a.name, url: a.url, kind: a.kind, createdAt: a.created_at }));
}

export async function insertBrandAsset(clientId: string, name: string, url: string, kind: string): Promise<void> {
  await admin.from("brand_assets").insert({ client_id: clientId, name, url, kind });
}

export async function deleteBrandAsset(id: string): Promise<void> {
  await admin.from("brand_assets").delete().eq("id", id);
}

export interface OnboardingState { registration: boolean; onboarding: boolean; whatsapp: boolean; drive: boolean; }
export const ONBOARDING_KEYS: (keyof OnboardingState)[] = ["registration", "onboarding", "whatsapp", "drive"];
export const ONBOARDING_LABELS: Record<keyof OnboardingState, string> = {
  registration: "Registration", onboarding: "Onboarding", whatsapp: "WhatsApp channel", drive: "Drive folder",
};
const DEFAULT_ONBOARDING: OnboardingState = { registration: true, onboarding: false, whatsapp: false, drive: false };

export async function getOnboarding(clientId: string): Promise<OnboardingState> {
  const { data, error } = await admin.from("clients").select("onboarding").eq("id", clientId).single();
  if (error || !data?.onboarding) return DEFAULT_ONBOARDING; // column not migrated yet → safe default
  return { ...DEFAULT_ONBOARDING, ...(data.onboarding as Partial<OnboardingState>) };
}

export interface ClientContact { id: string; name: string; email: string; hasLogin: boolean; }

export async function getClientContacts(clientId: string): Promise<ClientContact[]> {
  const { data } = await admin
    .from("client_contacts")
    .select("id, name, email, password_hash")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((c) => ({ id: c.id, name: c.name ?? "", email: c.email, hasLogin: !!(c as { password_hash?: string }).password_hash }));
}

export interface ClientSummary extends ClientRecord {
  createdAt: string;
  ticketCounts: Record<TicketStatus, number>;
  openCount: number;
  lastCompletedAt: string | null; // most recent time a ticket was marked done
  weekSeconds: number;
  monthSeconds: number;
  oldestOpenAt: string | null;    // created_at of the oldest not-done ticket
}

export async function listClients(): Promise<ClientSummary[]> {
  const { data: allRows } = await admin
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  // Filter archived in JS so this never breaks if the archived_at column isn't there yet.
  const rows = (allRows ?? []).filter((r) => !(r as { archived_at?: string | null }).archived_at);
  if (!rows.length) return [];

  const { data: tk } = await admin.from("tickets").select("id, client_id, status, updated_at, created_at");
  const ticketClient = new Map<string, string>();
  for (const t of tk ?? []) ticketClient.set(t.id, t.client_id);

  // Per-client time for this week + this month (overlap of each entry with the window).
  const now = new Date();
  const nowMs = now.getTime();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(startToday); startWeek.setDate(startToday.getDate() - ((now.getDay() + 6) % 7));
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const { data: entries } = await admin
    .from("time_entries")
    .select("ticket_id, started_at, ended_at")
    .or(`ended_at.is.null,ended_at.gte.${startMonth.toISOString()}`);
  const overlap = (a: number, b: number, w: number) => Math.max(0, Math.min(b, nowMs) - Math.max(a, w)) / 1000;
  const week: Record<string, number> = {};
  const month: Record<string, number> = {};
  for (const e of entries ?? []) {
    const cid = ticketClient.get(e.ticket_id);
    if (!cid) continue;
    const a = new Date(e.started_at).getTime();
    const b = e.ended_at ? new Date(e.ended_at).getTime() : nowMs;
    week[cid] = (week[cid] ?? 0) + overlap(a, b, startWeek.getTime());
    month[cid] = (month[cid] ?? 0) + overlap(a, b, startMonth.getTime());
  }

  return rows.map((c) => {
    const counts = emptyCounts();
    let open = 0;
    let lastCompletedAt: string | null = null;
    let oldestOpenAt: string | null = null;
    for (const t of tk ?? []) {
      if (t.client_id !== c.id) continue;
      counts[t.status as TicketStatus] = (counts[t.status as TicketStatus] ?? 0) + 1;
      if (t.status !== "done") {
        open += 1;
        if (!oldestOpenAt || t.created_at < oldestOpenAt) oldestOpenAt = t.created_at;
      }
      if (t.status === "done" && (!lastCompletedAt || t.updated_at > lastCompletedAt)) lastCompletedAt = t.updated_at;
    }
    return {
      ...mapClient(c as ClientRow),
      createdAt: c.created_at,
      ticketCounts: counts,
      openCount: open,
      lastCompletedAt,
      weekSeconds: Math.round(week[c.id] ?? 0),
      monthSeconds: Math.round(month[c.id] ?? 0),
      oldestOpenAt,
    };
  });
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  const { data } = await admin.from("clients").select(CLIENT_COLS).eq("id", id).single();
  return data ? mapClient(data as ClientRow) : null;
}

/** For client login: look up a client by email and return its id + password hash.
    Returns null if no client with that email or no password set. */
export async function getClientAuthByEmail(email: string): Promise<{ id: string; passwordHash: string } | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  // Primary client account.
  const { data } = await admin.from("clients").select("id, email, password_hash").ilike("email", clean).limit(1);
  const row = data?.[0] as { id: string; password_hash?: string | null } | undefined;
  if (row?.password_hash) return { id: row.id, passwordHash: row.password_hash };
  // Multi-seat: a contact with a password logs into their client's Locker Room.
  const { data: cData } = await admin.from("client_contacts").select("client_id, password_hash").ilike("email", clean).limit(1);
  const c = cData?.[0] as { client_id: string; password_hash?: string | null } | undefined;
  if (c?.password_hash) return { id: c.client_id, passwordHash: c.password_hash };
  return null;
}

/** All email recipients for a client: the primary email + every contact/seat email. */
export async function getClientRecipients(clientId: string): Promise<string[]> {
  const [cRes, ctRes] = await Promise.all([
    admin.from("clients").select("email").eq("id", clientId).single(),
    admin.from("client_contacts").select("email").eq("client_id", clientId),
  ]);
  const emails = [(cRes.data as { email?: string } | null)?.email ?? "", ...((ctRes.data ?? []).map((c) => c.email ?? ""))];
  return [...new Set(emails.map((e) => e.trim()).filter(Boolean))];
}

export async function getContactInfo(contactId: string): Promise<{ clientId: string; email: string; name: string } | null> {
  const { data } = await admin.from("client_contacts").select("client_id, email, name").eq("id", contactId).single();
  if (!data) return null;
  return { clientId: data.client_id, email: data.email ?? "", name: data.name ?? "" };
}

export async function getClientByPortalToken(token: string): Promise<ClientRecord | null> {
  const { data } = await admin.from("clients").select(CLIENT_COLS).eq("portal_token", token).single();
  return data ? mapClient(data as ClientRow) : null;
}

/* ----------------------------------------------------------------- Invoices */

export interface Invoice {
  id: string; clientId: string; clientName?: string; number: string;
  plan: string; amountCents: number; currency: string;
  method: string; status: string; periodLabel: string;
  issuedAt: string; dueAt: string | null; paidAt: string | null;
  stripeInvoiceId: string | null;
}

interface InvoiceRow {
  id: string; client_id: string; number: string; plan: string;
  amount_cents: number; currency: string; method: string; status: string;
  period_label: string | null; issued_at: string; due_at: string | null;
  paid_at: string | null; stripe_invoice_id: string | null;
  clients?: { name: string } | null;
}

function mapInvoice(r: InvoiceRow): Invoice {
  return {
    id: r.id, clientId: r.client_id, clientName: r.clients?.name, number: r.number,
    plan: r.plan, amountCents: r.amount_cents, currency: r.currency,
    method: r.method, status: r.status, periodLabel: r.period_label ?? "",
    issuedAt: r.issued_at, dueAt: r.due_at, paidAt: r.paid_at, stripeInvoiceId: r.stripe_invoice_id,
  };
}

/** Next human invoice number, e.g. PU-2026-0007 (per calendar year). */
async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await admin.from("invoices").select("id", { count: "exact", head: true })
    .gte("issued_at", `${year}-01-01`).lte("issued_at", `${year}-12-31T23:59:59`);
  return `PU-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export async function createInvoice(input: {
  clientId: string; plan: string; amountCents: number; method: string;
  periodLabel: string; dueAt?: string | null; status?: string;
}): Promise<Invoice | null> {
  const number = await nextInvoiceNumber();
  const { data, error } = await admin.from("invoices").insert({
    client_id: input.clientId, number, plan: input.plan, amount_cents: input.amountCents,
    currency: "eur", method: input.method, status: input.status ?? "sent",
    period_label: input.periodLabel, due_at: input.dueAt ?? null,
  }).select("*").single();
  if (error || !data) { console.warn("[invoice] create failed:", error?.message); return null; }
  return mapInvoice(data as InvoiceRow);
}

export async function listInvoices(): Promise<Invoice[]> {
  const { data } = await admin.from("invoices").select("*, clients(name)").order("issued_at", { ascending: false });
  return (data ?? []).map((r) => mapInvoice(r as InvoiceRow));
}

export async function listInvoicesForClient(clientId: string): Promise<Invoice[]> {
  const { data } = await admin.from("invoices").select("*").eq("client_id", clientId).order("issued_at", { ascending: false });
  return (data ?? []).map((r) => mapInvoice(r as InvoiceRow));
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data } = await admin.from("invoices").select("*, clients(name)").eq("id", id).single();
  return data ? mapInvoice(data as InvoiceRow) : null;
}

export async function setInvoiceStatus(id: string, status: string): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "paid") patch.paid_at = new Date().toISOString();
  await admin.from("invoices").update(patch).eq("id", id);
}

/* -------------------------------------------------------------------- Search */

export interface SearchItem { type: "client" | "rep"; id: string; label: string; sub: string; href: string; }

/** Lightweight index of clients + reps for the ⌘P command palette. */
export interface ArchivedClient { id: string; name: string; company: string; plan: string; archivedAt: string; }
export async function getArchivedClients(): Promise<ArchivedClient[]> {
  const { data } = await admin.from("clients").select("*");
  return (data ?? []).filter((c) => (c as { archived_at?: string | null }).archived_at)
    .map((c) => ({ id: c.id, name: c.name, company: c.company ?? "", plan: c.plan ?? "growth", archivedAt: c.archived_at }))
    .sort((a, b) => (a.archivedAt < b.archivedAt ? 1 : -1));
}

export async function getSearchIndex(): Promise<SearchItem[]> {
  const [cRes, tRes] = await Promise.all([
    admin.from("clients").select("*"),
    admin.from("tickets").select("id, title, status, client_id"),
  ]);
  const activeClients = (cRes.data ?? []).filter((c) => !(c as { archived_at?: string | null }).archived_at);
  const names = new Map((cRes.data ?? []).map((c) => [c.id as string, c.name as string]));
  const items: SearchItem[] = [];
  for (const c of activeClients) items.push({ type: "client", id: c.id, label: c.name, sub: c.company || "Athlete", href: `/client/${c.id}` });
  for (const t of tRes.data ?? []) items.push({ type: "rep", id: t.id, label: t.title || "Untitled", sub: `${names.get(t.client_id) ?? ""} · ${t.status}`, href: `/ticket/${t.id}` });
  return items;
}

/** All reps across every client, for the studio-wide Calendar/All-requests views. */
export interface StudioTicket { id: string; title: string; status: TicketStatus; clientId: string; clientName: string; priority: number; deadline: string; createdAt: string; updatedAt: string; }
export async function listAllTickets(): Promise<StudioTicket[]> {
  const [cRes, tRes] = await Promise.all([
    admin.from("clients").select("id, name"),
    admin.from("tickets").select("id, title, status, client_id, priority, form, created_at, updated_at").order("created_at", { ascending: false }),
  ]);
  const names = new Map((cRes.data ?? []).map((c) => [c.id as string, c.name as string]));
  return (tRes.data ?? []).map((t) => ({
    id: t.id, title: t.title || "Untitled", status: t.status as TicketStatus, clientId: t.client_id,
    clientName: names.get(t.client_id) ?? "", priority: t.priority ?? 0,
    deadline: (t.form as { deadline?: string })?.deadline || "", createdAt: t.created_at, updatedAt: t.updated_at,
  }));
}

/* ------------------------------------------------------------------ Settings */

export interface StudioSettings {
  legalName: string; vat: string; address: string; iban: string; bank: string;
  studioEmail: string; fromEmail: string;
  growthCents: number; scaleCents: number; slaHours: number; autoInvoice: boolean;
  growthSlaHours: number; scaleSlaHours: number; slackWebhookUrl: string;
  whatsappPhone: string; whatsappApiKey: string; autoRecap: boolean; clientSelfService: boolean;
}

/** Promised turnaround (hours) for a plan. */
export function slaHoursForPlan(plan: string, s: StudioSettings): number {
  return plan === "scale" ? s.scaleSlaHours : s.growthSlaHours;
}

const SETTINGS_DEFAULTS = (): StudioSettings => ({
  legalName: process.env.PUSHUP_LEGAL_NAME || "PushUP Design",
  vat: process.env.PUSHUP_VAT || "",
  address: process.env.PUSHUP_ADDRESS || "",
  iban: process.env.PUSHUP_IBAN || "",
  bank: process.env.PUSHUP_BANK || "",
  studioEmail: process.env.STUDIO_EMAIL || "",
  fromEmail: process.env.EMAIL_FROM || "",
  growthCents: 80000, scaleCents: 129900, slaHours: 45, autoInvoice: true,
  growthSlaHours: 48, scaleSlaHours: 24, slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  whatsappPhone: process.env.WHATSAPP_PHONE || "", whatsappApiKey: process.env.WHATSAPP_APIKEY || "",
  autoRecap: true, clientSelfService: true,
});

/** Merge saved settings (app_settings rows) over env/code defaults. */
export async function getSettings(): Promise<StudioSettings> {
  const d = SETTINGS_DEFAULTS();
  const { data } = await admin.from("app_settings").select("key, value");
  const m = new Map((data ?? []).map((r) => [r.key as string, r.value as string]));
  const str = (k: string, fb: string) => (m.get(k) ?? fb);
  const num = (k: string, fb: number) => { const v = m.get(k); const n = v == null ? NaN : Number(v); return Number.isFinite(n) ? n : fb; };
  return {
    legalName: str("legalName", d.legalName), vat: str("vat", d.vat), address: str("address", d.address),
    iban: str("iban", d.iban), bank: str("bank", d.bank),
    studioEmail: str("studioEmail", d.studioEmail), fromEmail: str("fromEmail", d.fromEmail),
    growthCents: num("growthCents", d.growthCents), scaleCents: num("scaleCents", d.scaleCents),
    slaHours: num("slaHours", d.slaHours),
    autoInvoice: str("autoInvoice", d.autoInvoice ? "on" : "off") !== "off",
    growthSlaHours: num("growthSlaHours", d.growthSlaHours), scaleSlaHours: num("scaleSlaHours", d.scaleSlaHours),
    slackWebhookUrl: str("slackWebhookUrl", d.slackWebhookUrl),
    whatsappPhone: str("whatsappPhone", d.whatsappPhone), whatsappApiKey: str("whatsappApiKey", d.whatsappApiKey),
    autoRecap: str("autoRecap", d.autoRecap ? "on" : "off") !== "off",
    clientSelfService: str("clientSelfService", d.clientSelfService ? "on" : "off") !== "off",
  };
}

/** Reps delivered (moved to Done) for a client within a date range — for the monthly recap. */
export async function completedTicketsInRange(clientId: string, startISO: string, endISO: string): Promise<string[]> {
  const { data } = await admin.from("tickets").select("title, updated_at")
    .eq("client_id", clientId).eq("status", "done")
    .gte("updated_at", startISO).lte("updated_at", endISO)
    .order("updated_at", { ascending: true });
  return (data ?? []).map((t) => t.title as string);
}

/** Lightweight client list for recurring billing (id + billing-relevant fields). */
export interface BillingClient {
  id: string; name: string; email: string; language: Lang; portalToken: string;
  plan: string; paymentMethod: string; status: string; createdAt: string | null;
}
export async function listClientsForBilling(): Promise<BillingClient[]> {
  const { data } = await admin.from("clients").select("*");
  return (data ?? []).filter((c) => !(c as { archived_at?: string | null }).archived_at).map((c) => ({
    id: c.id as string, name: c.name as string, email: (c.email as string) ?? "",
    language: (c.language === "pt" ? "pt" : "en") as Lang, portalToken: c.portal_token as string,
    plan: (c.plan as string) || "growth", paymentMethod: (c.payment_method as string) || "bank_transfer",
    status: (c.status as string) || "active", createdAt: (c.created_at as string) ?? null,
  }));
}

/** True if an invoice already exists for this client for the given period label. */
export async function hasInvoiceForPeriod(clientId: string, periodLabel: string): Promise<boolean> {
  const { count } = await admin.from("invoices").select("id", { count: "exact", head: true })
    .eq("client_id", clientId).eq("period_label", periodLabel).neq("status", "void");
  return (count ?? 0) > 0;
}

/** Resolve the outgoing "from" address: Settings → env → default. Used by email.ts. */
export async function getEmailFrom(): Promise<string> {
  const { data } = await admin.from("app_settings").select("value").eq("key", "fromEmail").limit(1);
  return ((data?.[0]?.value as string) || "").trim() || process.env.EMAIL_FROM || "PushUP Studio <onboarding@resend.dev>";
}

/** Resolve where the studio owner gets notified: Settings → env. Used by email.ts. */
export async function getStudioEmailAddr(): Promise<string> {
  const { data } = await admin.from("app_settings").select("value").eq("key", "studioEmail").limit(1);
  return ((data?.[0]?.value as string) || "").trim() || process.env.STUDIO_EMAIL || "";
}

export async function saveSettings(patch: Partial<Record<keyof StudioSettings, string>>): Promise<void> {
  const rows = Object.entries(patch).map(([key, value]) => ({ key, value: String(value ?? ""), updated_at: new Date().toISOString() }));
  if (!rows.length) return;
  const { error } = await admin.from("app_settings").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(`Could not save settings: ${error.message}`);
}

/** Monthly amount (cents) for a plan, honouring settings overrides. */
export function planAmountFromSettings(plan: string, s: StudioSettings): number {
  return plan === "scale" ? s.scaleCents : s.growthCents;
}

/* ------------------------------------------------------------- Notifications */

export interface NotificationRecord {
  id: string; type: string; title: string; body: string; link: string | null;
  readAt: string | null; createdAt: string; clientId: string | null;
}

interface NotificationInput {
  audience: "studio" | "client"; clientId?: string | null;
  type: string; title: string; body?: string; link?: string | null;
}

/** Send one WhatsApp message via CallMeBot (free). Best-effort. */
async function sendWhatsApp(phone: string, apikey: string, text: string): Promise<void> {
  const p = (phone || "").replace(/[^\d+]/g, "");
  if (!p || !apikey) return;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(p)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
  await fetch(url).catch(() => {});
}

/** Fan a studio notification out to Slack + the studio WhatsApp (best-effort). */
async function fanoutStudioNotification(title: string, body?: string): Promise<void> {
  try {
    const { data } = await admin.from("app_settings").select("key, value")
      .in("key", ["slackWebhookUrl", "whatsappPhone", "whatsappApiKey"]);
    const m = new Map((data ?? []).map((r) => [r.key as string, r.value as string]));
    const text = `${title}${body ? `\n${body}` : ""}`;
    const slack = m.get("slackWebhookUrl") || process.env.SLACK_WEBHOOK_URL || "";
    if (slack) {
      await fetch(slack, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `*${title}*${body ? `\n${body}` : ""}` }) }).catch(() => {});
    }
    await sendWhatsApp(m.get("whatsappPhone") || process.env.WHATSAPP_PHONE || "",
      m.get("whatsappApiKey") || process.env.WHATSAPP_APIKEY || "", text);
  } catch (e) { console.warn("[fanout] failed:", (e as Error).message); }
}

/** Post a client notification into that client's WhatsApp group (best-effort). */
async function fanoutClientNotification(clientId: string, title: string, body?: string): Promise<void> {
  try {
    const { data } = await admin.from("clients").select("whatsapp_phone, whatsapp_apikey").eq("id", clientId).single();
    const row = data as { whatsapp_phone?: string; whatsapp_apikey?: string } | null;
    if (row?.whatsapp_phone && row?.whatsapp_apikey) {
      await sendWhatsApp(row.whatsapp_phone, row.whatsapp_apikey, `${title}${body ? `\n${body}` : ""}`);
    }
  } catch (e) { console.warn("[client-fanout] failed:", (e as Error).message); }
}

/** Create an in-app notification. Best-effort — never throws into the caller. */
export async function notify(input: NotificationInput): Promise<void> {
  try {
    await admin.from("notifications").insert({
      audience: input.audience, client_id: input.clientId ?? null,
      type: input.type, title: input.title, body: input.body ?? "", link: input.link ?? null,
    });
  } catch (e) { console.warn("[notify] failed:", (e as Error).message); }
  if (input.audience === "studio") await fanoutStudioNotification(input.title, input.body);
  else if (input.audience === "client" && input.clientId) await fanoutClientNotification(input.clientId, input.title, input.body);
}

function mapNotification(r: Record<string, unknown>): NotificationRecord {
  return {
    id: r.id as string, type: r.type as string, title: r.title as string, body: (r.body as string) ?? "",
    link: (r.link as string) ?? null, readAt: (r.read_at as string) ?? null,
    createdAt: r.created_at as string, clientId: (r.client_id as string) ?? null,
  };
}

export async function listStudioNotifications(limit = 25): Promise<NotificationRecord[]> {
  const { data } = await admin.from("notifications").select("*").eq("audience", "studio")
    .order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map(mapNotification);
}

export async function listClientNotifications(clientId: string, limit = 25): Promise<NotificationRecord[]> {
  const { data } = await admin.from("notifications").select("*").eq("audience", "client").eq("client_id", clientId)
    .order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map(mapNotification);
}

export async function markStudioNotificationsRead(): Promise<void> {
  await admin.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("audience", "studio").is("read_at", null);
}

export async function markClientNotificationsRead(clientId: string): Promise<void> {
  await admin.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("audience", "client").eq("client_id", clientId).is("read_at", null);
}

/* ------------------------------------------------------------------ Tickets */

function emptyCounts(): Record<TicketStatus, number> {
  return { backlog: 0, ready: 0, in_progress: 0, review: 0, done: 0 };
}

interface TicketRow {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  form: Record<string, string> | null;
  status: TicketStatus;
  priority: number;
  position: number;
  created_by: "studio" | "client";
  deliverable_url?: string | null;
  created_at: string;
  updated_at: string;
}

function mapTicket(r: TicketRow): Ticket {
  return {
    id: r.id,
    clientId: r.client_id,
    title: r.title,
    description: r.description ?? "",
    form: r.form ?? {},
    status: r.status,
    priority: r.priority,
    position: r.position,
    createdBy: r.created_by,
    deliverableUrl: r.deliverable_url ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface TicketFeedback {
  id: string; score: number | null; note: string; decision: "approved" | "changes" | null; createdAt: string;
}

export async function getTicketFeedback(ticketId: string): Promise<TicketFeedback[]> {
  const { data } = await admin
    .from("ticket_feedback")
    .select("id, score, note, decision, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((f) => ({
    id: f.id, score: f.score, note: f.note ?? "", decision: f.decision, createdAt: f.created_at,
  }));
}

/* --------------------------------------------------------- Attachments */

export interface TicketAttachment { id: string; url: string; name: string; kind: string; createdAt: string; }

export async function listTicketAttachments(ticketId: string): Promise<TicketAttachment[]> {
  const { data } = await admin.from("ticket_attachments").select("id, url, name, kind, created_at")
    .eq("ticket_id", ticketId).order("created_at", { ascending: true });
  return (data ?? []).map((a) => ({ id: a.id, url: a.url, name: a.name ?? "", kind: a.kind, createdAt: a.created_at }));
}

export async function insertTicketAttachment(ticketId: string, url: string, name: string, kind: string): Promise<void> {
  await admin.from("ticket_attachments").insert({ ticket_id: ticketId, url, name, kind });
}

/* --------------------------------------------------------- Design versions */

export interface TicketVersion {
  id: string; version: number; url: string; status: "pending" | "accepted" | "changes"; createdAt: string;
}

export async function listTicketVersions(ticketId: string): Promise<TicketVersion[]> {
  const { data } = await admin
    .from("ticket_versions")
    .select("id, version, url, status, created_at")
    .eq("ticket_id", ticketId)
    .order("version", { ascending: true });
  return (data ?? []).map((v) => ({ id: v.id, version: v.version, url: v.url, status: v.status, createdAt: v.created_at }));
}

/** The version the client should see as the main design: accepted one, else latest. */
export function currentVersion(versions: TicketVersion[]): TicketVersion | null {
  if (versions.length === 0) return null;
  return versions.find((v) => v.status === "accepted") ?? versions[versions.length - 1];
}

/** Add the next design version to a ticket. Returns it (or null on failure). */
export async function addTicketVersion(ticketId: string, url: string): Promise<TicketVersion | null> {
  const existing = await listTicketVersions(ticketId);
  const version = (existing[existing.length - 1]?.version ?? 0) + 1;
  const { data, error } = await admin.from("ticket_versions")
    .insert({ ticket_id: ticketId, version, url: url.trim(), status: "pending" })
    .select("id, version, url, status, created_at").single();
  if (error || !data) { console.warn("[versions] add failed:", error?.message); return null; }
  return { id: data.id, version: data.version, url: data.url, status: data.status, createdAt: data.created_at };
}

/** Mark the latest pending version accepted / changes (called on client feedback). */
export async function decideLatestVersion(ticketId: string, decision: "approved" | "changes"): Promise<void> {
  const versions = await listTicketVersions(ticketId);
  const target = [...versions].reverse().find((v) => v.status === "pending") ?? versions[versions.length - 1];
  if (!target) return;
  await admin.from("ticket_versions").update({ status: decision === "approved" ? "accepted" : "changes" }).eq("id", target.id);
}

/** Load a ticket only if it belongs to the client identified by the portal token. */
export async function getPortalTicket(token: string, ticketId: string): Promise<Ticket | null> {
  const client = await getClientByPortalToken(token);
  if (!client) return null;
  const { data } = await admin.from("tickets").select("*").eq("id", ticketId).eq("client_id", client.id).single();
  return data ? mapTicket(data as TicketRow) : null;
}

export async function listTickets(clientId: string): Promise<Ticket[]> {
  const { data } = await admin
    .from("tickets")
    .select("*")
    .eq("client_id", clientId)
    .order("priority", { ascending: false })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => mapTicket(r as TicketRow));
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const { data } = await admin.from("tickets").select("*").eq("id", id).single();
  return data ? mapTicket(data as TicketRow) : null;
}

export interface TimeEntry {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  note: string;
}

export async function getTicketTimeEntries(ticketId: string): Promise<TimeEntry[]> {
  const { data } = await admin
    .from("time_entries")
    .select("id, started_at, ended_at, duration_seconds, note")
    .eq("ticket_id", ticketId)
    .order("started_at", { ascending: false });
  return (data ?? []).map((e) => ({
    id: e.id,
    startedAt: e.started_at,
    endedAt: e.ended_at,
    durationSeconds: e.duration_seconds,
    note: e.note ?? "",
  }));
}

/** Total tracked seconds for a ticket, including any running timer. */
export async function getTicketTotalSeconds(ticketId: string): Promise<number> {
  const entries = await getTicketTimeEntries(ticketId);
  const now = Date.now();
  return entries.reduce((sum, e) => {
    if (e.durationSeconds != null) return sum + e.durationSeconds;
    if (!e.endedAt) return sum + Math.floor((now - new Date(e.startedAt).getTime()) / 1000);
    return sum;
  }, 0);
}

/* -------------------------------------------------------------- Time stats */

export interface RunningTimer {
  ticketId: string;
  clientId: string;
  ticketTitle: string;
  clientName: string;
  startedAt: string;
}

export async function getRunningTimer(): Promise<RunningTimer | null> {
  const { data } = await admin
    .from("time_entries")
    .select("ticket_id, started_at")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const ticket = await getTicket(data.ticket_id);
  if (!ticket) return null;
  const client = await getClientById(ticket.clientId);
  return {
    ticketId: ticket.id,
    clientId: ticket.clientId,
    ticketTitle: ticket.title,
    clientName: client?.name ?? "Client",
    startedAt: data.started_at,
  };
}

export interface TimeStats {
  todaySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  doneThisWeek: number;
  inProgressCount: number;
  queueDepth: number;       // tickets ready to start across all clients
  awaitingClient: number;   // tickets in review (waiting on client)
  avgTurnaroundSeconds: number; // avg created→done for done tickets this month
}

export async function getTimeStats(): Promise<TimeStats> {
  const now = new Date();
  const nowMs = now.getTime();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(startToday); startWeek.setDate(startToday.getDate() - ((now.getDay() + 6) % 7));
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: entries } = await admin
    .from("time_entries")
    .select("started_at, ended_at")
    .or(`ended_at.is.null,ended_at.gte.${startMonth.toISOString()}`);

  const overlap = (startMs: number, endMs: number, windowStart: number) =>
    Math.max(0, Math.min(endMs, nowMs) - Math.max(startMs, windowStart)) / 1000;

  let today = 0, week = 0, month = 0;
  for (const e of entries ?? []) {
    const startMs = new Date(e.started_at).getTime();
    const endMs = e.ended_at ? new Date(e.ended_at).getTime() : nowMs;
    today += overlap(startMs, endMs, startToday.getTime());
    week += overlap(startMs, endMs, startWeek.getTime());
    month += overlap(startMs, endMs, startMonth.getTime());
  }

  const { data: tickets } = await admin.from("tickets").select("status, created_at, updated_at");
  let doneThisWeek = 0, inProgress = 0, queue = 0, awaiting = 0, turnSum = 0, turnCount = 0;
  for (const t of tickets ?? []) {
    if (t.status === "in_progress") inProgress++;
    if (t.status === "ready") queue++;
    if (t.status === "review") awaiting++;
    if (t.status === "done") {
      if (t.updated_at >= startWeek.toISOString()) doneThisWeek++;
      if (t.updated_at >= startMonth.toISOString()) {
        turnSum += (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / 1000;
        turnCount++;
      }
    }
  }

  return {
    todaySeconds: Math.round(today),
    weekSeconds: Math.round(week),
    monthSeconds: Math.round(month),
    doneThisWeek,
    inProgressCount: inProgress,
    queueDepth: queue,
    awaitingClient: awaiting,
    avgTurnaroundSeconds: turnCount ? Math.round(turnSum / turnCount) : 0,
  };
}

export interface DayHours { label: string; seconds: number; }

/** Seconds tracked per day for the current week (Mon–Sun). */
export async function getWeeklyHours(): Promise<DayHours[]> {
  const now = new Date();
  const nowMs = now.getTime();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(startToday); startWeek.setDate(startToday.getDate() - ((now.getDay() + 6) % 7));

  const { data: entries } = await admin
    .from("time_entries")
    .select("started_at, ended_at")
    .or(`ended_at.is.null,ended_at.gte.${startWeek.toISOString()}`);

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days: DayHours[] = labels.map((label, i) => {
    const s = new Date(startWeek); s.setDate(startWeek.getDate() + i);
    const e = new Date(s); e.setDate(s.getDate() + 1);
    return { label, seconds: 0, _s: s.getTime(), _e: Math.min(e.getTime(), nowMs) } as DayHours & { _s: number; _e: number };
  });
  for (const en of entries ?? []) {
    const a = new Date(en.started_at).getTime();
    const b = en.ended_at ? new Date(en.ended_at).getTime() : nowMs;
    for (const d of days as (DayHours & { _s: number; _e: number })[]) {
      d.seconds += Math.max(0, Math.min(b, d._e) - Math.max(a, d._s)) / 1000;
    }
  }
  return days.map((d) => ({ label: d.label, seconds: Math.round(d.seconds) }));
}

export interface UpNext {
  ticketId: string;
  title: string;
  clientId: string;
  clientName: string;
  status: TicketStatus;
  priority: number;
}

/** The single highest-priority ticket to pick up next (ready first, then
    backlog), across all clients. Priority is set by the client. */
export async function getUpNext(): Promise<UpNext | null> {
  const { data } = await admin
    .from("tickets")
    .select("id, title, client_id, status, priority, created_at")
    .in("status", ["ready", "backlog"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });
  if (!data || data.length === 0) return null;
  // Ready-to-start leads, then highest priority, then oldest.
  const rank = (s: string) => (s === "ready" ? 0 : 1);
  const sorted = [...data].sort((a, b) =>
    (rank(a.status) - rank(b.status)) || (b.priority - a.priority) ||
    (a.created_at < b.created_at ? -1 : 1));
  const t = sorted[0];
  const client = await getClientById(t.client_id);
  return {
    ticketId: t.id, title: t.title, clientId: t.client_id,
    clientName: client?.name ?? "Client", status: t.status as TicketStatus, priority: t.priority,
  };
}

export interface StylescapeSummary {
  id: string;
  title: string;
  layoutKey: string;
  shareToken: string;
  createdAt: string;
  filled: number;
  reviewCount: number;
}

export async function listStylescapes(clientId?: string): Promise<StylescapeSummary[]> {
  let q = admin
    .from("stylescapes")
    .select("id, title, layout_key, share_token, created_at")
    .order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data: rows } = await q;
  if (!rows) return [];

  const ids = rows.map((r) => r.id);
  const { data: tiles } = await admin
    .from("tiles")
    .select("stylescape_id, image_url")
    .in("stylescape_id", ids.length ? ids : ["-"]);
  const { data: reviews } = await admin
    .from("reviews")
    .select("stylescape_id")
    .in("stylescape_id", ids.length ? ids : ["-"]);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    layoutKey: r.layout_key,
    shareToken: r.share_token,
    createdAt: r.created_at,
    filled: (tiles ?? []).filter((t) => t.stylescape_id === r.id && t.image_url).length,
    reviewCount: (reviews ?? []).filter((rv) => rv.stylescape_id === r.id).length,
  }));
}

export async function getStylescapeById(id: string): Promise<Stylescape | null> {
  const { data: row } = await admin.from("stylescapes").select("*").eq("id", id).single();
  if (!row) return null;
  const { data: tiles } = await admin
    .from("tiles")
    .select("tile_key, image_url")
    .eq("stylescape_id", id);
  return toStylescape(row as Row, (tiles ?? []) as TileRow[]);
}

export interface StylescapeListItem {
  id: string;
  title: string;
  layoutKey: string;
  clientId: string | null;
  clientName: string;
  ticketId: string | null;
}

export async function listAllStylescapes(): Promise<StylescapeListItem[]> {
  const { data } = await admin
    .from("stylescapes")
    .select("id, title, layout_key, client_id, ticket_id, created_at")
    .order("created_at", { ascending: false });
  if (!data) return [];
  const { data: clients } = await admin.from("clients").select("id, name");
  const nameFor = (id: string | null) => clients?.find((c) => c.id === id)?.name ?? "—";
  return data.map((s) => ({
    id: s.id,
    title: s.title,
    layoutKey: s.layout_key,
    clientId: s.client_id,
    clientName: nameFor(s.client_id),
    ticketId: s.ticket_id,
  }));
}

/** A client's stylescapes not yet attached to any ticket (for the attach picker). */
export async function listUnattachedStylescapes(clientId: string): Promise<{ id: string; title: string }[]> {
  const { data } = await admin
    .from("stylescapes")
    .select("id, title")
    .eq("client_id", clientId)
    .is("ticket_id", null)
    .order("created_at", { ascending: false });
  return (data ?? []).map((s) => ({ id: s.id, title: s.title }));
}

export async function getStylescapeForTicket(ticketId: string): Promise<{ id: string; title: string } | null> {
  const { data } = await admin
    .from("stylescapes")
    .select("id, title")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, title: data.title } : null;
}

export async function getStylescapeByToken(token: string): Promise<Stylescape | null> {
  const { data: row } = await admin
    .from("stylescapes")
    .select("*")
    .eq("share_token", token)
    .single();
  if (!row) return null;
  const { data: tiles } = await admin
    .from("tiles")
    .select("tile_key, image_url")
    .eq("stylescape_id", row.id);
  return toStylescape(row as Row, (tiles ?? []) as TileRow[]);
}

export interface ReviewRow {
  tile_key: string | null;
  score: number;
  note: string | null;
  reviewer_name: string | null;
  created_at: string;
}

export async function getReviews(stylescapeId: string): Promise<ReviewRow[]> {
  const { data } = await admin
    .from("reviews")
    .select("tile_key, score, note, reviewer_name, created_at")
    .eq("stylescape_id", stylescapeId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ReviewRow[];
}
