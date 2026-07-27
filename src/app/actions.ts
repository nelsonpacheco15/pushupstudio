"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { admin, BUCKET, getClientByPortalToken, getClientById, getClientAuthByEmail,
  createInvoice, setInvoiceStatus, addTicketVersion, decideLatestVersion, listTicketVersions,
  notify, listStudioNotifications, listClientNotifications, markStudioNotificationsRead, markClientNotificationsRead,
  getSettings, saveSettings, planAmountFromSettings,
  insertBrandAsset, deleteBrandAsset, type NotificationRecord } from "@/lib/data";
import { planFor, formatEUR } from "@/lib/billing";
import { issueMonthlyInvoice } from "@/lib/invoicing";
import { LAYOUTS, flattenTiles } from "@/lib/layouts";
import { REQUEST_TYPES } from "@/lib/tickets";
import { requireStudio, isStudio, computeToken, AUTH_COOKIE } from "@/lib/auth";
import { hashPassword, signClient, CLIENT_COOKIE, getClientSession } from "@/lib/clientAuth";
import { getStripe, stripeEnabled, priceForPlan } from "@/lib/stripe";
import * as mail from "@/lib/email";

/* --------------------------------------------------------------- AI (Groq) */
/* Everything AI in the app runs on Groq's free tier — see groqChatJSON and
   groqTranscribe further down. `response_format: json_object` requires the
   model to return a JSON *object*, so array results are wrapped in a key. */

export interface Concept {
  name: string;
  direction: string;
  attributes: string[];
  palette: string[];
  background: string;
}

export async function suggestConcepts(brief: string): Promise<Concept[]> {
  await requireStudio();
  const prompt = `You are a brand creative director. From this client briefing, propose 3 distinct stylescape concept directions.
Briefing: """${brief}"""
Return ONLY JSON in this exact shape, no prose, no markdown:
{"concepts": [{"name": "short concept name", "direction": "one sentence on the visual world", "attributes": ["five","single","word","adjectives","here"], "palette": ["#111111","#222222","#333333","#444444","#555555","#666666"], "background": "short note on the intro-block treatment"}]}
Exactly 3 concepts; each has exactly 5 attributes and 6 hex colours.`;
  const r = await groqChatJSON<{ concepts: Concept[] }>(prompt);
  return r.concepts ?? [];
}

export async function suggestPalette(title: string, attrs: string[]): Promise<string[]> {
  await requireStudio();
  const prompt = `Brand: "${title}". Attributes: ${attrs.filter(Boolean).join(", ")}.
Return ONLY JSON in this shape: {"palette": ["#111111", ... exactly 6 hex colours ordered dark to light]}. No prose.`;
  const r = await groqChatJSON<{ palette: string[] }>(prompt);
  return r.palette ?? [];
}

/* ------------------------------------------------------------------- Auth */

