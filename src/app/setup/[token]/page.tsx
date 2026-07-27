import { verifySetupToken } from "@/lib/clientAuth";
import { getClientById, getContactInfo } from "@/lib/data";
import { completeSetup } from "@/app/actions";
import { INK, PANEL, LINE, ACCENT, MUTE, PAPER, inp } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up your access" };

export default async function SetupPage({
  params, searchParams,
}: {
  params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const target = await verifySetupToken(token);

  let clientName = "", email = "", valid = false;
  if (target) {
    if (target.kind === "client") {
      const c = await getClientById(target.id);
      if (c) { clientName = c.name; email = c.email; valid = true; }
    } else {
      const info = await getContactInfo(target.id);
      if (info) { const c = await getClientById(info.clientId); clientName = c?.name ?? ""; email = info.email; valid = true; }
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0C", color: PAPER, display: "flex", padding: 20, alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 940, maxWidth: "100%", minHeight: 560, display: "flex", borderRadius: 18, overflow: "hidden",
        border: `1px solid ${LINE}`, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
        {/* left visual panel */}
        <div style={{ flex: "1 1 46%", position: "relative", padding: 40, display: "flex", flexDirection: "column", justifyContent: "space-between",
          background: `radial-gradient(120% 120% at 0% 100%, #1c3a30 0%, #10201b 45%, #0b0f0d 100%)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://jsyxwuwmzgwlpstdcpkm.supabase.co/storage/v1/object/public/stylescape-images/brand/logo-white.png"
            alt="PushUP" style={{ height: 18, display: "block", opacity: 0.95 }} />
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 40, lineHeight: 1.05, letterSpacing: -1 }}>
              Get started<br />with us
            </div>
            <div style={{ fontSize: 14, color: "rgba(233,231,222,0.7)", marginTop: 14, maxWidth: 280, lineHeight: 1.6 }}>
              One quick step to open your Locker Room and start sending requests.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {["Set your password", "Open your dashboard", "Send your first rep"].map((s, i) => (
              <div key={i} style={{ flex: 1, background: i === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.06)",
                color: i === 0 ? "#0A0A0C" : "rgba(233,231,222,0.75)", borderRadius: 10, padding: "12px 12px", fontSize: 11.5, lineHeight: 1.35 }}>
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{i + 1}</div>
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* right form panel */}
        <div style={{ flex: "1 1 54%", background: INK, padding: "48px 44px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {valid ? (
            <>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 26, textAlign: "center" }}>Set your password</div>
              <div style={{ fontSize: 13.5, color: MUTE, textAlign: "center", margin: "8px 0 26px" }}>
                Create a password for <b style={{ color: PAPER }}>{clientName}</b>’s Locker Room.
              </div>
              <form action={completeSetup.bind(null, token)} style={{ maxWidth: 360, margin: "0 auto", width: "100%" }}>
                <label style={{ fontSize: 12, color: MUTE, display: "block", marginBottom: 6 }}>Your email</label>
                <input value={email} disabled style={{ ...inp, opacity: 0.7, marginBottom: 14 }} />
                <label style={{ fontSize: 12, color: MUTE, display: "block", marginBottom: 6 }}>Choose a password</label>
                <input name="password" type="password" required minLength={8} autoFocus placeholder="At least 8 characters"
                  autoComplete="new-password" style={inp} />
                {error === "short" && <div style={{ color: ACCENT, fontSize: 12.5, marginTop: 8 }}>Password must be at least 8 characters.</div>}
                <button type="submit" style={{ width: "100%", marginTop: 18, background: ACCENT, color: INK, border: "none",
                  borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Set password &amp; open dashboard
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 22 }}>Link expired or invalid</div>
              <div style={{ fontSize: 13.5, color: MUTE, marginTop: 10 }}>Ask your studio contact to send you a fresh invite.</div>
              <a href="/enter" style={{ display: "inline-block", marginTop: 20, color: ACCENT, textDecoration: "underline", fontSize: 13 }}>Go to login</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
