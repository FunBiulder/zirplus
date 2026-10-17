/**
 * The platform's market catalogue and vault pricing.
 *
 * The quotes produced here match the AnchorVault formula exactly (fee taken from the quote-token side,
 * a regime-adjusted half-spread around the mid, signed inventory skew, plus clip and band checks), and the
 * session comes from the real US-equity clock, so the ticket acts just as the venue would.
 * Markets come from the Supabase `markets` table (supabase/seed.sql). Mids come from the indexer's price rows
 * when it runs, and otherwise straight from each market's Chainlink feed on Robinhood Chain; vault TVL,
 * inventory and fills come only from the indexer. Nothing here is sample data.
 */

export type Session = "regular" | "extended" | "closed";

export interface TierParams {
  label: string;
  baseHalfSpreadBps: number;
  maxSkewBps: number;
  inventoryBandBps: number;
  oracleBandBps: number;
  /** The biggest single swap allowed in the regular session, as quote-token notional. */
  maxClip: number;
}

export const TIERS: Record<1 | 2 | 3, TierParams> = {
  1: { label: "A", baseHalfSpreadBps: 10, maxSkewBps: 15, inventoryBandBps: 2000, oracleBandBps: 75, maxClip: 50_000 },
  2: { label: "B", baseHalfSpreadBps: 20, maxSkewBps: 25, inventoryBandBps: 2000, oracleBandBps: 150, maxClip: 20_000 },
  3: { label: "C", baseHalfSpreadBps: 40, maxSkewBps: 50, inventoryBandBps: 2000, oracleBandBps: 300, maxClip: 5_000 },
};

export const REGIMES: Record<Session, { label: string; spreadMulBps: number; clipMulBps: number }> = {
  regular: { label: "OPEN", spreadMulBps: 10_000, clipMulBps: 10_000 },
  extended: { label: "EXTENDED", spreadMulBps: 15_000, clipMulBps: 7_500 },
  closed: { label: "CLOSED", spreadMulBps: 30_000, clipMulBps: 5_000 },
};

export const FEES = { swapFeeBps: 2, rfqFeeBps: 2, spreadShareBps: 1000 } as const;

export const QUOTE_SYMBOL = "USDG";

export interface VaultMarket {
  symbol: string;
  name: string;
  tier: 1 | 2 | 3;
  /** Price in USDG for one whole token. */
  mid: number;
  /** The token's share of vault value in bps, where 5000 means on target. */
  inventoryRatioBps: number;
  /** Value of the vault, in USDG. */
  tvl: number;
  volume24h: number;
  /** The Stock Token's contract and decimals, and the market's vault once it is deployed. */
  tokenAddress?: `0x${string}`;
  tokenDecimals?: number;
  vaultAddress?: `0x${string}` | null;
}

/**
 * Works out the US-equity session from the UTC clock (standard time): regular from 14:30 to 21:00,
 * extended from 09:00 to 14:30 and from 21:00 to 01:00, and closed at all other times and across the
 * weekend. On the venue, the session comes from the oracle's market status; this clock merely approximates it locally.
 */
export function currentSession(now: Date = new Date()): Session {
  const day = now.getUTCDay(); // 0 is Sunday through 6 for Saturday
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const inWrappedTail = minutes < 60; // 00:00 to 01:00 counts as part of the prior day's extended session
  if (inWrappedTail) {
    const prev = (day + 6) % 7;
    return prev === 0 || prev === 6 ? "closed" : "extended";
  }
  if (day === 0 || day === 6) return "closed";
  if (minutes >= 870 && minutes < 1260) return "regular"; // 14:30 to 21:00
  if (minutes >= 540 && minutes < 870) return "extended"; // 09:00 to 14:30
  if (minutes >= 1260) return "extended"; // 21:00 to midnight
  return "closed";
}

export interface SwapQuoteResult {
  ok: boolean;
  reason?: string;
  session: Session;
  regimeLabel: string;
  mid: number;
  halfSpreadBps: number;
  skewBps: number;
  feeBps: number;
  /** Amount out, in tokens for a buy and in USDG for a sell. */
  amountOut: number;
  feeAmount: number;
  spreadAmount: number;
  /** Notional in the quote token at mid, which is the unit the clip is measured in. */
  notional: number;
  clip: number;
}

/** Prices a swap exactly as AnchorVault would. `amountIn` is in USDG for a buy and in tokens for a sell. */
export function quoteSwap(
  market: VaultMarket,
  buyToken: boolean,
  amountIn: number,
  session: Session = currentSession()
): SwapQuoteResult {
  const tier = TIERS[market.tier];
  const regime = REGIMES[session];
  const base: SwapQuoteResult = {
    ok: false,
    session,
    regimeLabel: regime.label,
    mid: market.mid,
    halfSpreadBps: 0,
    skewBps: 0,
    feeBps: FEES.swapFeeBps,
    amountOut: 0,
    feeAmount: 0,
    spreadAmount: 0,
    notional: 0,
    clip: (tier.maxClip * regime.clipMulBps) / 10_000,
  };
  if (!Number.isFinite(amountIn) || amountIn <= 0) return { ...base, reason: "Enter an amount" };

  // Skew carries a sign and is positive when the vault is long the token; whichever side rebalances gets the tighter quote.
  let skew = (tier.maxSkewBps * (market.inventoryRatioBps - 5_000)) / tier.inventoryBandBps;
  skew = Math.max(-tier.maxSkewBps, Math.min(tier.maxSkewBps, skew));
  const half = Math.max(0, (tier.baseHalfSpreadBps * regime.spreadMulBps) / 10_000 + (buyToken ? -skew : skew));
  if (half + FEES.swapFeeBps > tier.oracleBandBps) {
    return { ...base, skewBps: Math.round(skew), reason: "Outside the oracle band" };
  }

  let out: SwapQuoteResult;
  if (buyToken) {
    const feeAmount = (amountIn * FEES.swapFeeBps) / 10_000;
    const net = amountIn - feeAmount;
    const ask = market.mid * (1 + half / 10_000);
    const amountOut = net / ask;
    out = {
      ...base,
      ok: true,
      halfSpreadBps: half,
      skewBps: Math.round(skew),
      amountOut,
      feeAmount,
      spreadAmount: net - amountOut * market.mid,
      notional: amountIn,
    };
  } else {
    const midValue = amountIn * market.mid;
    const bid = market.mid * (1 - half / 10_000);
    const gross = amountIn * bid;
    const feeAmount = (gross * FEES.swapFeeBps) / 10_000;
    out = {
      ...base,
      ok: true,
      halfSpreadBps: half,
      skewBps: Math.round(skew),
      amountOut: gross - feeAmount,
      feeAmount,
      spreadAmount: midValue - gross,
      notional: midValue,
    };
  }
  if (out.notional > out.clip) {
    return { ...out, ok: false, reason: `Exceeds the ${REGIMES[session].label} clip of ${out.clip.toLocaleString("en-US")} ${QUOTE_SYMBOL}` };
  }
  return out;
}

export interface VenueFill {
  minutesAgo: number;
  symbol: string;
  side: "buy" | "sell";
  notional: number;
  venue: "vault" | "rfq";
  /** How far the fill sat from the oracle mid, as bps over mid paid by the taker. */
  executionBps: number;
}