export async function login(formData: FormData): Promise<void> {
  const pw = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");
  const expected = process.env.STUDIO_PASSWORD;
  if (!expected || pw !== expected) redirect("/login?error=1");
  const token = await computeToken(pw);
  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(next.startsWith("/") ? next : "/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}

/* ------------------------------------------------------- Client accounts */

export async function clientLogin(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const auth = await getClientAuthByEmail(email);
  const ok = auth && auth.passwordHash === (await hashPassword(password));
  if (!ok) redirect("/enter?error=1");
  (await cookies()).set(CLIENT_COOKIE, await signClient(auth!.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/me");
}

export async function clientLogout(): Promise<void> {
  (await cookies()).delete(CLIENT_COOKIE);
  redirect("/enter");
}

/* -------------------------------------------------------------- Notifications */

export interface NotifFeed { items: NotificationRecord[]; unread: number; }

/** Studio inbox: recent notifications + unread count (polled by the bell). */
export async function fetchStudioNotifications(): Promise<NotifFeed> {
  if (!(await isStudio())) return { items: [], unread: 0 };
  const items = await listStudioNotifications();
  return { items, unread: items.filter((n) => !n.readAt).length };
}

export async function readStudioNotifications(): Promise<void> {
  await requireStudio();
  await markStudioNotificationsRead();
}

/** Client inbox: the logged-in client's notifications + unread count. */
export async function fetchClientNotifications(): Promise<NotifFeed> {
  const clientId = await getClientSession();
  if (!clientId) return { items: [], unread: 0 };
  const items = await listClientNotifications(clientId);
  return { items, unread: items.filter((n) => !n.readAt).length };
}

export async function readClientNotifications(): Promise<void> {
  const clientId = await getClientSession();
  if (clientId) await markClientNotificationsRead(clientId);
}

/* ----------------------------------------------------------------- Clients */

export async function createClient(formData: FormData): Promise<void> {
  await requireStudio();
  const name = String(formData.get("name") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const brandColor = String(formData.get("brandColor") || "").trim() || "#D2452B";
  const brandFont = String(formData.get("brandFont") || "").trim();
  const contactsRaw = String(formData.get("contacts") || "");
  const language = formData.get("language") === "pt" ? "pt" : "en";
  const plan = String(formData.get("plan") || "").trim() || "growth";
  const method = formData.get("method") === "stripe" ? "stripe" : "bank_transfer";
  const password = String(formData.get("password") || "");
  const logo = formData.get("logo");
  if (!name) return; // ignore empty submits

  let logoUrl: string | null = null;
  if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(logo.type)) throw new Error("Logo must be an image file.");
    const ext = (logo.type.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
    const path = `client-logos/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await logo.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType: logo.type, upsert: true });
    if (upErr) throw new Error(upErr.message);
    logoUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const insertRow: Record<string, unknown> = { name, company, email, brand_color: brandColor, brand_font: brandFont, logo_url: logoUrl, language, plan, payment_method: method };
  if (password) insertRow.password_hash = await hashPassword(password);
  const { data, error } = await admin
    .from("clients")
    .insert(insertRow)
    .select("id, name, email, portal_token")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not create client.");

  const contactEmails = contactsRaw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  if (contactEmails.length) {
    await admin.from("client_contacts").insert(contactEmails.map((e) => ({ client_id: data.id, email: e })));
  }

  // Best-effort notifications: welcome the primary contact + everyone invited.
  await mail.emailClientWelcome({ name: data.name, email: data.email ?? "", portalToken: data.portal_token, language });
  for (const e of contactEmails) {
    await mail.emailClientWelcome({ name: data.name, email: e, portalToken: data.portal_token, language });
  }
  await mail.emailStudioNewClient(data.name, company, language);
  await notify({ audience: "studio", clientId: data.id, type: "client_added",
    title: `New athlete: ${data.name}`, body: company || "", link: `/client/${data.id}` });

  // First invoice for the plan → recorded in the system + emailed to client and studio.
  const settings = await getSettings();
  const p = planFor(plan);
  const amountCents = planAmountFromSettings(plan, settings);
  const now = new Date();
  const periodLabel = now.toLocaleDateString(language === "pt" ? "pt-PT" : "en-GB", { month: "long", year: "numeric" });
  const dueAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // net 7 days
  const invoice = await createInvoice({ clientId: data.id, plan, amountCents, method, periodLabel, dueAt });
  if (invoice) {
    await mail.emailInvoiceIssued({ ...invoice, clientName: data.name },
      { name: data.name, email: data.email ?? "", language, portalToken: data.portal_token },
      { issuer: { name: settings.legalName, iban: settings.iban, bank: settings.bank } });
    await notify({ audience: "client", clientId: data.id, type: "invoice",
      title: `Invoice ${invoice.number}`, body: `${p.label} — ${formatEUR(amountCents)}`, link: "/me" });
  }

  revalidatePath("/");
  revalidatePath("/billing");
  redirect(`/client/${data.id}`);
}

export async function updateClient(formData: FormData): Promise<void> {
  await requireStudio();
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing client.");
  const name = String(formData.get("name") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const brandColor = String(formData.get("brandColor") || "").trim() || "#D2452B";
  const brandFont = String(formData.get("brandFont") || "").trim();
  const contactsRaw = String(formData.get("contacts") || "");
  const language = formData.get("language") === "pt" ? "pt" : "en";
  const plan = String(formData.get("plan") || "").trim();
  const method = formData.get("method");
  const password = String(formData.get("password") || "");
  const logo = formData.get("logo");

  const patch: Record<string, unknown> = { company, email, brand_color: brandColor, brand_font: brandFont, language };
  if (name) patch.name = name;
  if (plan) patch.plan = plan;
  if (method === "stripe" || method === "bank_transfer") patch.payment_method = method;
  if (password) patch.password_hash = await hashPassword(password);
  if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(logo.type)) throw new Error("Logo must be an image file.");
    const ext = (logo.type.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
    const path = `client-logos/${id}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await logo.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType: logo.type, upsert: true });
    if (upErr) throw new Error(upErr.message);
    patch.logo_url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  const { error } = await admin.from("clients").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  const contactEmails = contactsRaw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  if (contactEmails.length) {
    await admin.from("client_contacts").insert(contactEmails.map((e) => ({ client_id: id, email: e })));
  }
  revalidatePath(`/client/${id}`);
  revalidatePath("/");
}

/* ------------------------------------------------------------------ Billing */

export async function markInvoicePaid(invoiceId: string): Promise<void> {
  await requireStudio();
  await setInvoiceStatus(invoiceId, "paid");
  revalidatePath("/billing");
}

export async function voidInvoice(invoiceId: string): Promise<void> {
  await requireStudio();
  await setInvoiceStatus(invoiceId, "void");
  revalidatePath("/billing");
}

/** Issue the next invoice for a client (e.g. next month's bank-transfer bill). */
export async function issueInvoiceForClient(clientId: string): Promise<void> {
  await requireStudio();
  const client = await getClientById(clientId);
  if (!client) throw new Error("Client not found.");
  const settings = await getSettings();
  await issueMonthlyInvoice(client, settings);
  revalidatePath("/billing");
  revalidatePath(`/client/${clientId}/manage`);
}

/** Client-initiated: start a Stripe subscription checkout for the logged-in
    client's plan. Redirects to Stripe's hosted checkout. */
export async function startClientCheckout(): Promise<void> {
  const clientId = await getClientSession();
  if (!clientId) redirect("/enter");
  const client = await getClientById(clientId);
  if (!client) redirect("/enter");

  const stripe = getStripe();
  if (!stripe || !stripeEnabled()) redirect("/me?billing=unavailable");
  const price = priceForPlan(client.plan);
  if (!price) redirect("/me?billing=unpriced");

  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const { data: row } = await admin.from("clients").select("stripe_customer_id").eq("id", clientId).single();
  let customerId = (row as { stripe_customer_id?: string | null } | null)?.stripe_customer_id || null;
  if (!customerId) {
    const customer = await stripe!.customers.create({ email: client.email || undefined, name: client.name, metadata: { clientId } });
    customerId = customer.id;
    await admin.from("clients").update({ stripe_customer_id: customerId }).eq("id", clientId);
  }

  const session = await stripe!.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: price!, quantity: 1 }],
    success_url: `${appUrl}/me?paid=1`,
    cancel_url: `${appUrl}/me`,
    metadata: { clientId },
    subscription_data: { metadata: { clientId } },
  });
  if (!session.url) redirect("/me?billing=error");
  redirect(session.url!);
}

