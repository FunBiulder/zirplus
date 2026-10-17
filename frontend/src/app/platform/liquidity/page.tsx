"use client";

import { useMemo, useState } from "react";
import { Crosshair, Inbox, Layers, Percent, ShieldCheck, TrendingUp, TriangleAlert, Vault } from "lucide-react";
import { useSession } from "@/components/platform/PlatformProviders";
import { useNow, useVenue } from "@/components/platform/usePlatformData";
import {
  Badge,
  EmptyState,
  Notice,
  PageHead,
  Ring,
  Segmented,
  Sheet,
  Skeleton,
  SplitBar,
  StatBand,
  StatCard,
  sessionTone,
} from "@/components/platform/ui";
import { fmtCompact, fmtMoney } from "@/lib/platform/format";
import { FEES, QUOTE_SYMBOL, REGIMES, TIERS, currentSession } from "@/lib/platform/markets";
import { TokenLogo } from "@/components/platform/TokenLogo";

type TierFilter = "all" | "1" | "2" | "3";
const TIER_OPTIONS = [
  { value: "all", label: "All tiers" },
  { value: "1", label: "A" },
  { value: "2", label: "B" },
  { value: "3", label: "C" },
] as const satisfies readonly { value: TierFilter; label: string }[];

const LP_SHARE = 100 - FEES.spreadShareBps / 100;

const EXPLAINERS = [
  {
    label: "You earn",
    icon: TrendingUp,
    body: `The spread your vault collects on every fill, minus the protocol's ${FEES.spreadShareBps / 100}% share, paid continuously into the value of each share. No emissions, no points, nothing to farm.`,
  },
  {
    label: "You risk",
    icon: TriangleAlert,
    body: "Price exposure to the token you choose, weekend gap risk on fills while markets are closed (priced in by the ×3 multiplier), and the issuer risk that comes with any Stock Token.",
  },
  {
    label: "You never risk",
    icon: ShieldCheck,
    body: "Leverage, liquidation, losses from other markets, or a locked exit. The right to withdraw is enforced by the contract, not granted by anyone.",
  },
];

