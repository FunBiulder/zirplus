"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Gauge, Layers, ReceiptText, SearchX } from "lucide-react";
import { useNow, useVenue } from "@/components/platform/usePlatformData";
import { BarChart, Badge, EmptyState, PageHead, Segmented, Sheet, Skeleton, StatBand, StatCard, Table, Td, Th, sessionTone } from "@/components/platform/ui";
import { fmtAgo, fmtBps, fmtCompact } from "@/lib/platform/format";
import { FEES, QUOTE_SYMBOL, REGIMES, TIERS, currentSession } from "@/lib/platform/markets";
import { TokenLogo } from "@/components/platform/TokenLogo";

type SideFilter = "all" | "buy" | "sell";
type VenueFilter = "all" | "vault" | "rfq";

const SIDE_OPTIONS = [
  { value: "all", label: "Both sides" },
  { value: "buy", label: "Buys" },
  { value: "sell", label: "Sells" },
] as const;

const VENUE_OPTIONS = [
  { value: "all", label: "Both lanes" },
  { value: "vault", label: "Vault" },
  { value: "rfq", label: "RFQ" },
] as const;

const fmtMul = (bps: number) => `×${(bps / 10_000).toFixed(1)}`;

export default function ExplorerPage() {
  const venue = useVenue();
  const now = useNow();
  const session = currentSession(new Date(now));

  const [side, setSide] = useState<SideFilter>("all");
  const [venueFilter, setVenueFilter] = useState<VenueFilter>("all");

  const fills = useMemo(() => venue.data?.fills ?? [], [venue.data]);
  const governance = venue.data?.governance ?? [];
  const markets = venue.data?.markets ?? [];
  const marketCount = markets.length;
  const nameOf = (symbol: string) => markets.find((m) => m.symbol === symbol)?.name;

  const stats = useMemo(() => {
    const total = fills.reduce((s, f) => s + f.notional, 0);
    const weighted = fills.reduce((s, f) => s + f.executionBps * f.notional, 0);
    const rfq = fills.filter((f) => f.venue === "rfq").reduce((s, f) => s + f.notional, 0);
    return {
      total,
      avgBps: total > 0 ? weighted / total : null,
      rfqShare: total > 0 ? (rfq / total) * 100 : 0,
      rfqCount: fills.filter((f) => f.venue === "rfq").length,
    };
  }, [fills]);

  const chronological = useMemo(() => [...fills].sort((a, b) => b.minutesAgo - a.minutesAgo), [fills]);
  const chartData = chronological.map((f) => ({ label: `${f.symbol} · ${fmtAgo(f.minutesAgo)}`, value: f.executionBps }));

  const shown = fills.filter((f) => (side === "all" || f.side === side) && (venueFilter === "all" || f.venue === venueFilter));
  const loading = venue.loading && !venue.data;
  const sourceNote = venue.data?.source === "supabase" ? "from the indexer read model" : "appear once the indexer is connected";

  return (
    <div>
      <PageHead
        code="Explorer"
        title="Show your working"
        description="Every fill itemised, every parameter in force, every governance change. It is all derived from chain events, and if this page and the chain ever disagree, the chain is right."
      />

      <StatBand className="mt-10">
        <StatCard label="Fills listed" value={loading ? "…" : String(fills.length)} hint={sourceNote} icon={<ReceiptText aria-hidden="true" />} />
        <StatCard label="Total notional" value={loading ? "…" : fmtCompact(stats.total, QUOTE_SYMBOL)} hint="across every fill listed" icon={<Layers aria-hidden="true" />} />
        <StatCard label="Avg cost over mid" value={loading ? "…" : fmtBps(stats.avgBps)} hint="weighted by notional" accent="lit" icon={<Gauge aria-hidden="true" />} />
        <StatCard
          label="Routed via RFQ"
          value={loading ? "…" : `${stats.rfqShare.toFixed(0)}%`}
          hint={`${stats.rfqCount} of ${fills.length} fills, by notional`}
          icon={<ArrowLeftRight aria-hidden="true" />}
        />
      </StatBand>

      <Sheet label="Cost over mid, fill by fill" meta="bps, oldest to latest" className="mt-10">
        {loading ? (
          <Skeleton rows={4} />
        ) : (
          <BarChart
            data={chartData}
            height={160}
            format={(v) => fmtBps(v)}
            emptyLabel="No fills yet"
            axisLabels={
              chronological.length > 0
                ? [
                    `Oldest, ${fmtAgo(chronological[0].minutesAgo)}`,
                    `${chronological.length} fills`,
                    `Latest, ${fmtAgo(chronological[chronological.length - 1].minutesAgo)}`,
                  ]
                : undefined
            }
          />
        )}
      </Sheet>

      <Sheet label="Fills" meta={sourceNote} className="mt-4">
        {loading ? (
          <Skeleton rows={8} />
        ) : fills.length === 0 ? (
          <EmptyState
            icon={<ReceiptText aria-hidden="true" />}
            title="No fills yet"
            action={
              <Link href="/platform/swap" className="btn btn-sm">
                Open the ticket
              </Link>
            }
          />
        ) : (
          <>
            <div className="-mx-5 -mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-zp-line px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Segmented label="Filter by side" options={SIDE_OPTIONS} value={side} onChange={setSide} />
                <Segmented label="Filter by lane" options={VENUE_OPTIONS} value={venueFilter} onChange={setVenueFilter} />
              </div>
              <span className="text-[12.5px] text-zp-fg-3">
                <span className="num text-zp-fg-2">{shown.length}</span> of <span className="num">{fills.length}</span>
              </span>
            </div>
            {shown.length === 0 ? (
              <div className="pt-5">
                <EmptyState
                  icon={<SearchX aria-hidden="true" />}
                  title="Nothing matches these filters"
                  action={
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setSide("all");
                        setVenueFilter("all");
                      }}
                    >
                      Clear filters
                    </button>
                  }
                />
              </div>
            ) : (
              <Table minWidth={720}>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Market</Th>
                    <Th>Side</Th>
                    <Th className="text-right">Notional</Th>
                    <Th>Lane</Th>
                    <Th className="text-right">Cost over mid</Th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((f, i) => {
                    const name = nameOf(f.symbol);
                    return (
                      <tr key={`${f.minutesAgo}-${f.symbol}-${i}`}>
                        <Td className="whitespace-nowrap font-mono text-[12.5px] text-zp-fg-3">{fmtAgo(f.minutesAgo)}</Td>
                        <Td>
                          <div className="flex items-center gap-3">
                            <TokenLogo symbol={f.symbol} size={30} rounded="round" />
                            <div className="min-w-0 leading-tight">
                              <div className="font-medium text-zp-fg">{f.symbol}</div>
                              {name && <div className="truncate text-[12.5px] text-zp-fg-4">{name}</div>}
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <Badge tone={f.side === "buy" ? "up" : "down"}>{f.side === "buy" ? "Buy" : "Sell"}</Badge>
                        </Td>
                        <Td className="whitespace-nowrap text-right text-zp-fg">
                          {fmtCompact(f.notional)}
                          <span className="text-zp-fg-4"> {QUOTE_SYMBOL}</span>
                        </Td>
                        <Td>
                          <Badge tone={f.venue === "rfq" ? "accent" : "muted"}>{f.venue === "rfq" ? "RFQ" : "Vault"}</Badge>
                        </Td>
                        <Td className="whitespace-nowrap text-right text-zp-fg">
                          {f.executionBps.toFixed(1)}
                          <span className="text-zp-fg-4"> bps</span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </>
        )}
        <p className="mt-5 text-[12px] leading-relaxed text-zp-fg-3">Every fill is listed, expensive closed-session ones included. The filters only narrow the view.</p>
      </Sheet>

      {/* Parameters as spec cards */}
      <section className="mt-14" aria-labelledby="params-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="params-title" className="font-display text-[26px] font-light text-zp-fg">Parameters in force</h2>
          <span className="text-[13px] text-zp-fg-3">parameter changes are timelocked, with the rationale published</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {([1, 2, 3] as const).map((t) => (
            <div key={t} className="rounded-[26px] border border-zp-line bg-zp-card/70 p-5">
              <div className="flex items-center justify-between">
                <span className="font-display text-[22px] text-zp-fg">Tier {TIERS[t].label}</span>
                <Badge tone={t === 1 ? "accent" : "muted"}>{markets.filter((m) => m.tier === t).length} {markets.filter((m) => m.tier === t).length === 1 ? "market" : "markets"}</Badge>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Half-spread", fmtBps(TIERS[t].baseHalfSpreadBps, 0)],
                  ["Band", fmtBps(TIERS[t].oracleBandBps, 0)],
                  ["Max swap", fmtCompact(TIERS[t].maxClip)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[16px] bg-white/[0.04] px-2 py-3">
                    <dt className="text-[10.5px] uppercase tracking-[0.1em] text-zp-fg-4">{k}</dt>
                    <dd className="num mt-1 text-[14px] text-zp-fg">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] border border-zp-line p-5">
            <p className="lbl">Session now</p>
            <div className="mt-3">
              <Badge tone={sessionTone(session)}>{REGIMES[session].label}</Badge>
            </div>
            <p className="mt-3 text-[13px] text-zp-fg-3">
              Extended {fmtMul(REGIMES.extended.spreadMulBps)} spread · closed {fmtMul(REGIMES.closed.spreadMulBps)} spread
            </p>
          </div>
          <div className="rounded-[26px] border border-zp-line p-5">
            <p className="lbl">Fees</p>
            <p className="num mt-3 font-display text-[22px] text-zp-fg">
              {fmtBps(FEES.swapFeeBps)} <span className="text-[13px] text-zp-fg-4">swap</span> · {fmtBps(FEES.rfqFeeBps)}{" "}
              <span className="text-[13px] text-zp-fg-4">RFQ</span>
            </p>
            <p className="mt-2 text-[13px] text-zp-fg-3">plus {FEES.spreadShareBps / 100}% of realised spread</p>
          </div>
          <div className="rounded-[26px] border border-zp-line p-5">
            <p className="lbl">Markets live</p>
            <p className="num mt-3 font-display text-[34px] font-light text-zp-fg">{marketCount}</p>
          </div>
        </div>
      </section>

      {/* Governance */}
      <section className="mt-14" aria-labelledby="gov-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="gov-title" className="font-display text-[26px] font-light text-zp-fg">Governance log</h2>
          <span className="text-[13px] text-zp-fg-3">no function anywhere touches user funds</span>
        </div>
        {governance.length === 0 && (
          <div className="mt-6">
            <EmptyState icon={<ReceiptText aria-hidden="true" />} title="No governance actions recorded yet" body="Deploys, parameter changes and pauses appear here once the indexer reads them from the chain." />
          </div>
        )}
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {governance.map((entry, i) => (
            <li key={entry.date + entry.action} className="relative rounded-[26px] border border-zp-line bg-zp-ink/40 p-5">
              <div className="flex items-center gap-3">
                <span className="size-2.5 rounded-full" style={{ background: i === 0 ? "var(--pastel)" : "#8f8a82" }} aria-hidden="true" />
                {/^\d{4}-/.test(entry.date) ? (
                  <time dateTime={entry.date} className="font-mono text-[12px] text-zp-fg-3">
                    {entry.date}
                  </time>
                ) : (
                  <span className="font-mono text-[12px] text-zp-fg-3">{entry.date}</span>
                )}
              </div>
              <p className="mt-3 font-display text-[18px] text-zp-fg">{entry.action}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-zp-fg-2">{entry.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
