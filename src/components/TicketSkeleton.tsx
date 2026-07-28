import { DS } from "@/lib/theme";

const box = (w: string | number, h: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: w, height: h, background: DS.card2, borderRadius: 6, animation: "ds-pulse 1.2s ease-in-out infinite", ...extra,
});

/** Instant placeholder for the client ticket view while it loads. */
export default function TicketSkeleton() {
  return (
    <div style={{ minHeight: "100vh", background: DS.bg, color: DS.text }}>
      <div style={{ height: 4, background: DS.card2 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 26px", borderBottom: `1px solid ${DS.border}` }}>
        <div style={box(34, 34, { borderRadius: 8 })} />
        <div style={box(120, 12)} />
      </div>
      <div style={{ padding: 26, maxWidth: 860, margin: "0 auto" }}>
        <div style={box("60%", 26, { marginBottom: 18 })} />
        <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 4, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} style={box(48, 34, { flex: 1 })} />)}
          </div>
        </div>
        <div style={box("100%", 62, { marginBottom: 18, borderRadius: 4 })} />
        <div style={box("100%", 420, { borderRadius: 4 })} />
      </div>
    </div>
  );
}
