import StudioNav from "@/components/StudioNav";
import { Scanlines, DitherCorner } from "@/components/crt";
import { listInvoices } from "@/lib/data";
import { formatEUR, planFor, ISSUER } from "@/lib/billing";
import { DS } from "@/lib/theme";
import { markInvoicePaid, voidInvoice } from "@/app/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing" };

const mono = (extra: React.CSSProperties = {}) => ({ fontFamily: DS.mono, ...extra });

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  paid: { label: "PAID", color: "#7FB77E" },
  sent: { label: "SENT", color: DS.amber },
  draft: { label: "DRAFT", color: DS.mute },
  void: { label: "VOID", color: DS.faint },
};

export default async function BillingPage() {
  const invoices = await listInvoices();
  const outstanding = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.amountCents, 0);
  const paidThisYear = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amountCents, 0);
  const mrr = invoices.filter((i) => i.status !== "void")
    .reduce((acc, i) => { acc.set(i.clientId, i.amountCents); return acc; }, new Map<string, number>());
  const mrrTotal = [...mrr.values()].reduce((s, v) => s + v, 0);

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, color: DS.text, display: "flex" }}>
      <Scanlines />
      <StudioNav active="billing" />
      <main style={{ flex: 1, minWidth: 0, padding: "34px 40px", maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        <DitherCorner />
        <div style={mono({ fontSize: 11, letterSpacing: 1.2, color: DS.mute })}>┌─ STUDIO / BILLING ───────</div>
        <h1 style={{ fontFamily: DS.pixel, fontWeight: 700, fontSize: 56, letterSpacing: 1, textTransform: "uppercase",
          margin: "10px 0 26px", lineHeight: 1, color: DS.text }}>Billing</h1>

        {/* stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "MRR", value: formatEUR(mrrTotal) },
            { label: "OUTSTANDING", value: formatEUR(outstanding) },
            { label: "PAID THIS YEAR", value: formatEUR(paidThisYear) },
          ].map((s) => (
            <div key={s.label} style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: DS.radius, padding: "18px 20px" }}>
              <div style={mono({ fontSize: 10, letterSpacing: 1, color: DS.faint })}>[ {s.label} ]</div>
              <div style={{ fontFamily: DS.pixel, fontSize: 30, color: DS.text, marginTop: 8 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {!ISSUER.iban && (
          <div style={{ background: DS.card, border: `1px solid ${DS.amber}`, borderRadius: DS.radius, padding: "12px 16px", marginBottom: 20,
            fontSize: 12.5, color: DS.amber, fontFamily: DS.mono }}>
            ⚠ Set PUSHUP_IBAN / PUSHUP_BANK / PUSHUP_VAT env vars so bank-transfer invoices show your payment details.
          </div>
        )}

        {/* invoice table */}
        <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: DS.radius, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px 110px 90px 200px", gap: 10, padding: "12px 18px",
            borderBottom: `1px solid ${DS.border}`, ...mono({ fontSize: 10, letterSpacing: 1, color: DS.faint }) }}>
            <div>INVOICE</div><div>CLIENT</div><div>PLAN</div><div style={{ textAlign: "right" }}>AMOUNT</div><div>METHOD</div><div style={{ textAlign: "right" }}>STATUS / ACTION</div>
          </div>
          {invoices.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: DS.mute, fontSize: 13 }}>
              No invoices yet — they’re created automatically when you add an athlete.
            </div>
          )}
          {invoices.map((inv) => {
            const st = STATUS_STYLE[inv.status] ?? STATUS_STYLE.sent;
            return (
              <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px 110px 90px 200px", gap: 10,
                padding: "13px 18px", borderBottom: `1px solid ${DS.border}`, alignItems: "center", fontSize: 13 }}>
                <div style={mono({ fontSize: 12, color: DS.text })}>{inv.number}</div>
                <div style={{ color: DS.text }}>{inv.clientName ?? "—"}<div style={{ fontSize: 10.5, color: DS.faint }}>{inv.periodLabel}</div></div>
                <div style={{ color: DS.mute }}>{planFor(inv.plan).label}</div>
                <div style={{ textAlign: "right", fontFamily: DS.mono, color: DS.text }}>{formatEUR(inv.amountCents)}</div>
                <div style={mono({ fontSize: 10.5, color: DS.mute })}>{inv.method === "stripe" ? "CARD" : "BANK"}</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                  <span style={mono({ fontSize: 10.5, letterSpacing: 1, color: st.color })}>{st.label}</span>
                  {inv.status === "sent" && (
                    <>
                      <form action={markInvoicePaid.bind(null, inv.id)}>
                        <button type="submit" style={{ background: DS.accent, color: DS.bg, border: "none", borderRadius: 4,
                          padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: DS.mono }}>Mark paid</button>
                      </form>
                      <form action={voidInvoice.bind(null, inv.id)}>
                        <button type="submit" style={{ background: "transparent", color: DS.mute, border: `1px solid ${DS.border}`,
                          borderRadius: 4, padding: "5px 8px", fontSize: 11, cursor: "pointer", fontFamily: DS.mono }}>Void</button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