export default function LiquidityPage() {
  const { authenticated, login } = useSession();
  const venue = useVenue();
  const now = useNow();
  const session = currentSession(new Date(now));
  const markets = useMemo(() => venue.data?.markets ?? [], [venue.data]);
  const loading = venue.loading && !venue.data;
  const [tier, setTier] = useState<TierFilter>("all");

  const tvl = markets.reduce((acc, m) => acc + m.tvl, 0);
  const funded = markets.filter((m) => m.tvl > 0);
  const inBand = markets.filter((m) => Math.abs(m.inventoryRatioBps - 5000) <= TIERS[m.tier].inventoryBandBps).length;
  const shown = tier === "all" ? markets : markets.filter((m) => String(m.tier) === tier);
  const share = [...funded].sort((a, b) => b.tvl - a.tvl).map((m) => ({ key: m.symbol, label: m.symbol, value: m.tvl }));

  return (
    <div>
      <PageHead
        code="Vaults"
        title="Earn the spread"
        description="Each vault quotes around the oracle, so what LPs earn is what traders pay for immediacy, not what arbitrage leaves behind. Every vault stands alone: trouble in one market can never reach yours."
      />

      <div className="mt-8">
        <Notice>
          Providing liquidity needs an <span className="font-mono">LP</span> attestation, issued to professional clients
          during the guarded launch. Withdrawals are pro-rata and in kind, and they work whatever state the vault is in.
        </Notice>
      </div>

      <StatBand className="mt-6">
        <StatCard label="Total TVL" value={fmtCompact(tvl, QUOTE_SYMBOL)} hint="across every vault" accent="lit" icon={<Vault />} />
        <StatCard label="Vaults" value={String(markets.length)} hint={`${funded.length} funded, ${markets.length - funded.length} waiting`} icon={<Layers />} />
        <StatCard label="LP share of spread" value={`${LP_SHARE}%`} hint={`protocol keeps ${FEES.spreadShareBps / 100}%`} icon={<Percent />} />
        <StatCard label="Inside inventory band" value={`${inBand} of ${markets.length}`} hint="token share between 30% and 70%" icon={<Crosshair />} />
      </StatBand>

      <section className="mt-14" aria-labelledby="vaults-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="vaults-title" className="font-display text-[26px] font-light text-zp-fg">Vaults</h2>
            <p className="mt-1 flex items-center gap-2 text-[13px] text-zp-fg-3">
              Session <Badge tone={sessionTone(session)}>{REGIMES[session].label}</Badge> · the ring shows the token&apos;s share
              of the vault, the tick marks the 50% target
            </p>
          </div>
          <Segmented label="Filter vaults by tier" options={TIER_OPTIONS} value={tier} onChange={setTier} />
        </div>

        {loading ? (
          <div className="mt-6">
            <Skeleton rows={6} />
          </div>
        ) : shown.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={<Inbox />} title="No vaults in this tier" body="Choose another tier to see its vaults." />
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((m) => {
              const t = TIERS[m.tier];
              const pct = m.inventoryRatioBps / 100;
              // Warn as the vault nears the edge of its inventory band.
              const warn = Math.abs(m.inventoryRatioBps - 5000) > t.inventoryBandBps * 0.75;
              return (
                <li key={m.symbol} className="flex flex-col rounded-[26px] border border-zp-line bg-zp-card/70 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <TokenLogo symbol={m.symbol} size={36} rounded="round" />
                      <div className="min-w-0">
                        <p className="font-medium text-zp-fg">{m.symbol}</p>
                        <p className="truncate text-[12px] text-zp-fg-4">{m.name}</p>
                      </div>
                    </div>
                    <Badge tone={m.tier === 1 ? "accent" : "muted"}>Tier {t.label}</Badge>
                  </div>

                  <div className="mt-5 flex items-center gap-5">
                    <Ring value={pct / 100} target={0.5} warn={warn} size={104}>
                      <span>
                        <span className={`num block font-display text-[20px] ${warn ? "text-zp-warn" : "text-zp-fg"}`}>{pct.toFixed(1)}%</span>
                        <span className="block text-[10px] uppercase tracking-[0.12em] text-zp-fg-4">token</span>
                      </span>
                    </Ring>
                    <dl className="grid flex-1 gap-2 text-[13px]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-zp-fg-3">TVL</dt>
                        <dd className="num text-zp-fg">{m.tvl > 0 ? fmtMoney(m.tvl) : "0"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-zp-fg-3">Base half-spread</dt>
                        <dd className="num text-zp-fg">{t.baseHalfSpreadBps} bps</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-zp-fg-3">LP share</dt>
                        <dd className="num text-zp-up">{LP_SHARE}%</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-5">
                    {authenticated ? (
                      <button type="button" className="btn btn-sm w-full" disabled>
                        Deposits opening soon
                      </button>
                    ) : (
                      <button type="button" className="btn btn-sm w-full" onClick={login}>
                        Sign in to deposit
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-[12.5px] leading-relaxed text-zp-fg-3">
          Deposits are valued at the live mid, so they pause while a market is halted. Withdrawals read no price and never pause.
        </p>
      </section>

      <Sheet className="mt-10" label="Who holds the TVL" meta={<span className="num">{fmtCompact(tvl, QUOTE_SYMBOL)}</span>}>
        {loading ? <Skeleton rows={2} /> : share.length === 0 ? <EmptyState icon={<Vault />} title="No funded vaults yet" /> : <SplitBar parts={share} format={(v) => fmtMoney(v)} />}
      </Sheet>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {EXPLAINERS.map((c, i) => (
          <div key={c.label} className={i === 2 ? "rounded-[26px] bg-zp-paper p-6 text-zp-paper-ink" : "rounded-[26px] border border-zp-line p-6"}>
            <c.icon className={i === 2 ? "size-5 text-zp-paper-ink" : "size-5 text-zp-peach"} aria-hidden="true" />
            <h3 className={i === 2 ? "mt-4 font-display text-[20px]" : "mt-4 font-display text-[20px] text-zp-fg"}>{c.label}</h3>
            <p className={i === 2 ? "mt-2 text-[14px] leading-relaxed text-zp-paper-ink/75" : "mt-2 text-[14px] leading-relaxed text-zp-fg-2"}>{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
