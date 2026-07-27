import Link from "next/link";
import { listAllStylescapes, listClients } from "@/lib/data";
import { createStylescape } from "@/app/actions";
import StudioNav from "@/components/StudioNav";
import { LAYOUTS } from "@/lib/layouts";
import { INK, PAPER, PANEL, LINE, ACCENT, MUTE, inp } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stylescapes" };

export default async function StylescapesPage() {
  const [items, clients] = await Promise.all([listAllStylescapes(), listClients()]);

  return (
    <div style={{ display: "flex", background: INK, minHeight: "100vh" }}>
      <StudioNav active="stylescapes" />
      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ padding: "16px 26px", borderBottom: `1px solid ${LINE}` }}>
          <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18 }}>Stylescapes</span>
        </div>

        <div style={{ padding: 26, maxWidth: 1100, margin: "0 auto" }}>
          {/* new stylescape */}
          {clients.length > 0 ? (
            <form action={createStylescape} style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: MUTE }}>New stylescape for</span>
              <select name="clientId" style={{ ...inp, width: 220 }}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" style={{ background: ACCENT, color: INK, border: "none", borderRadius: 8,
                padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>+ Create stylescape</button>
            </form>
          ) : (
            <div style={{ fontSize: 13, color: MUTE, marginBottom: 22 }}>Add a client first to create a stylescape.</div>
          )}

          {items.length === 0 ? (
            <div style={{ border: `1px dashed ${LINE}`, borderRadius: 12, padding: 48, textAlign: "center", color: MUTE }}>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 20, color: PAPER, marginBottom: 6 }}>No stylescapes yet</div>
              Create one above — pick a layout, drop in brand materials, share the review link.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {items.map((s) => (
                <Link key={s.id} href={`/build/${s.id}`}
                  style={{ display: "block", background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 17 }}>{s.title}</div>
                  <div style={{ fontSize: 12.5, color: MUTE, marginTop: 3 }}>{s.clientName}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 12, fontFamily: "'IBM Plex Mono'", fontSize: 11, color: MUTE }}>
                    <span>{LAYOUTS[s.layoutKey]?.name ?? s.layoutKey}</span>
                    <span style={{ color: s.ticketId ? ACCENT : MUTE }}>{s.ticketId ? "attached" : "unattached"}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
