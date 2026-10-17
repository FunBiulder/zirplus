"use client";

import { useSyncExternalStore } from "react";
import { REGIMES, currentSession } from "@/lib/platform/markets";

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
};
// Rounded to the minute so the snapshot is stable between ticks.
const getNow = () => Math.floor(Date.now() / 60_000) * 60_000;

const NAME = { regular: "Open", extended: "Extended", closed: "Closed" } as const;

/**
 * The stacked figure on the right of the hero, standing in for the reference's event date:
 * today's date, the US equity session right now and the spread multiplier it carries.
 */
export function LiveSession() {
  const now = useSyncExternalStore(subscribe, getNow, () => 0);
  if (!now) return <div className="h-[132px] w-[150px]" aria-hidden="true" />;

  const d = new Date(now);
  const session = currentSession(d);
  const regime = REGIMES[session];
  const day = d.getUTCDate();
  const month = d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

  return (
    <div className="font-display font-light leading-[1.15] text-zp-fg lg:text-right">
      <p className="text-[clamp(26px,2.6vw,34px)]">{day}</p>
      <p className="text-[clamp(26px,2.6vw,34px)]">{month}</p>
      <p className="mt-2 inline-flex items-center gap-2 text-[15px] text-zp-fg-2">
        <span
          className={`pulse-dot size-2 rounded-full ${session === "regular" ? "bg-zp-up" : session === "extended" ? "bg-zp-warn" : "bg-zp-rose"}`}
          aria-hidden="true"
        />
        {NAME[session]} · ×{(regime.spreadMulBps / 10_000).toFixed(1)}
      </p>
      <p className="num mt-1 font-mono text-[12px] tracking-[0.1em] text-zp-fg-3">{time} UTC</p>
    </div>
  );
}
