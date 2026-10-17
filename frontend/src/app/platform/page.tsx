"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, BarChart3, Gauge, Inbox, Vault } from "lucide-react";
import { useSession } from "@/components/platform/PlatformProviders";
import { useNow, useVenue } from "@/components/platform/usePlatformData";
import {
  Badge,
  BarChart,
  BarList,
  EmptyState,
  ExplorerLink,
  LeaderRow,
  PageHead,
  Ring,
  Segmented,
  Sheet,
  Skeleton,
  StatBand,
  StatCard,
  sessionTone,
} from "@/components/platform/ui";
import { fmtAgo, fmtBps, fmtCompact, fmtMoney } from "@/lib/platform/format";
import { FEES, QUOTE_SYMBOL, REGIMES, TIERS, currentSession, quoteSwap, type Session } from "@/lib/platform/markets";
import { TokenLogo } from "@/components/platform/TokenLogo";

const SESSION_NOTE: Record<Session, string> = {
  regular: "US exchanges are trading. Tier base spreads and full swap sizes apply.",
  extended: "Pre or post market. The underlying trades thinly, so spreads widen and the largest swap shrinks.",
  closed: "US markets are shut. Spreads widen to cover the gap to the next open, and swap sizes are cut.",
};

type TierFilter = "all" | "1" | "2" | "3";
const TIER_OPTIONS = [
  { value: "all", label: "All tiers" },
  { value: "1", label: "A" },
  { value: "2", label: "B" },
  { value: "3", label: "C" },
] as const satisfies readonly { value: TierFilter; label: string }[];

const fmtQuote = (v: number) => fmtMoney(v, QUOTE_SYMBOL);

