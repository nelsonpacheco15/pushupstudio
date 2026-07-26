import type { DayHours } from "@/lib/data";
import { formatDuration } from "@/lib/tickets";
import { DS } from "@/lib/theme";
import { Frame } from "@/components/crt";

const BLOCKS = 12;

export default function WeekHoursChart({ days }: { days: DayHours[] }) {
  const max = Math.max(1, ...days.map((d) => d.seconds));
  const total = days.reduce((s, d) => s + d.seconds, 0);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const mono = (s: React.CSSProperties = {}) => ({ fontFamily: DS.mono, ...s });

  const blockColor = (rowFromBottom: number) => {
    const pos = rowFromBottom / (BLOCKS - 1);
    return pos < 0.38 ? DS.gold : pos < 0.7 ? DS.amber : DS.accent;
  };

  return (
    <Frame pad={20}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
        <span style={mono({ fontSize: 10, letterSpacing: 0.8, color: DS.faint })}>[ ▚ HOURS / DAY · THIS WEEK ]</span>
        <span style={mono({ fontSize: 12, color: DS.mute })}>{formatDuration(total)}</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150 }}>
        {days.map((d, i) => {
          const filled = d.seconds ? Math.max(1, Math.round((d.seconds / max) * BLOCKS)) : 0;
          const isToday = i === todayIdx;
          return (
            <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              <span style={mono({ fontSize: 8.5, color: d.seconds ? DS.mute : "transparent" })}>{d.seconds ? formatDuration(d.seconds) : "0"}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", maxWidth: 30 }}>
                {Array.from({ length: BLOCKS }, (_, row) => {
                  const rowFromBottom = BLOCKS - 1 - row;
                  const on = rowFromBottom < filled;
                  return <span key={row} style={{ height: 8, background: on ? blockColor(rowFromBottom) : DS.card2, opacity: on ? 1 : 0.55 }} />;
                })}
              </div>
              <span style={mono({ fontSize: 9.5, letterSpacing: 0.5, color: isToday ? DS.accent : DS.faint })}>{d.label.toUpperCase()}</span>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}
