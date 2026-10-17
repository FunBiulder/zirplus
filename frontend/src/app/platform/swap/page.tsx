"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownUp, Info } from "lucide-react";
import { useSession } from "@/components/platform/PlatformProviders";
import { useNow, useVenue } from "@/components/platform/usePlatformData";
import { useOnchainSwap } from "@/components/platform/useOnchainSwap";
import { platformEnv } from "@/lib/platform/env";
import { formatUnits } from "viem";
import { Badge, Button, EmptyState, LeaderRow, Notice, PageHead, Segmented, Select, Skeleton, sessionTone } from "@/components/platform/ui";
import { fmtBps, fmtMoney } from "@/lib/platform/format";
import { FEES, QUOTE_SYMBOL, REGIMES, TIERS, currentSession, quoteSwap } from "@/lib/platform/markets";
import { TokenLogo } from "@/components/platform/TokenLogo";
import { cn } from "@/lib/utils";

const SLIPPAGE_OPTIONS = [10, 15, 30, 50] as const;
const SLIPPAGE_SEGMENTS = SLIPPAGE_OPTIONS.map((bps) => ({ value: String(bps), label: `${(bps / 100).toFixed(2)}%` }));

const TITLE = "Swap";
const DESCRIPTION =
  "Pick a market, enter an amount, and read the receipt before you sign. The chain enforces exactly what you approve: anything worse than your bound reverts.";

function TokenChip({ symbol }: { symbol: string }) {
  return (
    <span className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-zp-line-strong bg-zp-ink/50 pl-1.5 pr-4">
      <TokenLogo symbol={symbol} size={30} rounded="round" />
      <span className="text-[14px] font-medium text-zp-fg">{symbol}</span>
    </span>
  );
}

function SwapButton({
  swap,
  inSymbol,
  outSymbol,
  quoteOk,
}: {
  swap: ReturnType<typeof useOnchainSwap>;
  inSymbol: string;
  outSymbol: string;
  quoteOk: boolean;
}) {
  let label = `Swap ${inSymbol} for ${outSymbol}`;
  let disabled = false;
  if (!swap.available) [label, disabled] = ["Not open for web trading yet", true];
  else if (swap.eligible === false) [label, disabled] = ["Your wallet needs a TRADER attestation", true];
  else if (!swap.amountIn || !quoteOk) [label, disabled] = ["Enter a valid amount", true];
  else if (swap.balance !== null && swap.balance < swap.amountIn) [label, disabled] = [`Not enough ${inSymbol}`, true];
  else if (swap.stage === "approving") [label, disabled] = [`Approve ${inSymbol} in your wallet…`, true];
  else if (swap.stage === "swapping") [label, disabled] = ["Confirm the swap in your wallet…", true];
  else if (swap.previewError) [label, disabled] = ["Swap unavailable right now", true];
  else if (swap.previewOut === null) [label, disabled] = [swap.previewing ? "Getting the on-chain quote…" : "Waiting for a quote", true];
  return (
    <Button className="btn-lg w-full" disabled={disabled} onClick={() => void swap.execute()}>
      {label}
    </Button>
  );
}

function SwapSkeleton() {
  return (
    <div className="space-y-10">
      <PageHead code="Swap" title={TITLE} description={DESCRIPTION} />
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
        <Skeleton rows={6} />
        <div className="card p-6">
          <Skeleton rows={8} />
        </div>
        <Skeleton rows={6} />
      </div>
    </div>
  );
}

export default function SwapPage() {
  return (
    <Suspense fallback={<SwapSkeleton />}>
      <SwapRoute />
    </Suspense>
  );
}

/** Reads the `?market=` deep link and remounts the ticket when it changes. */
function SwapRoute() {
  const requested = useSearchParams().get("market");
  return <SwapTicket key={requested ?? ""} requested={requested} />;
}

