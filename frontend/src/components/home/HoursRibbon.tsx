"use client";

import { useSyncExternalStore } from "react";
import { currentSession } from "@/lib/platform/markets";

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 60_000);
  return () => clearInterval(t);
};
const getNow = () => Math.floor(Date.now() / 60_000) * 60_000;

// One weekday in UTC, in minutes. Mirrors currentSession() in lib/platform/markets.ts.
const SEGMENTS = [
  { from: 0, to: 60, s: "extended" },
  { from: 60, to: 540, s: "closed" },
  { from: 540, to: 870, s: "extended" },
  { from: 870, to: 1260, s: "regular" },
  { from: 1260, to: 1440, s: "extended" },
] as const;

const TINT = { regular: "#c4e2a9", extended: "#f4e2a3", closed: "#f2a9b1" } as const;
const LABEL = { regular: "Open", extended: "Extended", closed: "Closed" } as const;

/** A weekday laid out as a 24-hour ribbon, with a marker at the current UTC minute. */
export function HoursRibbon() {
  const now = useSyncExternalStore(subscribe, getNow, () => 0);
  const d = now ? new Date(now) : null;
  const minute = d ? d.getUTCHours() * 60 + d.getUTCMinutes() : null;
  const weekend = d ? currentSession(d) === "closed" && (d.getUTCDay() === 0 || d.getUTCDay() === 6) : false;

  return (
    <figure>
      <div className="relative h-[74px]" role="img" aria-label="A weekday in UTC: extended until 01:00, closed 01:00 to 09:00, extended 09:00 to 14:30, open 14:30 to 21:00, extended from 21:00">
        <div className="absolute inset-x-0 top-[22px] flex h-[30px] overflow-hidden rounded-full">
          {SEGMENTS.map((seg) => (
            <span
              key={seg.from}
              className="h-full border-r border-zp-paper/70 last:border-r-0"
              style={{ width: `${((seg.to - seg.from) / 1440) * 100}%`, background: TINT[seg.s], opacity: weekend ? 0.35 : 1 }}
            />
          ))}
        </div>
        {minute !== null && (
          <div className="absolute top-0 h-full" style={{ left: `${(minute / 1440) * 100}%` }}>
            <span className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-zp-paper-ink px-2 py-0.5 font-mono text-[10.5px] text-zp-paper">
              now
            </span>
            <span className="absolute left-0 top-[18px] h-[40px] w-[2px] -translate-x-1/2 rounded-full bg-zp-paper-ink" />
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-zp-paper-ink/60">
        {["00", "03", "06", "09", "12", "15", "18", "21", "24"].map((h) => (
          <span key={h}>{h}:00</span>
        ))}
      </div>
      <figcaption className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-zp-paper-ink/75">
        {(["regular", "extended", "closed"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: TINT[s] }} aria-hidden="true" />
            {LABEL[s]}
          </span>
        ))}
        {weekend && <span className="font-medium text-zp-paper-ink">It&apos;s the weekend: closed all day.</span>}
      </figcaption>
    </figure>
  );
}