/* -------------------------------------------------------------- Settings */

export async function updateSettings(formData: FormData): Promise<void> {
  await requireStudio();
  const s = (k: string) => String(formData.get(k) || "").trim();
  // Plan prices entered in euros; stored in cents.
  const toCents = (v: string) => String(Math.max(0, Math.round(parseFloat(v.replace(",", ".")) * 100)) || 0);
  await saveSettings({
    legalName: s("legalName"), vat: s("vat"), address: s("address"),
    iban: s("iban"), bank: s("bank"), studioEmail: s("studioEmail"), fromEmail: s("fromEmail"),
    growthCents: toCents(s("growthEuros")), scaleCents: toCents(s("scaleEuros")),
    slaHours: String(Math.max(1, Math.round(Number(s("slaHours")) || 45))),
    autoInvoice: formData.get("autoInvoice") === "on" ? "on" : "off",
  });
  revalidatePath("/settings");
  revalidatePath("/billing");
  revalidatePath("/");
}

export async function setOnboardingStep(clientId: string, key: string, done: boolean): Promise<void> {
  await requireStudio();
  const { data } = await admin.from("clients").select("onboarding").eq("id", clientId).single();
  const current = (data?.onboarding as Record<string, boolean>) ||
    { registration: true, onboarding: false, whatsapp: false, drive: false };
  const { error } = await admin.from("clients").update({ onboarding: { ...current, [key]: done } }).eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/client/${clientId}`);
}

export async function deleteClient(id: string): Promise<void> {
  await requireStudio();
  const { error } = await admin.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

/* ----------------------------------------------------------------- Brand Hub */

export async function saveBrandInfo(clientId: string, formData: FormData): Promise<void> {
  await requireStudio();
  const palette = String(formData.get("palette") || "")
    .split(/[\s,;]+/).map((s) => s.trim()).filter((s) => /^#?[0-9a-fA-F]{3,8}$/.test(s))
    .map((s) => (s.startsWith("#") ? s : `#${s}`)).slice(0, 12);
  const guidelines = String(formData.get("guidelines") || "").trim();
  const { error } = await admin.from("clients").update({ brand_palette: palette, brand_guidelines: guidelines }).eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/client/${clientId}/manage`);
}

export async function uploadBrandAsset(clientId: string, formData: FormData): Promise<void> {
  await requireStudio();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > 25 * 1024 * 1024) throw new Error("File too large (max 25MB).");
  const safeName = (file.name || "asset").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `brand-assets/${clientId}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true });
  if (upErr) throw new Error(upErr.message);
  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const kind = file.type.startsWith("image/") ? "image" : "file";
  await insertBrandAsset(clientId, file.name || safeName, url, kind);
  revalidatePath(`/client/${clientId}/manage`);
}

