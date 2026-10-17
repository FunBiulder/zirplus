import { SectionTitle } from "./SectionTitle";
import { HoursRibbon } from "./HoursRibbon";
import { REGIMES, TIERS } from "@/lib/platform/markets";

const REGIME_CARDS = [
  { key: "regular", name: "Open", hours: "14:30 – 21:00 UTC, weekdays", tint: "#c4e2a9", copy: "US exchanges are trading, so the vault quotes at the tier's base spread with its full clip size." },
  { key: "extended", name: "Extended", hours: "09:00 – 14:30 and 21:00 – 01:00", tint: "#f4e2a3", copy: "Pre and post market. The underlying is thin, so spreads widen and the biggest single swap shrinks." },
  { key: "closed", name: "Closed", hours: "Overnight and all weekend", tint: "#f2a9b1", copy: "No exchange is open to anchor the price. Quotes keep coming, priced for the gap risk until the next open." },
] as const;

const HALTS = [
  "The feed is older than the staleness limit for the current session",
  "The issuer flags a corporate action and the feed reports itself paused",
  "A single print jumps more than 25% against the recent checkpoint",
  "The chain's sequencer goes down, plus a recovery grace period after it returns",
];

export function Hours() {
  return (
    <section id="hours" className="frame scroll-mt-6 pt-[clamp(64px,10vw,140px)]">
      <div className="inner">
        <div className="paper p-[clamp(22px,4vw,52px)]">
          <SectionTitle
            tone="dark"
            kicker="02 · Market hours"
            title="The chain never sleeps. The stock market does."
            lead="Stock Tokens move on-chain around the clock, but the exchanges that set their price are open for about 32 hours a week. Zirplus reads the session from the oracle and prices each hour honestly."
          />
          <div className="mt-12">
            <HoursRibbon />
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {REGIME_CARDS.map((r) => {
              const regime = REGIMES[r.key];
              return (
                <article key={r.key} className="rounded-[20px] border border-zp-paper-ink/10 bg-white/60 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-[22px] font-normal text-zp-paper-ink">{r.name}</h3>
                    <span className="size-3 rounded-full" style={{ background: r.tint }} aria-hidden="true" />
                  </div>
                  <p className="mt-1 font-mono text-[11.5px] text-zp-paper-ink/60">{r.hours}</p>
                  <dl className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[14px] bg-zp-paper-ink/[0.05] px-3 py-2.5">
                      <dt className="text-[11.5px] uppercase tracking-[0.08em] text-zp-paper-ink/60">Spread</dt>
                      <dd className="num font-display text-[22px] text-zp-paper-ink">×{(regime.spreadMulBps / 10_000).toFixed(1)}</dd>
                    </div>
                    <div className="rounded-[14px] bg-zp-paper-ink/[0.05] px-3 py-2.5">
                      <dt className="text-[11.5px] uppercase tracking-[0.08em] text-zp-paper-ink/60">Max swap</dt>
                      <dd className="num font-display text-[22px] text-zp-paper-ink">×{(regime.clipMulBps / 10_000).toFixed(2)}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-[14px] leading-relaxed text-zp-paper-ink/75">{r.copy}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-10 grid gap-8 border-t border-zp-paper-ink/10 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <h3 className="font-display text-[24px] font-normal text-zp-paper-ink">Weekends are priced, not banned</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-zp-paper-ink/75">
                Saturday and Sunday count as closed from start to finish. You can still swap, at ×3 the spread and half the
                clip, and the ticket tells you so before you sign. Refusing to quote would bring office hours to a chain that
                runs 24/7; quoting weekday spreads on a Saturday would quietly hand the gap risk to LPs. Neither is fair.
              </p>
              <p className="mt-3 text-[13px] text-zp-paper-ink/60">
                Tier A today: {TIERS[1].baseHalfSpreadBps} bps base, so {TIERS[1].baseHalfSpreadBps * 3} bps when closed.
              </p>
            </div>
            <div>
              <h3 className="font-display text-[24px] font-normal text-zp-paper-ink">When quoting stops entirely</h3>
              <ul className="mt-4 space-y-2.5">
                {HALTS.map((h) => (
                  <li key={h} className="flex gap-3 text-[14.5px] leading-relaxed text-zp-paper-ink/80">
                    <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-zp-paper-ink/50" aria-hidden="true" />
                    {h}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-[14px] bg-zp-paper-ink px-4 py-3 text-[13.5px] text-zp-paper">
                A halt only stops new prices. LP withdrawals never depend on the oracle, so they keep working.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
