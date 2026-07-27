import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClientById, getClientContacts, getOnboarding, listInvoicesForClient,
  ONBOARDING_KEYS, ONBOARDING_LABELS,
} from "@/lib/data";
import { formatEUR, planFor } from "@/lib/billing";
import {
  updateClient, deleteClient, addClientContact, removeClientContact,
  setOnboardingStep, issueInvoiceForClient, markInvoicePaid,
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
  const [contacts, onboarding, invoices] = await Promise.all([
    getClientContacts(id), getOnboarding(id), listInvoicesForClient(id),
  ]);
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
            <label style={{ ...dsLabel, display: "block", margin: "12px 0 6px" }}>Locker Room password</label>
            <input name="password" type="text" placeholder="Set / reset password (leave blank to keep)" autoComplete="off" style={dsInput} />
            <div style={{ marginTop: 16 }}><button type="submit" style={dsBtn}>Save account</button></div>
          </form>
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

        {/* CONTACTS */}
        <Section title="CONTACTS / SEATS">
          {contacts.length === 0 && <div style={{ color: DS.mute, fontSize: 13, marginBottom: 12 }}>No extra contacts.</div>}
          {contacts.map((ct) => (
            <div key={ct.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: `1px solid ${DS.border}` }}>
              <span style={{ fontSize: 13, flex: 1 }}>{ct.name ? `${ct.name} · ` : ""}{ct.email}</span>
              <form action={removeClientContact.bind(null, ct.id, id)}>
                <button type="submit" style={{ background: "transparent", color: DS.mute, border: `1px solid ${DS.border}`, borderRadius: 4, padding: "4px 9px", fontSize: 11, cursor: "pointer", fontFamily: DS.mono }}>Remove</button>
              </form>
            </div>
          ))}
          <form action={addClientContact.bind(null, id)} style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input name="name" placeholder="Name (optional)" style={{ ...dsInput, flex: 1 }} />
            <input name="email" type="email" placeholder="email@company.com" style={{ ...dsInput, flex: 2 }} />
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