export async function removeBrandAsset(assetId: string, clientId: string): Promise<void> {
  await requireStudio();
  await deleteBrandAsset(assetId);
  revalidatePath(`/client/${clientId}/manage`);
}

export async function addClientContact(clientId: string, formData: FormData): Promise<void> {
  await requireStudio();
  const email = String(formData.get("email") || "").trim();
  const name = String(formData.get("name") || "").trim();
  if (!email) return;
  await admin.from("client_contacts").insert({ client_id: clientId, email, name: name || null });
  revalidatePath(`/client/${clientId}/manage`);
}

export async function removeClientContact(contactId: string, clientId: string): Promise<void> {
  await requireStudio();
  await admin.from("client_contacts").delete().eq("id", contactId);
  revalidatePath(`/client/${clientId}/manage`);
}

/* -------------------------------------------------------------- Stylescapes */

export async function createStylescape(formData: FormData): Promise<void> {
  await requireStudio();
  const clientId = String(formData.get("clientId") || "") || null;
  const { data, error } = await admin
    .from("stylescapes")
    .insert({
      client_id: clientId,
      title: "Untitled concept",
      concept_note: "",
      layout_key: "editorial",
      attributes: ["", "", "", "", ""],
      palette: LAYOUTS.editorial.palette,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not create stylescape.");
  if (clientId) revalidatePath(`/client/${clientId}`);
  redirect(`/build/${data.id}`);
}

export interface SavePatch {
  title?: string;
  conceptNote?: string;
  layoutKey?: string;
  attributes?: string[];
  palette?: string[];
}

export async function saveStylescape(id: string, patch: SavePatch): Promise<void> {
  await requireStudio();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.conceptNote !== undefined) row.concept_note = patch.conceptNote;
  if (patch.layoutKey !== undefined) row.layout_key = patch.layoutKey;
  if (patch.attributes !== undefined) row.attributes = patch.attributes;
  if (patch.palette !== undefined) row.palette = patch.palette;
  const { error } = await admin.from("stylescapes").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteStylescape(id: string): Promise<void> {
  await requireStudio();
  const { error } = await admin.from("stylescapes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

/* ----------------------------------------------------------------- Tickets */

export async function createTicket(formData: FormData): Promise<void> {
  const title = String(formData.get("title") || "").trim() || "Untitled request";
  const description = String(formData.get("description") || "").trim();
  const createdBy = formData.get("createdBy") === "client" ? "client" : "studio";
  const portalToken = String(formData.get("portalToken") || "");
  const form = {
    type: String(formData.get("type") || ""),
    deadline: String(formData.get("deadline") || ""),
    references: String(formData.get("references") || ""),
  };

  // Resolve the client. For portal (client) submissions ALWAYS derive the
  // client from the secret portal token — never trust a form-supplied id, or a
  // client could inject tickets into another client's board.
  let clientId: string;
  let client = null;
  if (createdBy === "client") {
    if (!portalToken) throw new Error("Missing portal token.");
    client = await getClientByPortalToken(portalToken);
    if (!client) throw new Error("Invalid portal link.");
    clientId = client.id;
  } else {
    await requireStudio();
    clientId = String(formData.get("clientId") || "");
    if (!clientId) throw new Error("Missing client.");
  }

  const priority = Math.max(0, Math.min(2, Number(formData.get("priority")) || 0));
  const { data: created, error } = await admin.from("tickets").insert({
    client_id: clientId,
    title,
    description,
    form,
    status: "backlog",
    created_by: createdBy,
    priority,
  }).select("id").single();
  if (error) throw new Error(error.message);

  // Notify on client-submitted requests.
  if (createdBy === "client" && client) {
    await mail.emailRequestReceived(
      { name: client.name, email: client.email, portalToken: client.portalToken, language: client.language },
      title
    );
    await mail.emailStudioNewRequest(client.name, title);
    await notify({ audience: "studio", clientId, type: "new_request",
      title: `New request from ${client.name}`, body: title, link: created ? `/ticket/${created.id}` : `/client/${clientId}` });
  }

  revalidatePath(`/client/${clientId}`);
  if (createdBy === "client") {
    revalidatePath(`/portal/${portalToken}`);
  } else {
    redirect(`/client/${clientId}`);
  }
}

export async function moveTicket(ticketId: string, clientId: string, status: string): Promise<void> {
  await requireStudio();

  // Read current status/title so we only email on a real transition.
  const { data: current } = await admin
    .from("tickets").select("status, title").eq("id", ticketId).single();

  if (status === "in_progress") {
    const { data: existing } = await admin
      .from("tickets")
      .select("id")
      .eq("client_id", clientId)
      .eq("status", "in_progress")
      .neq("id", ticketId);
    if (existing && existing.length > 0) {
      throw new Error("This client already has a ticket in progress. Move that one out first.");
    }
  }
  const { error } = await admin
    .from("tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) {
    // 23505 = unique_violation on the "one in_progress per client" index,
    // possible if two moves race past the pre-check above.
    if (error.code === "23505") {
      throw new Error("This client already has a ticket in progress. Move that one out first.");
    }
    throw new Error(error.message);
  }

  // Client-facing status emails, best-effort, only on an actual change.
  if (current && current.status !== status) {
    const client = await getClientById(clientId);
    if (client) {
      const lite = { name: client.name, email: client.email, portalToken: client.portalToken, language: client.language };
      const title = current.title || "your request";
      if (status === "in_progress") await mail.emailInProgress(lite, title);
      else if (status === "review") await mail.emailReadyForReview(lite, title);
      else if (status === "done") await mail.emailDone(lite, title);

      if (status === "in_progress") await notify({ audience: "client", clientId, type: "in_progress", title: "We're on it 💪", body: title, link: `/me/${ticketId}` });
      else if (status === "review") await notify({ audience: "client", clientId, type: "review", title: "Ready for your review", body: title, link: `/me/${ticketId}` });
      else if (status === "done") await notify({ audience: "client", clientId, type: "done", title: "Completed ✓", body: title, link: `/me/${ticketId}` });
    }
  }

  revalidatePath(`/client/${clientId}`);
  revalidatePath(`/ticket/${ticketId}`);
  revalidatePath("/");
}

export async function deleteTicket(ticketId: string, clientId: string): Promise<void> {
  await requireStudio();
  const { error } = await admin.from("tickets").delete().eq("id", ticketId);
  if (error) throw new Error(error.message);
  revalidatePath(`/client/${clientId}`);
  redirect(`/client/${clientId}`);
}

/** Studio: attach / update the Google Drive design link on a ticket (no new version). */
export async function setDeliverableUrl(ticketId: string, url: string): Promise<void> {
  await requireStudio();
  const { error } = await admin.from("tickets").update({ deliverable_url: url.trim() || null }).eq("id", ticketId);
  if (error) throw new Error(error.message);
  revalidatePath(`/ticket/${ticketId}`);
}

/** Studio: add a new design version link (used for the initial design and each
    revision after a change request). Mirrors it onto the ticket's deliverable_url
    for display/emails and moves the ticket to Needs Review. */
export async function addDeliverableVersion(ticketId: string, url: string): Promise<void> {
  await requireStudio();
  const clean = url.trim();
  if (!clean) return;

  // Legacy tickets had a single deliverable_url with no version rows. Capture that
  // existing design as v1 (marked per the client's last decision) before adding the new one.
  const existing = await listTicketVersions(ticketId);
  if (existing.length === 0) {
    const { data: cur } = await admin.from("tickets").select("deliverable_url").eq("id", ticketId).single();
    const oldUrl = (cur as { deliverable_url?: string | null } | null)?.deliverable_url?.trim();
    if (oldUrl && oldUrl !== clean) {
      const { data: fb } = await admin.from("ticket_feedback").select("decision")
        .eq("ticket_id", ticketId).order("created_at", { ascending: false }).limit(1);
      const lastDecision = (fb?.[0] as { decision?: string } | undefined)?.decision;
      await admin.from("ticket_versions").insert({
        ticket_id: ticketId, version: 1, url: oldUrl,
        status: lastDecision === "changes" ? "changes" : lastDecision === "approved" ? "accepted" : "pending",
      });
    }
  }

  const version = await addTicketVersion(ticketId, clean);
  const { data: t } = await admin.from("tickets").select("client_id, status, title").eq("id", ticketId).single();
  await admin.from("tickets").update({ deliverable_url: clean, status: "review", updated_at: new Date().toISOString() }).eq("id", ticketId);

  const row = t as { client_id: string; status: string; title: string } | null;
  if (row) {
    const client = await getClientById(row.client_id);
    if (client) {
      const lite = { name: client.name, email: client.email, portalToken: client.portalToken, language: client.language };
      const title = row.title || "your request";
      const n = version?.version ?? 1;
      if (n > 1) {
        // Revision after a change request: email the client the new version + echo their last request.
        const { data: fb } = await admin.from("ticket_feedback").select("note")
          .eq("ticket_id", ticketId).eq("decision", "changes").order("created_at", { ascending: false }).limit(1);
        const changeNote = (fb?.[0] as { note?: string } | undefined)?.note || "";
        await mail.emailNewVersion(lite, title, n, changeNote);
        await notify({ audience: "client", clientId: client.id, type: "new_version",
          title: `New version ready (v${n})`, body: title, link: `/me/${ticketId}` });
      } else {
        await mail.emailReadyForReview(lite, title);
        await notify({ audience: "client", clientId: client.id, type: "review",
          title: "Your design is ready to review", body: title, link: `/me/${ticketId}` });
      }
    }
    revalidatePath(`/client/${row.client_id}`);
  }
  revalidatePath(`/ticket/${ticketId}`);
  if (version) revalidatePath("/");
}

/** Client: evaluate the delivered design from the portal. */
export async function submitTicketFeedback(
  token: string, ticketId: string, score: number, note: string, decision: "approved" | "changes"
): Promise<void> {
  const client = await getClientByPortalToken(token);
  if (!client) throw new Error("Invalid portal link.");
  const { data: ticket } = await admin.from("tickets").select("id, title").eq("id", ticketId).eq("client_id", client.id).single();
  if (!ticket) throw new Error("Ticket not found.");

  const clampedScore = Math.max(0, Math.min(10, Math.round(Number(score) || 0)));
  const { error } = await admin.from("ticket_feedback").insert({
    ticket_id: ticketId, score: clampedScore, note: note || "", decision,
  });
  if (error) throw new Error(error.message);

  // Record the client's decision on the current design version.
  await decideLatestVersion(ticketId, decision);

  // Approve → Done. Request changes → In Progress (falls back to Ready if the
  // client already has a ticket in progress, to respect the WIP rule).
  const newStatus = decision === "approved" ? "done" : "in_progress";
  const { error: mErr } = await admin
    .from("tickets").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", ticketId);
  if (mErr?.code === "23505") {
    await admin.from("tickets").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", ticketId);
  }

  await mail.emailStudioNewRequest(client.name, `Feedback on "${ticket.title}" — ${decision === "approved" ? "APPROVED ✓" : "changes requested"}`);
  await notify({ audience: "studio", clientId: client.id, type: decision === "approved" ? "approved" : "changes",
    title: decision === "approved" ? `${client.name} approved a design ✓` : `${client.name} requested changes ↻`,
    body: `${ticket.title}${note ? ` — “${note}”` : ""}`, link: `/ticket/${ticketId}` });

  revalidatePath(`/portal/${token}/${ticketId}`);
  revalidatePath(`/portal/${token}`);
  revalidatePath(`/ticket/${ticketId}`);
  revalidatePath(`/client/${client.id}`);
  revalidatePath("/");
}

/* ------------------------------------------------------------- Time tracking */

async function stopRunningEntries(): Promise<void> {
  const { data } = await admin.from("time_entries").select("id, started_at").is("ended_at", null);
  const now = Date.now();
  for (const e of data ?? []) {
    const dur = Math.max(0, Math.round((now - new Date(e.started_at).getTime()) / 1000));
    const { error } = await admin
      .from("time_entries")
      .update({ ended_at: new Date().toISOString(), duration_seconds: dur })
      .eq("id", e.id);
    if (error) throw new Error(`Could not stop timer: ${error.message}`);
  }
}

export async function startTimer(ticketId: string, clientId: string): Promise<void> {
  await requireStudio();
  await stopRunningEntries(); // only one timer runs at a time
  const { error } = await admin.from("time_entries").insert({ ticket_id: ticketId });
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/client/${clientId}`);
  revalidatePath(`/ticket/${ticketId}`);
}

export async function stopTimer(ticketId?: string, clientId?: string): Promise<void> {
  await requireStudio();
  await stopRunningEntries();
  revalidatePath("/");
  if (clientId) revalidatePath(`/client/${clientId}`);
  if (ticketId) revalidatePath(`/ticket/${ticketId}`);
}

/* ------------------------------------------------ Stylescape from a ticket */

export async function attachStylescapeToTicket(stylescapeId: string, ticketId: string): Promise<void> {
  await requireStudio();
  const { error } = await admin
    .from("stylescapes")
    .update({ ticket_id: ticketId })
    .eq("id", stylescapeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/ticket/${ticketId}`);
  revalidatePath("/stylescapes");
}

export async function createStylescapeForTicket(ticketId: string): Promise<void> {
  await requireStudio();
  const { data: ticket } = await admin
    .from("tickets")
    .select("client_id, title")
    .eq("id", ticketId)
    .single();
  if (!ticket) throw new Error("Ticket not found.");

  const { data, error } = await admin
    .from("stylescapes")
    .insert({
      client_id: ticket.client_id,
      ticket_id: ticketId,
      title: ticket.title || "Untitled concept",
      concept_note: "",
      layout_key: "editorial",
      attributes: ["", "", "", "", ""],
      palette: LAYOUTS.editorial.palette,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not create stylescape.");
  redirect(`/build/${data.id}`);
}

/* ---------------------------------------------------- Voice → structured brief */

async function groqTranscribe(file: File): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set on the server.");
  const fd = new FormData();
  fd.set("file", file, file.name || "request.webm");
  fd.set("model", process.env.GROQ_WHISPER_MODEL || "whisper-large-v3");
  fd.set("response_format", "json");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Transcription failed (${res.status}). ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

async function groqChatJSON<T>(prompt: string, maxTokens = 1200): Promise<T> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set on the server.");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_LLM_MODEL || "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Formatting failed (${res.status}). ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(text) as T;
}

/* The brief the DESIGN TEAM sees — the studio's standard 12-section structure.
   The client never sees this or the raw transcript. */
const BRIEF_STRUCTURE = `1) Enquadramento — o que é a marca/produto/pedido e porque existe
2) Problema a resolver
3) Objetivos — objetivo principal + objetivos secundários
4) Público e perceção pretendida — públicos-alvo + atributos/perceção desejada
5) Proposta conceptual — ideia-chave / ponto de partida criativo
6) Âmbito do projeto — entregáveis organizados por fases
7) Fora do âmbito
8) Requisitos e restrições
9) Critérios de sucesso
10) Processo proposto — checkpoints
11) Inputs necessários do cliente
12) Entregáveis finais`;

const briefPrompt = (transcript: string) => `You are a senior brand strategist at a design studio, writing a creative brief FOR THE DESIGN TEAM based on what a client described out loud.
Client transcript:
"""${transcript}"""
Write a complete, professional brief that follows EXACTLY this section structure:
${BRIEF_STRUCTURE}
Rules:
- Write in the SAME LANGUAGE the client spoke (translate the section titles into that language too).
- Base it on what the client said, expanded with reasonable professional inference appropriate to the request.
- Keep it proportional: a small request stays concise; a full brand project is more detailed.
- Where the client did not specify something, either make a sensible professional assumption or write "A confirmar com o cliente." NEVER write questions addressed to the reader.
- Be concrete and actionable. Do not contradict the client.
Return ONLY JSON: {"title": "3-6 word project title", "type": "best match from [${REQUEST_TYPES.join(", ")}]", "priority": 0 for normal / 1 for high / 2 for urgent — infer from the client's tone and deadline, "deadline": "date/timeframe if the client mentioned one, else empty string", "references": "any references the client mentioned, else empty string", "brief": "the full brief as text, all 12 numbered sections, blank line between sections"}`;

interface BriefResult { title: string; type: string; priority: number; deadline: string; references: string; brief: string; }

/** Client voice flow: upload audio → transcribe → write the brief → create the
    ticket, all server-side. The client never sees the transcript or the brief. */
export async function submitVoiceRequest(formData: FormData): Promise<void> {
  const portalToken = String(formData.get("portalToken") || "");
  const audio = formData.get("audio");
  if (!(audio instanceof File)) throw new Error("No audio recording received.");
  if (!portalToken) throw new Error("Missing portal token.");
  const client = await getClientByPortalToken(portalToken);
  if (!client) throw new Error("Invalid portal link.");

  const transcript = await groqTranscribe(audio);
  if (!transcript) throw new Error("Could not hear anything in that recording. Try again.");
  const draft = await groqChatJSON<BriefResult>(briefPrompt(transcript), 3000);

  const title = (draft.title || "Voice request").trim();
  const priority = Math.max(0, Math.min(2, Number(draft.priority) || 0));
  const { error } = await admin.from("tickets").insert({
    client_id: client.id,
    title,
    description: draft.brief || "",
    form: { type: draft.type || "", deadline: draft.deadline || "", references: draft.references || "" },
    status: "backlog",
    created_by: "client",
    priority,
  });
  if (error) throw new Error(error.message);

  await mail.emailRequestReceived({ name: client.name, email: client.email, portalToken: client.portalToken, language: client.language }, title);
  await mail.emailStudioNewRequest(client.name, title);

  revalidatePath(`/client/${client.id}`);
  revalidatePath(`/portal/${portalToken}`);
}

/* --------------------------------------------------------------- Tile images */

const ALLOWED_IMAGE_TYPES = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "image/avif",
];

export async function uploadTileImage(formData: FormData): Promise<string> {
  await requireStudio();
  const id = String(formData.get("id"));
  const tileKey = String(formData.get("tileKey"));
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided.");
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error("Only image files are allowed.");

  // Only allow writing to a tile key that actually exists in this stylescape's layout.
  const { data: ss } = await admin.from("stylescapes").select("layout_key").eq("id", id).single();
  if (!ss) throw new Error("Stylescape not found.");
  if (!flattenTiles(ss.layout_key).some((t) => t.id === tileKey)) throw new Error("Invalid tile.");

  const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
  const path = `${id}/${tileKey}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  const { error: dbErr } = await admin
    .from("tiles")
    .upsert(
      { stylescape_id: id, tile_key: tileKey, image_url: url },
      { onConflict: "stylescape_id,tile_key" }
    );
  if (dbErr) throw new Error(dbErr.message);

  revalidatePath(`/build/${id}`);
  return url;
}

export async function removeTileImage(id: string, tileKey: string): Promise<void> {
  await requireStudio();
  const { error } = await admin
    .from("tiles")
    .update({ image_url: null })
    .eq("stylescape_id", id)
    .eq("tile_key", tileKey);
  if (error) throw new Error(error.message);
  revalidatePath(`/build/${id}`);
}

/* -------------------------------------------------------------- Client review */

export interface ReviewPayload {
  reviewerName: string;
  overallScore: number;
  overallNote: string;
  tiles: Record<string, { score: number; note: string }>;
}

export async function submitReview(token: string, payload: ReviewPayload): Promise<void> {
  const { data: ss } = await admin
    .from("stylescapes")
    .select("id")
    .eq("share_token", token)
    .single();
  if (!ss) throw new Error("Stylescape not found.");

  const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(Number(n) || 0)));

  const rows = [
    {
      stylescape_id: ss.id,
      tile_key: null,
      score: clamp(payload.overallScore),
      note: payload.overallNote,
      reviewer_name: payload.reviewerName,
    },
    ...Object.entries(payload.tiles).map(([tile_key, r]) => ({
      stylescape_id: ss.id,
      tile_key,
      score: clamp(r.score),
      note: r.note,
      reviewer_name: payload.reviewerName,
    })),
  ];

  const { error } = await admin.from("reviews").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath(`/build/${ss.id}`);
}
