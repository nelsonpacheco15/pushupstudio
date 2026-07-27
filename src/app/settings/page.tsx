import StudioNav from "@/components/StudioNav";
import { Scanlines, DitherCorner } from "@/components/crt";
import { getSettings } from "@/lib/data";
import { updateSettings } from "@/app/actions";
import { DS, dsInput, dsBtn, dsLabel } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

const mono = (extra: React.CSSProperties = {}) => ({ fontFamily: DS.mono, ...extra });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: DS.radius, padding: 22, marginBottom: 16 }}>
      <div style={mono({ fontSize: 10, letterSpacing: 1, color: DS.faint, marginBottom: 16 })}>[ {title} ]</div>
      {children}
    </div>
  );
}

function Field({ label, name, value, placeholder, type = "text", hint }: {
  label: string; name: string; value: string | number; placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>{label}</label>
      <input name={name} defaultValue={String(value)} placeholder={placeholder} type={type} style={dsInput} />
      {hint && <div style={{ fontSize: 11, color: DS.faint, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [s, sp] = await Promise.all([getSettings(), searchParams]);
  const saved = sp?.saved === "1";

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, color: DS.text, display: "flex" }}>
      <Scanlines />
      <StudioNav active="settings" />
      <main style={{ flex: 1, minWidth: 0, padding: "34px 40px", maxWidth: 900, margin: "0 auto", position: "relative" }}>
        <DitherCorner />
        <div style={mono({ fontSize: 11, letterSpacing: 1.2, color: DS.mute })}>┌─ STUDIO / SETTINGS ───────</div>
        <h1 style={{ fontFamily: DS.pixel, fontWeight: 700, fontSize: 56, letterSpacing: 1, textTransform: "uppercase",
          margin: "10px 0 26px", lineHeight: 1, color: DS.text }}>Settings</h1>

        {saved && (
          <div style={{ background: "rgba(127,183,126,0.12)", border: "1px solid #7FB77E", color: "#7FB77E", borderRadius: DS.radius,
            padding: "11px 16px", marginBottom: 20, fontSize: 13, fontFamily: DS.mono }}>✓ Settings saved.</div>
        )}

        <form action={updateSettings}>
          <Section title="BUSINESS · SHOWN ON INVOICES">
            <Field label="Legal name" name="legalName" value={s.legalName} placeholder="PushUP Design" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><Field label="VAT / NIF" name="vat" value={s.vat} placeholder="PT123456789" /></div>
              <div style={{ flex: 2 }}><Field label="Address" name="address" value={s.address} placeholder="Street, city, country" /></div>
            </div>
          </Section>

          <Section title="BANK TRANSFER DETAILS">
            <Field label="IBAN" name="iban" value={s.iban} placeholder="PT50 0000 0000 0000 0000 0000 0" hint="Shown on bank-transfer invoices so clients know where to pay." />
            <Field label="Bank name" name="bank" value={s.bank} placeholder="e.g. Millennium BCP" />
          </Section>

          <Section title="PLAN PRICES">
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><Field label="Growth (€ / month)" name="growthEuros" value={(s.growthCents / 100).toFixed(2)} type="text" /></div>
              <div style={{ flex: 1 }}><Field label="Scale (€ / month)" name="scaleEuros" value={(s.scaleCents / 100).toFixed(2)} type="text" /></div>
            </div>
          </Section>

          <Section title="EMAIL">
            <Field label="Studio email (where you get notified)" name="studioEmail" value={s.studioEmail} placeholder="hey@dashboard.pushupdesign.com" />
            <Field label="From address (outgoing email)" name="fromEmail" value={s.fromEmail} placeholder="PushUP <hey@dashboard.pushupdesign.com>" hint="Must be a domain verified in Resend." />
          </Section>

          <Section title="SERVICE LEVEL">
            <Field label="Attention threshold (hours)" name="slaHours" value={s.slaHours} type="number"
              hint="HQ flags a client when their oldest open request has waited longer than this." />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><Field label="Growth turnaround (hours)" name="growthSlaHours" value={s.growthSlaHours} type="number" /></div>
              <div style={{ flex: 1 }}><Field label="Scale turnaround (hours)" name="scaleSlaHours" value={s.scaleSlaHours} type="number" /></div>
            </div>
            <div style={{ fontSize: 11, color: DS.faint, marginTop: -4 }}>Promised delivery time per plan — reps show a due/overdue badge against it.</div>
          </Section>

          <Section title="SLACK NOTIFICATIONS">
            <Field label="Slack incoming webhook URL" name="slackWebhookUrl" value={s.slackWebhookUrl}
              placeholder="https://hooks.slack.com/services/…"
              hint="Studio notifications (new requests, feedback, invoices) also post to this Slack channel. Create one at api.slack.com → Incoming Webhooks." />
          </Section>

          <Section title="WHATSAPP NOTIFICATIONS">
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><Field label="WhatsApp number" name="whatsappPhone" value={s.whatsappPhone} placeholder="+351912345678" /></div>
              <div style={{ flex: 1 }}><Field label="CallMeBot API key" name="whatsappApiKey" value={s.whatsappApiKey} placeholder="123456" /></div>
            </div>
            <div style={{ fontSize: 11, color: DS.faint, marginTop: 4, lineHeight: 1.6 }}>
              Free setup (~2 min): save <b style={{ color: DS.mute }}>+34 644 51 95 23</b> to your contacts, send it
              <b style={{ color: DS.mute }}> “I allow callmebot to send me messages to this chat”</b> on WhatsApp, and it replies with your API key.
              Paste your number + that key here and studio notifications also arrive on WhatsApp. (For a team channel, add the bot to a WhatsApp group per CallMeBot’s group instructions.)
            </div>
          </Section>

          <Section title="RECURRING BILLING">
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" name="autoInvoice" defaultChecked={s.autoInvoice} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13.5, color: DS.text }}>Automatically issue &amp; email each bank-transfer client’s invoice every month</span>
            </label>
            <div style={{ fontSize: 11, color: DS.faint, marginTop: 8 }}>
              Runs daily and bills each client once, on their signup day-of-month. Card (Stripe) clients are billed by Stripe.
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 14 }}>
              <input type="checkbox" name="autoRecap" defaultChecked={s.autoRecap} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13.5, color: DS.text }}>Email each client a monthly recap of everything delivered (on the 1st)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 12 }}>
              <input type="checkbox" name="clientSelfService" defaultChecked={s.clientSelfService} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13.5, color: DS.text }}>Let clients change plan &amp; pause from their Locker Room</span>
            </label>
          </Section>

          <button type="submit" style={{ ...dsBtn, padding: "11px 22px" }}>Save settings</button>
        </form>
      </main>
    </div>
  );
}