function SwapTicket({ requested }: { requested: string | null }) {
  const { authenticated, login } = useSession();
  const venue = useVenue();
  const now = useNow();
  const session = currentSession(new Date(now));
  const regime = REGIMES[session];

  const markets = useMemo(() => venue.data?.markets ?? [], [venue.data]);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [buyToken, setBuyToken] = useState(true);
  const [amountRaw, setAmountRaw] = useState("10000");
  const [slippageBps, setSlippageBps] = useState(15);

  // An explicit pick wins; otherwise the deep link (if it names a listed market); otherwise the first market.
  const linked = requested ? markets.find((m) => m.symbol.toLowerCase() === requested.toLowerCase()) : undefined;
  const market = markets.find((m) => m.symbol === symbol) ?? linked ?? markets[0];
  const amountIn = Number(amountRaw.replace(/,/g, ""));
  const quote = useMemo(() => (market ? quoteSwap(market, buyToken, amountIn, session) : null), [market, buyToken, amountIn, session]);
  const swap = useOnchainSwap(market, buyToken, amountRaw, slippageBps);

  if (venue.loading && !venue.data) return <SwapSkeleton />;
  if (!market || !quote) {
    return (
      <div className="space-y-10">
        <PageHead code="Swap" title={TITLE} description={DESCRIPTION} />
        <EmptyState
          icon={<Info aria-hidden="true" />}
          title="No markets are priced right now"
          body={venue.error ?? "Markets appear once supabase/seed.sql has run and their Chainlink feeds can be read."}
        />
      </div>
    );
  }

  const tier = TIERS[market.tier];
  const minOut = quote.ok ? quote.amountOut * (1 - slippageBps / 10_000) : 0;
  const inSymbol = buyToken ? QUOTE_SYMBOL : market.symbol;
  const outSymbol = buyToken ? market.symbol : QUOTE_SYMBOL;
  const outDigits = buyToken ? 4 : 2;
  const regimeMul = (regime.spreadMulBps / 10_000).toFixed(1);
  const sessionHalfSpread = (tier.baseHalfSpreadBps * regime.spreadMulBps) / 10_000;

  const unit = (s: string) => <span className="text-zp-paper-ink/55"> {s}</span>;

  return (
    <div className="space-y-10">
      <PageHead code="Swap" title={TITLE} description={DESCRIPTION} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_330px]">
        {/* Market rail */}
        <aside aria-label="Markets" className="hidden lg:block">
          <p className="lbl mb-3 px-2">Markets</p>
          <ul className="space-y-1">
            {markets.map((m) => {
              const active = m.symbol === market.symbol;
              return (
                <li key={m.symbol}>
                  <button
                    type="button"
                    onClick={() => setSymbol(m.symbol)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 text-left transition-colors",
                      active ? "bg-white/[0.09]" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <TokenLogo symbol={m.symbol} size={30} rounded="round" />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[13.5px] font-medium", active ? "text-zp-fg" : "text-zp-fg-2")}>{m.symbol}</span>
                      <span className="num block text-[11.5px] text-zp-fg-4">{fmtMoney(m.mid)}</span>
                    </span>
                    {active && <span className="size-2 rounded-full" style={{ background: "var(--pastel)" }} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Ticket */}
        <section aria-label={`Swap ticket, ${market.symbol} / ${QUOTE_SYMBOL}`} className="pastel-border relative rounded-[30px] p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <TokenLogo symbol={market.symbol} size={40} rounded="round" />
              <div className="min-w-0">
                <h2 className="truncate font-display text-[19px] text-zp-fg">
                  {market.symbol} <span className="text-zp-fg-4">/ {QUOTE_SYMBOL}</span>
                </h2>
                <p className="truncate text-[12.5px] text-zp-fg-4">{market.name}</p>
              </div>
            </div>
            <Badge tone={sessionTone(session)}>
              {regime.label} ×{regimeMul}
            </Badge>
          </div>

          <div className="mt-5 lg:hidden">
            <label htmlFor="swap-market" className="lbl mb-2 block px-1">
              Market
            </label>
            <Select id="swap-market" value={market.symbol} onChange={(e) => setSymbol(e.target.value)}>
              {markets.map((m) => (
                <option key={m.symbol} value={m.symbol}>
                  {m.symbol} · {m.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-6">
            <div className="rounded-[22px] bg-zp-ink/50 p-5 transition-colors focus-within:bg-zp-ink/70">
              <label htmlFor="swap-pay" className="lbl block">
                You pay<span className="sr-only">, {inSymbol}</span>
              </label>
              <div className="mt-3 flex items-center gap-3">
                <input
                  id="swap-pay"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amountRaw}
                  onChange={(e) => setAmountRaw(e.target.value)}
                  placeholder="0.00"
                  className="num min-w-0 flex-1 bg-transparent font-display text-[34px] font-light leading-none text-zp-fg outline-none placeholder:text-zp-fg-4 sm:text-[40px]"
                />
                <TokenChip symbol={inSymbol} />
              </div>
            </div>

            <div className="relative z-10 -my-4 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  if (quote.ok) setAmountRaw(quote.amountOut.toFixed(buyToken ? 4 : 2));
                  setBuyToken((v) => !v);
                }}
                aria-label="Reverse the swap direction"
                className="group grid size-11 place-items-center rounded-full text-zp-ink shadow-[0_0_0_6px_#232325]"
                style={{ background: "var(--pastel)" }}
              >
                <ArrowDownUp className="size-4 transition-transform duration-300 group-hover:rotate-180" aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-[22px] bg-zp-ink/30 p-5">
              <label htmlFor="swap-receive" className="lbl block">
                You receive<span className="sr-only">, {outSymbol}</span>
              </label>
              <div className="mt-3 flex items-center gap-3">
                <input
                  id="swap-receive"
                  readOnly
                  tabIndex={-1}
                  value={quote.ok ? fmtMoney(quote.amountOut, "", outDigits) : ""}
                  placeholder="0.00"
                  className="num min-w-0 flex-1 bg-transparent font-display text-[34px] font-light leading-none text-zp-fg outline-none placeholder:text-zp-fg-4 sm:text-[40px]"
                />
                <TokenChip symbol={outSymbol} />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1">
            <span className="lbl">Slippage bound</span>
            <Segmented label="Slippage bound" options={SLIPPAGE_SEGMENTS} value={String(slippageBps)} onChange={(v) => setSlippageBps(Number(v))} className="num" />
          </div>

          {!quote.ok && quote.reason && (
            <div className="mt-4">
              <Notice tone="warn">{quote.reason}</Notice>
            </div>
          )}
          {session === "closed" && (
            <div className="mt-4">
              <Notice tone="warn">
                US markets are closed, so this quote carries the ×3 spread and half the usual size. If your trade can wait for
                the open, it will cost less, and we would rather tell you that.
              </Notice>
            </div>
          )}

          {swap.available && swap.previewOut !== null && (
            <p className="num mt-4 px-1 text-[13px] text-zp-fg-2">
              On-chain quote: {fmtMoney(Number(formatUnits(swap.previewOut, swap.outDecimals)), "", outDigits)} {outSymbol} via the{" "}
              {swap.previewVenue === "rfq" ? "RFQ maker" : "vault"} · you receive at least{" "}
              {fmtMoney(Number(formatUnits((swap.previewOut * BigInt(10_000 - slippageBps)) / BigInt(10_000), swap.outDecimals)), "", outDigits)} {outSymbol}
            </p>
          )}
          {swap.available && swap.previewError && quote.ok && (
            <div className="mt-4">
              <Notice tone="warn">{swap.previewError}</Notice>
            </div>
          )}
          {swap.error && (
            <div className="mt-4">
              <Notice tone="error">{swap.error}</Notice>
            </div>
          )}
          {swap.stage === "done" && swap.txHash && (
            <div className="mt-4">
              <Notice tone="info">
                Swap settled.{" "}
                <a
                  href={`${platformEnv.chainExplorer || "https://robinhoodchain.blockscout.com"}/tx/${swap.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  View it on Blockscout
                </a>
                .
              </Notice>
            </div>
          )}

          <div className="mt-6">
            {authenticated ? (
              <SwapButton swap={swap} inSymbol={inSymbol} outSymbol={outSymbol} quoteOk={quote.ok} />
            ) : (
              <Button className="btn-lg w-full" onClick={login}>
                Sign in to trade
              </Button>
            )}
            <p className="mt-3 flex gap-2 px-1 text-[12.5px] leading-relaxed text-zp-fg-3">
              <Info className="mt-0.5 size-3.5 shrink-0 text-zp-fg-4" aria-hidden="true" />
              <span>
                {authenticated
                  ? "The receipt shows the live formula; the bound you sign comes from the router's on-chain preview. Anything worse reverts, and you need a little ETH on Robinhood Chain for gas."
                  : "Once your wallet is verified, you can be trading within minutes."}
              </span>
            </p>
          </div>
        </section>

        {/* Receipt and market facts */}
        <div className="grid gap-4 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
          <section aria-label="Receipt" className="relative rounded-[26px] bg-zp-paper p-5 text-zp-paper-ink">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zp-paper-ink/60">Receipt preview</p>
            <div className="mt-3">
              <LeaderRow paper label="Chainlink mid" value={<>{fmtMoney(quote.mid)}{unit(QUOTE_SYMBOL)}</>} sub="per whole token, guarded" />
              <LeaderRow
                paper
                label={`Spread · ${fmtBps(quote.halfSpreadBps)}`}
                value={quote.ok ? <>{fmtMoney(quote.spreadAmount)}{unit(QUOTE_SYMBOL)}</> : "n/a"}
                sub={`tier ${tier.label} ${fmtBps(tier.baseHalfSpreadBps)} × ${regime.label.toLowerCase()} ${regimeMul} · skew ${quote.skewBps >= 0 ? "+" : ""}${quote.skewBps} bps`}
              />
              <LeaderRow
                paper
                label={`Protocol fee · ${fmtBps(quote.feeBps)}`}
                value={quote.ok ? <>{fmtMoney(quote.feeAmount)}{unit(QUOTE_SYMBOL)}</> : "n/a"}
                sub="its own line here, its own field in the fill event"
              />
              <div className="my-2 border-t border-dashed border-zp-paper-ink/25" aria-hidden="true" />
              <LeaderRow
                paper
                label={`At least · ${(slippageBps / 100).toFixed(2)}% bound`}
                value={
                  quote.ok ? (
                    <span className="font-medium">
                      {fmtMoney(minOut, "", outDigits)}
                      {unit(outSymbol)}
                    </span>
                  ) : (
                    "n/a"
                  )
                }
                sub="below this, the swap reverts"
              />
            </div>
            <span className="absolute -bottom-2 left-6 right-6 h-4 bg-[radial-gradient(circle,#fbf6ef_6px,transparent_6.5px)] bg-[length:16px_16px] bg-repeat-x" aria-hidden="true" />
          </section>

          <section aria-label="Market facts" className="rounded-[26px] border border-zp-line bg-zp-ink/40 p-5">
            <div className="flex items-center justify-between">
              <p className="lbl">This market</p>
              <Badge tone="muted">Tier {tier.label}</Badge>
            </div>
            <dl className="mt-3 divide-y divide-zp-line text-[13px]">
              {[
                ["Route", buyToken ? `${QUOTE_SYMBOL} → ${market.symbol}` : `${market.symbol} → ${QUOTE_SYMBOL}`],
                ["Venue", "vault, or RFQ if better"],
                ["Half-spread now", fmtBps(sessionHalfSpread)],
                ["Max swap now", `${fmtMoney(quote.clip, "", 0)} ${QUOTE_SYMBOL}`],
                ["Oracle band", fmtBps(tier.oracleBandBps, 0)],
                ["Swap / RFQ fee", `${fmtBps(FEES.swapFeeBps)} / ${fmtBps(FEES.rfqFeeBps)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-zp-fg-3">{k}</dt>
                  <dd className="num text-right text-zp-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12.5px] leading-relaxed text-zp-fg-3">
              Guarded mid, plus the tier half-spread scaled by session, nudged by inventory skew, plus a separate fee. If the total
              would land outside the oracle band, there is no quote at all.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
