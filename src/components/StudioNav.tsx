import Link from "next/link";
import { logout } from "@/app/actions";
import { authDisabled } from "@/lib/auth";
import { listStudioNotifications } from "@/lib/data";
import NotificationBell from "@/components/NotificationBell";
import { DS } from "@/lib/theme";

const ITEMS = [
  { key: "overview", label: "HQ", href: "/", icon: "▚" },
  { key: "stylescapes", label: "Stylescapes", href: "/stylescapes", icon: "❋" },
  { key: "billing", label: "Billing", href: "/billing", icon: "€" },
  { key: "settings", label: "Settings", href: "/settings", icon: "⚙" },
];

export default async function StudioNav({ active }: { active: "overview" | "stylescapes" | "billing" | "settings" }) {
  const items = await listStudioNotifications();
  const feed = { items, unread: items.filter((n) => !n.readAt).length };
  return (
    <aside style={{ width: 232, flex: "0 0 232px", background: DS.bg2, borderRight: `1px solid ${DS.border}`,
      minHeight: "100vh", padding: "24px 16px", display: "flex", flexDirection: "column", position: "sticky", top: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "2px 6px 8px 10px" }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://jsyxwuwmzgwlpstdcpkm.supabase.co/storage/v1/object/public/stylescape-images/brand/logo-white.png"
            alt="PushUP Studio" style={{ height: 17, display: "block" }} />
          <div style={{ fontFamily: DS.mono, fontSize: 9.5, letterSpacing: 1, color: DS.faint, marginTop: 8 }}>
            [ STUDIO&nbsp;OS ]
          </div>
        </div>
        <NotificationBell scope="studio" initial={feed} placement="sidebar" />
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 22 }}>
        {ITEMS.map((it) => {
          const on = active === it.key;
          return (
            <Link key={it.key} href={it.href}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 10,
                fontSize: 14, fontWeight: 600, fontFamily: DS.body,
                color: on ? DS.text : DS.mute,
                background: on ? DS.accentSoft : "transparent",
                boxShadow: on ? `inset 2px 0 0 ${DS.accent}` : "none" }}>
              <span style={{ fontSize: 14, width: 16, textAlign: "center", color: on ? DS.accent : DS.faint }}>{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto" }}>
        {!authDisabled() && (
          <form action={logout}>
            <button type="submit" style={{ width: "100%", textAlign: "left", background: "transparent", color: DS.mute,
              border: `1px solid ${DS.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, cursor: "pointer",
              fontFamily: DS.body }}>
              Log out
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
