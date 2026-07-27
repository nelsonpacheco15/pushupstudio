import { login } from "@/app/actions";
import { INK, PANEL, LINE, ACCENT, MUTE, PAPER, inp } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <div style={{ minHeight: "100vh", background: INK, color: PAPER, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form action={login} style={{ width: 360, maxWidth: "100%", background: PANEL,
        border: `1px solid ${LINE}`, borderRadius: 14, padding: 26 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://jsyxwuwmzgwlpstdcpkm.supabase.co/storage/v1/object/public/stylescape-images/brand/logo-white.png"
          alt="PushUP Studio" style={{ height: 20, display: "block" }} />
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 1, color: MUTE, margin: "12px 0 18px" }}>[ STUDIO LOGIN ]</div>
        <input type="hidden" name="next" value={next ?? "/"} />
        <input name="password" type="password" placeholder="Studio password" autoFocus
          style={inp} />
        {error && <div style={{ color: ACCENT, fontSize: 12.5, marginTop: 10 }}>Wrong password. Try again.</div>}
        <button type="submit" style={{ width: "100%", marginTop: 14, background: ACCENT, color: INK,
          border: "none", borderRadius: 8, padding: "11px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
          Log in
        </button>
      </form>
    </div>
  );
}