export default function OverviewPage() {
  const { authenticated, login } = useSession();
  const venue = useVenue();
  const now = useNow();
  const session = currentSession(new Date(now));
  const regime = REGIMES[session];
  const [tier, setTier] = useState<TierFilter>("all");

  const markets = useMemo(() => venue.data?.markets ?? [], [venue.data]);
  const fills = useMemo(() => venue.data?.fills ?? [], [venue.data]);
  const loading = venue.loading && !venue.data;

  const tvl = markets.reduce((acc, m) => acc + m.tvl, 0);
  const volume = markets.reduce((acc, m) => acc + m.volume24h, 0);
  const funded = markets.filter((m) => m.tvl > 0).length;

  const dayFills = useMemo(() => fills.filter((f) => f.minutesAgo < 1440), [fills]);
  const avgExecution = dayFills.length ? dayFills.reduce((s, f) => s + f.executionBps, 0) / dayFills.length : null;

  // 24 hourly buckets from fills, oldest on the left.
  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, i) => {
      const h = 23 - i;
      return { label: h === 0 ? "In the last hour" : `${h}h ago`, value: 0 };
    });
    for (const f of dayFills) buckets[23 - Math.floor(f.minutesAgo / 60)].value += f.notional;
    return buckets;
  }, [dayFills]);
  const fillVolume = dayFills.reduce((s, f) => s + f.notional, 0);

  const shown = tier === "all" ? markets : markets.filter((m) => String(m.tier) === tier);
  const tvlRank = [...markets].filter((m) => m.tvl > 0).sort((a, b) => b.tvl - a.tvl);
  const latest = [...fills].sort((a, b) => a.minutesAgo - b.minutesAgo).slice(0, 6);

  return (
    <div>
      <PageHead
        code="Overview"
        title="The venue, live"
        description="Every market quotes around the guarded Chainlink mid. Here is what each one charges right now, and what has traded."
        action={
          !authenticated ? (
            <button type="button" onClick={login} className="btn btn-solid">
              Sign in to trade
            </button>
          ) : (
            <Link href="/platform/swap" className="btn btn-solid">
              New swap
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )
        }
      />

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <StatBand className="lg:grid-cols-2 xl:grid-cols-2">
          <StatCard label="Vault TVL" value={fmtCompact(tvl, QUOTE_SYMBOL)} hint={`${funded} of ${markets.length} markets funded`} icon={<Vault />} />
          <StatCard label="24h volume" value={fmtCompact(volume, QUOTE_SYMBOL)} hint="vaults and RFQ together" accent="lit" icon={<BarChart3 />} />
          <StatCard label="Fills, 24h" value={String(dayFills.length)} hint={`${fmtCompact(fillVolume, QUOTE_SYMBOL)} notional`} icon={<Activity />} />
          <StatCard label="Avg cost over mid" value={avgExecution === null ? "n/a" : fmtBps(avgExecution)} hint="spread plus fee, per fill" icon={<Gauge />} />
        </StatBand>

        <section className="flex items-center gap-6 rounded-[26px] border border-zp-line bg-zp-ink/45 p-6" aria-label="Current session">
          <Ring value={regime.clipMulBps / 10_000} size={112}>
            <span>
              <span className="num block font-display text-[26px] font-light text-zp-fg">×{(regime.spreadMulBps / 10_000).toFixed(1)}</span>
              <span className="block text-[10.5px] uppercase tracking-[0.12em] text-zp-fg-3">spread</span>
            </span>
          </Ring>
          <div className="min-w-0">
            <Badge tone={sessionTone(session)}>{regime.label}</Badge>
            <p className="mt-3 text-[13.5px] leading-relaxed text-zp-fg-2">{SESSION_NOTE[session]}</p>
            <p className="mt-2 text-[12.5px] text-zp-fg-3">
              Max swap ×{(regime.clipMulBps / 10_000).toFixed(2)} · fee {fmtBps(FEES.swapFeeBps, 0)} + {FEES.spreadShareBps / 100}% of spread
            </p>
          </div>
        </section>
      </div>

      {/* markets as tiles */}
      <section className="mt-14" aria-labelledby="markets-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="markets-title" className="font-display text-[26px] font-light text-zp-fg">Markets</h2>
            <p className="mt-1 text-[13px] text-zp-fg-3">
              {venue.data?.source === "supabase" ? "From the indexer read model" : "Live Chainlink mids; vault data once the indexer is connected"} ·{" "}
              half-spread shown for a buy right now
            </p>
          </div>
          <Segmented label="Filter markets by tier" options={TIER_OPTIONS} value={tier} onChange={setTier} />
        </div>

        {loading ? (
          <div className="mt-6">
            <Skeleton rows={4} />
          </div>
        ) : shown.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={<Inbox />} title="No markets in this tier" body="Choose another tier to see its vaults." />
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {shown.map((m) => {
              const q = quoteSwap(m, true, 1_000, session);
              return (
                <li key={m.symbol}>
                  <Link
                    href={`/platform/swap?market=${encodeURIComponent(m.symbol)}`}
                    aria-label={`Swap ${m.symbol}`}
                    className="group block h-full rounded-[26px] border border-zp-line bg-zp-card/70 p-5 transition-colors hover:border-zp-line-strong hover:bg-zp-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <TokenLogo symbol={m.symbol} size={38} rounded="round" />
                        <div className="min-w-0">
                          <p className="font-medium text-zp-fg">{m.symbol}</p>
                          <p className="truncate text-[12px] text-zp-fg-4">{m.name}</p>
                        </div>
                      </div>
                      <Badge tone={m.tier === 1 ? "accent" : "muted"}>Tier {TIERS[m.tier].label}</Badge>
                    </div>
                    <p className="num mt-6 font-display text-[30px] font-light leading-none text-zp-fg">
                      {fmtMoney(m.mid)}
                      <span className="ml-1.5 font-sans text-[12px] text-zp-fg-4">{QUOTE_SYMBOL}</span>
                    </p>
                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                      <div>
                        <dt className="text-zp-fg-4">Half-spread</dt>
                        <dd className="num text-zp-peach">{q.halfSpreadBps.toFixed(1)} bps</dd>
                      </div>
                      <div>
                        <dt className="text-zp-fg-4">Max swap</dt>
                        <dd className="num text-zp-fg-2">{fmtCompact(q.clip)}</dd>
                      </div>
                      <div>
                        <dt className="text-zp-fg-4">24h volume</dt>
                        <dd className="num text-zp-fg-2">{m.volume24h > 0 ? fmtMoney(m.volume24h) : "0"}</dd>
                      </div>
                      <div>
                        <dt className="text-zp-fg-4">TVL</dt>
                        <dd className="num text-zp-fg-2">{m.tvl > 0 ? fmtMoney(m.tvl) : "0"}</dd>
                      </div>
                    </dl>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-zp-fg-3 transition-colors group-hover:text-zp-fg">
                      Trade <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Sheet label="Volume by hour" meta={<span>last 24 hours, from fills</span>}>
          {loading ? (
            <Skeleton rows={4} />
          ) : (
            <BarChart data={hourly} height={180} format={fmtQuote} axisLabels={["24h ago", "12h ago", "Now"]} emptyLabel="No fills in the last 24 hours" />
          )}
        </Sheet>
        <Sheet label="Where the TVL sits" meta={<span className="num">{fmtCompact(tvl, QUOTE_SYMBOL)}</span>}>
          {loading ? (
            <Skeleton rows={5} />
          ) : tvlRank.length === 0 ? (
            <EmptyState icon={<Vault />} title="No funded vaults yet" />
          ) : (
            <BarList
              items={tvlRank.map((m) => ({
                key: m.symbol,
                label: m.symbol,
                value: m.tvl,
                display: (
                  <>
                    {fmtMoney(m.tvl, "", 0)}
                    <span className="text-zp-fg-4"> {QUOTE_SYMBOL}</span>
                  </>
                ),
              }))}
            />
          )}
        </Sheet>
      </div>

      <Sheet className="mt-4" label="Latest fills" meta={<ExplorerLink href="/platform/explorer">See every fill</ExplorerLink>}>
        {loading ? (
          <Skeleton rows={5} />
        ) : latest.length === 0 ? (
          <EmptyState icon={<Activity />} title="No fills yet" body="Trades appear here the moment the vaults fill them." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((f, i) => (
              <li key={`${f.symbol}-${f.minutesAgo}-${i}`} className="flex items-center gap-3 rounded-[18px] bg-white/[0.035] px-4 py-3">
                <TokenLogo symbol={f.symbol} size={30} rounded="round" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-zp-fg">
                    {f.symbol}
                    {f.venue === "rfq" && <span className="ml-2 text-[11.5px] font-normal text-zp-fg-4">via RFQ</span>}
                  </p>
                  <p className="font-mono text-[11.5px] text-zp-fg-4">{fmtAgo(f.minutesAgo)}</p>
                </div>
                <div className="text-right">
                  <Badge tone={f.side === "buy" ? "up" : "down"}>{f.side === "buy" ? "Buy" : "Sell"}</Badge>
                  <p className="num mt-1 text-[13px] text-zp-fg-2">{fmtMoney(f.notional)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <div className="mt-4 rounded-[22px] border border-dashed border-zp-line-strong px-5 py-4">
        <LeaderRow label="How the half-spread above is built" value="tier base × session ± skew" sub="Sized for a 1,000 USDG buy at this moment." />
      </div>
    </div>
  );
}
