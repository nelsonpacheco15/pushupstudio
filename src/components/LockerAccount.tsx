"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clientChangePlan, clientTogglePause } from "@/app/actions";
import type { SelfService } from "@/components/PortalBoard";
import { INK, PANEL, LINE, MUTE, PAPER } from "@/lib/theme";

const T = {
  en: { plan: "YOUR PLAN", invoices: "INVOICES", pause: "⏸ Pause subscription", resume: "▶ Resume subscription",
    pausedNote: "Your subscription is paused — no new invoices until you resume.",
    confirmPlan: (l: string) => `Switch your plan to ${l}? This changes your monthly price.`,
    confirmPause: "Pause your subscription? We’ll stop new work and billing until you resume.",
    confirmResume: "Resume your subscription?" },
  pt: { plan: "O TEU PLANO", invoices: "FATURAS", pause: "⏸ Pausar subscrição", resume: "▶ Retomar subscrição",
    pausedNote: "A tua subscrição está pausada — sem novas faturas até retomares.",
    confirmPlan: (l: string) => `Mudar o teu plano para ${l}? Isto altera o valor mensal.`,
    confirmPause: "Pausar a tua subscrição? Paramos o trabalho e a faturação até retomares.",
    confirmResume: "Retomar a tua subscrição?" },
};

export default function LockerAccount({ selfService, language }: { selfService: SelfService; language: "en" | "pt" }) {
  const t = T[language];
  const [pending, start] = useTransition();
  const router = useRouter();

  const changePlan = (p: "growth" | "scale", label: string) => {
    if (selfService.plan === p || pending) return;
    if (!confirm(t.confirmPlan(label))) return;
    start(async () => { await clientChangePlan(p); router.refresh(); });
  };
  const togglePause = () => {
    if (!confirm(selfService.paused ? t.confirmResume : t.confirmPause)) return;
    start(async () => { await clientTogglePause(); router.refresh(); });
  };

  return (
    <div style={{ marginTop: 24, maxWidth: 560 }}>
      <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, opacity: pending ? 0.6 : 1 }}>
        <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, color: MUTE, marginBottom: 12 }}>[ {t.plan} ]</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {(["growth", "scale"] as const).map((p) => {
            const on = selfService.plan === p;
            const label = p === "growth" ? selfService.growthLabel : selfService.scaleLabel;
            return (
              <button key={p} onClick={() => changePlan(p, label)} disabled={on || pending}
                style={{ flex: 1, minWidth: 120, minHeight: 44, cursor: on ? "default" : "pointer", borderRadius: 8, padding: "10px 8px",
                  border: `1px solid ${on ? PAPER : LINE}`, background: on ? PAPER : "transparent", color: on ? INK : PAPER,
                  fontSize: 12.5, fontWeight: 700, fontFamily: "'IBM Plex Mono'" }}>
                {label}{on ? " ✓" : ""}
              </button>
            );
          })}
        </div>
        <button onClick={togglePause} disabled={pending}
          style={{ width: "100%", minHeight: 44, background: "transparent", color: selfService.paused ? "#7FB77E" : MUTE,
            border: `1px solid ${LINE}`, borderRadius: 8, padding: "8px", fontSize: 12, cursor: "pointer", fontFamily: "'IBM Plex Mono'" }}>
          {selfService.paused ? t.resume : t.pause}
        </button>
        {selfService.paused && <div style={{ fontSize: 11, color: MUTE, marginTop: 8 }}>{t.pausedNote}</div>}

        {selfService.invoices.length > 0 && (
          <>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: 1, color: MUTE, margin: "16px 0 8px" }}>[ {t.invoices} ]</div>
            {selfService.invoices.map((inv) => (
              <div key={inv.number} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: `1px solid ${LINE}`, fontSize: 12 }}>
                <span style={{ fontFamily: "'IBM Plex Mono'", color: PAPER }}>{inv.number}</span>
                <span style={{ color: MUTE, flex: 1 }}>{inv.periodLabel}</span>
                <span style={{ fontFamily: "'IBM Plex Mono'" }}>{inv.amountLabel}</span>
                <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: inv.status === "paid" ? "#7FB77E" : MUTE }}>{inv.status.toUpperCase()}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
