import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClientById, getClientContacts, getOnboarding, listInvoicesForClient, listBrandAssets,
  ONBOARDING_KEYS, ONBOARDING_LABELS,
} from "@/lib/data";
import { formatEUR, planFor } from "@/lib/billing";
import {
  updateClient, deleteClient, addClientContact, removeClientContact,
  setOnboardingStep, issueInvoiceForClient, markInvoicePaid, setClientStatus,
  saveBrandInfo, uploadBrandAsset, removeBrandAsset, setContactPassword, saveClientWhatsApp, resendSetupInvite,
} from "@/app/actions";
import CopyButton from "@/components/CopyButton";
import { DS, dsInput, dsTextarea, dsBtn, dsBtnGhost, dsLabel } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  return { title: client ? `${client.name} · Manage` : "Manage" };
}

const mono = (extra: React.CSSProperties = {}) => ({ fontFamily: DS.mono, ...extra });

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: DS.radius, padding: 22, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={mono({ fontSize: 10, letterSpacing: 1, color: DS.faint })}>[ {title} ]</div>
        {action}
      </div>
      {children}
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = { paid: "#7FB77E", sent: DS.amber, void: DS.faint, draft: DS.mute };

export default async function ManageClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();
  const [contacts, onboarding, invoices, assets] = await Promise.all([
    getClientContacts(id), getOnboarding(id), listInvoicesForClient(id), listBrandAssets(id),
  ]);
  const paused = client.status === "paused";
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const portalUrl = `${appUrl}/portal/${client.portalToken}`;

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, color: DS.text }}>
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "30px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <Link href={`/client/${id}`} style={mono({ fontSize: 12, color: DS.mute })}>← The Circuit</Link>
          <span style={mono({ fontSize: 11, color: DS.faint })}>MANAGE ATHLETE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "10px 0 24px" }}>
          {client.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={client.logoUrl} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover", border: `1px solid ${DS.border}` }} />
          )}
          <h1 style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 30, letterSpacing: -0.5, margin: 0 }}>{client.name}</h1>
          {paused && <span style={mono({ fontSize: 10, letterSpacing: 1, color: DS.amber, border: `1px solid ${DS.amber}`, padding: "3px 8px" })}>PAUSED</span>}
        </div>

        {/* PROFILE */}
        <Section title="PROFILE">
          <form action={updateClient}>
            <input type="hidden" name="id" value={id} />
            <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Name</label>
            <input name="name" defaultValue={client.name} style={dsInput} />
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Company</label>
                <input name="company" defaultValue={client.company} style={dsInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Primary email</label>
                <input name="email" type="email" defaultValue={client.email} style={dsInput} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Language</label>
                <select name="language" defaultValue={client.language} style={dsInput}>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Brand colour</label>
                <input name="brandColor" type="color" defaultValue={client.brandColor} style={{ ...dsInput, height: 42, padding: 4 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Brand font</label>
                <input name="brandFont" defaultValue={client.brandFont} placeholder="Space Grotesk" style={dsInput} />
              </div>
            </div>
            <label style={{ ...dsLabel, display: "block", margin: "12px 0 6px" }}>Logo {client.logoUrl ? "(replaces current)" : ""}</label>
            <input name="logo" type="file" accept="image/*" style={{ ...dsInput, padding: 8 }} />
            <div style={{ marginTop: 16 }}><button type="submit" style={dsBtn}>Save profile</button></div>
          </form>
        </Section>

        {/* ACCOUNT & BILLING SETUP */}
        <Section title="ACCOUNT & PLAN">
          <form action={updateClient}>
            <input type="hidden" name="id" value={id} />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Plan</label>
                <select name="plan" defaultValue={client.plan} style={dsInput}>
                  <option value="growth">Growth</option>
                  <option value="scale">Scale</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Payment method</label>
                <select name="method" defaultValue={client.paymentMethod} style={dsInput}>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="stripe">Card (Stripe)</option>
                </select>
              </div>
            </div>
            <label style={{ ...dsLabel, display: "block", margin: "12px 0 6px" }}>Google Drive folder</label>
            <input name="driveFolder" type="url" defaultValue={client.driveFolderUrl} placeholder="https://drive.google.com/drive/folders/…" style={dsInput} />
            <label style={{ ...dsLabel, display: "block", margin: "12px 0 6px" }}>Locker Room password (manual)</label>
            <input name="password" type="text" placeholder="Set directly (or use Send invite below)" autoComplete="off" style={dsInput} />
            <div style={{ marginTop: 16 }}><button type="submit" style={dsBtn}>Save account</button></div>
          </form>
          <div style={{ borderTop: `1px solid ${DS.border}`, marginTop: 18, paddingTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={dsLabel}>Access invite</div>
              <div style={{ fontSize: 12, color: DS.mute, marginTop: 3 }}>Emails the primary contact a link to set their own password.</div>
            </div>
            <form action={resendSetupInvite.bind(null, "client", id, id)}>
              <button type="submit" style={dsBtnGhost}>Send setup invite</button>
            </form>
            {client.driveFolderUrl && (
              <a href={client.driveFolderUrl} target="_blank" rel="noreferrer" style={{ ...dsBtnGhost, textDecoration: "none" }}>📁 Open Drive</a>
            )}
          </div>
          <div style={{ borderTop: `1px solid ${DS.border}`, marginTop: 18, paddingTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...dsLabel }}>Subscription</div>
              <div style={{ fontSize: 12.5, color: paused ? DS.amber : "#7FB77E", marginTop: 3 }}>
                {paused ? "Paused — recurring invoices are on hold." : "Active — billed monthly."}
              </div>
            </div>
            <form action={setClientStatus.bind(null, id, paused ? "active" : "paused")}>
              <button type="submit" style={paused ? dsBtn : { ...dsBtnGhost }}>{paused ? "Resume" : "Pause billing"}</button>
            </form>
          </div>

          <div style={{ borderTop: `1px solid ${DS.border}`, marginTop: 18, paddingTop: 16 }}>
            <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Locker Room link (share)</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ ...mono({ fontSize: 12, color: DS.mute }), flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{portalUrl}</div>
              <CopyButton text={portalUrl} label="Copy link" />
            </div>
          </div>
        </Section>

        {/* BILLING */}
        <Section title="BILLING" action={
          <form action={issueInvoiceForClient.bind(null, id)}>
            <button type="submit" style={{ ...dsBtnGhost, padding: "6px 12px", fontSize: 12 }}>+ Issue invoice</button>
          </form>
        }>
          {invoices.length === 0 && <div style={{ color: DS.mute, fontSize: 13 }}>No invoices yet.</div>}
          {invoices.map((inv) => (
            <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${DS.border}` }}>
              <span style={mono({ fontSize: 12, color: DS.text, width: 108 })}>{inv.number}</span>
              <span style={{ fontSize: 12.5, color: DS.mute, flex: 1 }}>{inv.periodLabel} · {planFor(inv.plan).label}</span>
              <span style={mono({ fontSize: 12.5, color: DS.text })}>{formatEUR(inv.amountCents)}</span>
              <span style={mono({ fontSize: 10.5, letterSpacing: 0.5, color: STATUS_COLOR[inv.status] ?? DS.mute, width: 54, textAlign: "right" })}>{inv.status.toUpperCase()}</span>
              {inv.status === "sent" && (
                <form action={markInvoicePaid.bind(null, inv.id)}>
                  <button type="submit" style={{ background: DS.accent, color: DS.bg, border: "none", borderRadius: 4, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: DS.mono }}>Paid</button>
                </form>
              )}
            </div>
          ))}
        </Section>

        {/* BRAND HUB */}
        <Section title="BRAND HUB">
          <form action={saveBrandInfo.bind(null, id)}>
            <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Palette (hex, comma-separated)</label>
            <input name="palette" defaultValue={client.brandPalette.join(", ")} placeholder="#0B0B0D, #F4F1E9, #9C988C" style={dsInput} />
            {client.brandPalette.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {client.brandPalette.map((hex, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${DS.border}`, borderRadius: 6, padding: "3px 8px 3px 4px" }}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, background: hex, border: `1px solid ${DS.border}` }} />
                    <span style={mono({ fontSize: 11, color: DS.mute })}>{hex}</span>
                  </div>
                ))}
              </div>
            )}
            <label style={{ ...dsLabel, display: "block", margin: "14px 0 6px" }}>Guidelines / brand links</label>
            <textarea name="guidelines" defaultValue={client.brandGuidelines} rows={3}
              placeholder="Brand guide: https://…&#10;Fonts: https://…&#10;Tone: bold, energetic" style={dsTextarea} />
            <div style={{ marginTop: 14 }}><button type="submit" style={dsBtn}>Save brand info</button></div>
          </form>

          <div style={{ borderTop: `1px solid ${DS.border}`, marginTop: 18, paddingTop: 16 }}>
            <label style={{ ...dsLabel, display: "block", marginBottom: 10 }}>Assets ({assets.length})</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              {assets.map((a) => (
                <div key={a.id} style={{ width: 120, border: `1px solid ${DS.border}`, borderRadius: 8, overflow: "hidden", background: DS.bg }}>
                  <a href={a.url} target="_blank" rel="noreferrer" style={{ height: 76, background: DS.card2,
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {a.kind === "image"
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={a.url} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={mono({ fontSize: 22, color: DS.faint })}>⤓</span>}
                  </a>
                  <div style={{ padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontSize: 10.5, color: DS.mute, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                    <form action={removeBrandAsset.bind(null, a.id, id)}>
                      <button type="submit" style={{ background: "transparent", color: DS.faint, border: "none", cursor: "pointer", fontSize: 12, padding: 0 }}>✕</button>
                    </form>
                  </div>
                </div>
              ))}
              {assets.length === 0 && <div style={{ color: DS.mute, fontSize: 13 }}>No assets uploaded yet.</div>}
            </div>
            <form action={uploadBrandAsset.bind(null, id)} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input name="file" type="file" required style={{ ...dsInput, padding: 8, flex: 1 }} />
              <button type="submit" style={dsBtn}>Upload</button>
            </form>
            <div style={{ fontSize: 11, color: DS.faint, marginTop: 6 }}>Logos, fonts, PDFs, images — up to 25MB each.</div>
          </div>
        </Section>

        {/* WHATSAPP GROUP */}
        <Section title="WHATSAPP GROUP">
          <form action={saveClientWhatsApp.bind(null, id)}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Group phone / ID</label>
                <input name="whatsappPhone" defaultValue={client.whatsappPhone} placeholder="CallMeBot group ID" style={dsInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Group API key</label>
                <input name="whatsappApiKey" defaultValue={client.whatsappApiKey} placeholder="From CallMeBot" style={dsInput} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: DS.faint, marginTop: 8, lineHeight: 1.6 }}>
              This client’s updates (ready for review, new version, completed, invoice) post into their WhatsApp group.
              Add the CallMeBot bot to the client’s group and follow its group activation to get the group’s ID + API key, then paste them here.
              {client.whatsappPhone && client.whatsappApiKey
                ? <span style={{ color: "#7FB77E" }}> ● Connected.</span>
                : <span style={{ color: DS.faint }}> ○ Not connected — notifications stay in-app + email only.</span>}
            </div>
            <div style={{ marginTop: 14 }}><button type="submit" style={dsBtn}>Save WhatsApp group</button></div>
          </form>
        </Section>

        {/* CONTACTS */}
        <Section title="CONTACTS / SEATS">
          <div style={{ fontSize: 11.5, color: DS.faint, marginBottom: 12 }}>Give a contact a password and they can log into this athlete’s Locker Room with their own email.</div>
          {contacts.length === 0 && <div style={{ color: DS.mute, fontSize: 13, marginBottom: 12 }}>No extra contacts.</div>}
          {contacts.map((ct) => (
            <div key={ct.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${DS.border}`, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, flex: 1, minWidth: 160 }}>{ct.name ? `${ct.name} · ` : ""}{ct.email}</span>
              <span style={mono({ fontSize: 10, letterSpacing: 0.5, color: ct.hasLogin ? "#7FB77E" : DS.faint })}>{ct.hasLogin ? "● CAN LOG IN" : "○ NO LOGIN"}</span>
              <form action={resendSetupInvite.bind(null, "contact", ct.id, id)}>
                <button type="submit" style={{ ...dsBtnGhost, padding: "5px 10px", fontSize: 11 }}>Send invite</button>
              </form>
              <form action={setContactPassword.bind(null, ct.id, id)} style={{ display: "flex", gap: 6 }}>
                <input name="password" type="text" placeholder={ct.hasLogin ? "Reset password" : "Set password"} autoComplete="off" style={{ ...dsInput, padding: "5px 8px", fontSize: 12, width: 130 }} />
                <button type="submit" style={{ ...dsBtnGhost, padding: "5px 10px", fontSize: 11 }}>Save</button>
              </form>
              <form action={removeClientContact.bind(null, ct.id, id)}>
                <button type="submit" style={{ background: "transparent", color: DS.mute, border: `1px solid ${DS.border}`, borderRadius: 4, padding: "5px 9px", fontSize: 11, cursor: "pointer", fontFamily: DS.mono }}>Remove</button>
              </form>
            </div>
          ))}
          <form action={addClientContact.bind(null, id)} style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <input name="name" placeholder="Name (optional)" style={{ ...dsInput, flex: 1, minWidth: 120 }} />
            <input name="email" type="email" placeholder="email@company.com" required style={{ ...dsInput, flex: 2, minWidth: 160 }} />
            <input name="password" type="text" placeholder="Password (optional)" autoComplete="off" style={{ ...dsInput, flex: 1, minWidth: 120 }} />
            <button type="submit" style={dsBtn}>Add</button>
          </form>
        </Section>

        {/* ONBOARDING */}
        <Section title="ONBOARDING">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {ONBOARDING_KEYS.map((k) => {
              const done = onboarding[k];
              return (
                <form key={k} action={setOnboardingStep.bind(null, id, k, !done)}>
                  <button type="submit" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
                    background: done ? DS.accentSoft : "transparent", border: `1px solid ${done ? DS.accent : DS.border}`,
                    color: done ? DS.text : DS.mute, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontFamily: DS.body }}>
                    <span style={{ color: done ? "#7FB77E" : DS.faint }}>{done ? "✓" : "○"}</span>
                    {ONBOARDING_LABELS[k]}
                  </button>
                </form>
              );
            })}
          </div>
        </Section>

        {/* DANGER */}
        <Section title="DANGER ZONE">
          <form action={deleteClient.bind(null, id)}>
            <button type="submit" style={{ background: "transparent", color: "#D2452B", border: "1px solid #D2452B",
              borderRadius: 6, padding: "9px 16px", fontSize: 13, cursor: "pointer", fontFamily: DS.body }}>
              Delete this athlete permanently
            </button>
            <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 8 }}>Removes the client, their board, reps, invoices and versions. Cannot be undone.</div>
          </form>
        </Section>
      </main>
    </div>
  );
}
