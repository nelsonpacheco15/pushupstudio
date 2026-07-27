"use client";

import { useState } from "react";
import Link from "next/link";
import type { ClientRecord } from "@/lib/data";
import { updateClient } from "@/app/actions";
import { DS, dsInput, dsTextarea, dsBtn, dsBtnGhost, dsLabel } from "@/lib/theme";

export default function ClientBoardHeader({ client }: { client: ClientRecord }) {
  const [edit, setEdit] = useState(false);
  return (
    <>
      <div style={{ height: 3, background: client.brandColor }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 40px", borderBottom: `1px solid ${DS.border}` }}>
        <Link href="/" style={{ fontFamily: DS.mono, fontSize: 12, color: DS.mute }}>← STUDIO</Link>
        {client.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logoUrl} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", border: `1px solid ${DS.border}` }} />
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: 8, background: client.brandColor, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DS.display, fontWeight: 700 }}>
            {client.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{ fontFamily: client.brandFont ? `'${client.brandFont}', ${DS.display}` : DS.display, fontWeight: 700, fontSize: 19, letterSpacing: -0.3 }}>{client.name}</span>
          {client.company && <span style={{ fontFamily: DS.mono, fontSize: 11, color: DS.faint, marginLeft: 10 }}>/ {client.company}</span>}
        </div>
        <button onClick={() => setEdit(true)} style={dsBtnGhost}>Quick edit</button>
        <Link href={`/client/${client.id}/manage`} style={{ ...dsBtn, textDecoration: "none" }}>Manage</Link>
      </div>

      {edit && (
        <div onClick={() => setEdit(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          zIndex: 60, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <form action={updateClient} onClick={(e) => e.stopPropagation()}
            style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 4, padding: 26, width: 480, maxWidth: "100%", marginTop: 44 }}>
            <input type="hidden" name="id" value={client.id} />
            <div style={{ fontFamily: DS.display, fontWeight: 700, fontSize: 22, marginBottom: 16 }}>Edit client</div>

            <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Client / brand name</label>
            <input name="name" defaultValue={client.name} style={dsInput} />
            <label style={{ ...dsLabel, display: "block", margin: "12px 0 6px" }}>Company</label>
            <input name="company" defaultValue={client.company} style={dsInput} />
            <label style={{ ...dsLabel, display: "block", margin: "12px 0 6px" }}>Primary email</label>
            <input name="email" type="email" defaultValue={client.email} style={dsInput} />
            <label style={{ ...dsLabel, display: "block", margin: "12px 0 6px" }}>Language (emails &amp; portal)</label>
            <select name="language" defaultValue={client.language} style={dsInput}>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Plan</label>
                <select name="plan" defaultValue={client.plan} style={dsInput}>
                  <option value="growth">Growth — €800/mo</option>
                  <option value="scale">Scale — €1299/mo</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Locker Room password</label>
                <input name="password" type="text" placeholder="Leave blank to keep" autoComplete="off" style={dsInput} />
              </div>
            </div>
            <label style={{ ...dsLabel, display: "block", margin: "12px 0 6px" }}>Payment method</label>
            <select name="method" defaultValue={client.paymentMethod} style={dsInput}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="stripe">Card (Stripe)</option>
            </select>
            <label style={{ ...dsLabel, display: "block", margin: "12px 0 6px" }}>Invite more people (one email per line)</label>
            <textarea name="contacts" placeholder="teammate@company.com" style={dsTextarea} rows={2} />
            <label style={{ ...dsLabel, display: "block", margin: "12px 0 6px" }}>Logo {client.logoUrl ? "(replaces current)" : ""}</label>
            <input name="logo" type="file" accept="image/*" style={{ ...dsInput, padding: 8 }} />
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Brand colour</label>
                <input name="brandColor" type="color" defaultValue={client.brandColor} style={{ ...dsInput, height: 42, padding: 4 }} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ ...dsLabel, display: "block", marginBottom: 6 }}>Brand font</label>
                <input name="brandFont" defaultValue={client.brandFont} placeholder="e.g. Space Grotesk" style={dsInput} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEdit(false)} style={dsBtnGhost}>Cancel</button>
              <button type="submit" style={dsBtn}>Save changes</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
