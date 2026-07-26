"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/tickets";
import { startTimer, stopTimer } from "@/app/actions";
import { ACCENT, DS } from "@/lib/theme";

/** Ticking elapsed clock. When `startedAt` is set, counts up live.
   `now` stays null until after mount so the server and first client render
   agree (both show baseSeconds), avoiding a hydration mismatch. */
export function Elapsed({ startedAt, baseSeconds = 0 }: { startedAt: string | null; baseSeconds?: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!startedAt) { setNow(null); return; }
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const live = startedAt && now ? Math.floor((now - new Date(startedAt).getTime()) / 1000) : 0;
  return <>{formatDuration(baseSeconds + live)}</>;
}

/** Start/stop control for a single ticket. */
export function TimerButton({
  ticketId, clientId, running, totalSeconds, runningSince,
}: {
  ticketId: string;
  clientId: string;
  running: boolean;
  totalSeconds: number;
  runningSince: string | null;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 15, color: running ? ACCENT : "#F3F0E9" }}>
        <Elapsed startedAt={running ? runningSince : null} baseSeconds={totalSeconds} />
      </span>
      <button
        disabled={pending}
        onClick={() => start(async () => {
          if (running) await stopTimer(ticketId, clientId); else await startTimer(ticketId, clientId);
          router.refresh();
        })}
        style={{
          border: "none", cursor: "pointer", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 600,
          background: running ? "#3a1f1a" : ACCENT, color: running ? ACCENT : "#fff",
        }}>
        {running ? "■ Stop" : "▶ Start timer"}
      </button>
    </div>
  );
}

/** Compact running-timer banner for the overview page. */
export function RunningBanner({
  ticketId, clientId, ticketTitle, clientName, startedAt,
}: {
  ticketId: string; clientId: string; ticketTitle: string; clientName: string; startedAt: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      background: DS.accentSoft, border: `1px solid ${DS.accent}`, borderRadius: DS.radiusSm,
      padding: "14px 18px", marginBottom: 26, color: DS.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: DS.accent, fontSize: 13, fontWeight: 600 }}>● Tracking</span>
        <span style={{ fontWeight: 700 }}>{ticketTitle}</span>
        <span style={{ color: DS.mute, fontSize: 13 }}>· {clientName}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontFamily: DS.mono, fontSize: 16, color: DS.accent }}>
          <Elapsed startedAt={startedAt} />
        </span>
        <button disabled={pending} onClick={() => start(async () => { await stopTimer(ticketId, clientId); router.refresh(); })}
          style={{ border: `1px solid ${DS.accent}`, cursor: "pointer", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600,
            background: DS.card, color: DS.accent, fontFamily: DS.body }}>
          ■ Stop
        </button>
      </div>
    </div>
  );
}
