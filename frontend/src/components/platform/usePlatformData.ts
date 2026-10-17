"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useSession } from "./PlatformProviders";
import { friendlyError } from "@/lib/platform/format";
import { platformEnv } from "@/lib/platform/env";
import {
  getGovernanceLog,
  getLatestPrices,
  getLatestSnapshots,
  getRecentFills,
  getVenueMarkets,
} from "@/lib/platform/queries";
import { type VaultMarket, type VenueFill } from "@/lib/platform/markets";
import { robinhoodChain } from "@/lib/platform/chain";
import { createPublicClient, http, type PublicClient } from "viem";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** A lightweight async loader driven by an explicit list of dependencies. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fn());
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

// One shared ticking clock, surfaced via useSyncExternalStore, lets components read "now" while rendering
// without calling Date.now() in render. A single interval feeds all subscribers, the session badge included.
const clock = {
  value: Date.now(),
  listeners: new Set<() => void>(),
  timer: null as ReturnType<typeof setInterval> | null,
  subscribe(cb: () => void) {
    clock.listeners.add(cb);
    if (!clock.timer) {
      clock.timer = setInterval(() => {
        clock.value = Date.now();
        clock.listeners.forEach((l) => l());
      }, 30_000);
    }
    return () => {
      clock.listeners.delete(cb);
      if (clock.listeners.size === 0 && clock.timer) {
        clearInterval(clock.timer);
        clock.timer = null;
      }
    };
  },
  get: () => clock.value,
};

/** Wall-clock time in milliseconds, updated every 30 seconds. */
export function useNow(): number {
  return useSyncExternalStore(clock.subscribe, clock.get, clock.get);
}

// ---------------------------------------------------------------------------
// Venue data: markets from Supabase, mids from the indexer or straight from Chainlink
// ---------------------------------------------------------------------------

export interface GovernanceEntry {
  date: string;
  action: string;
  detail: string;
}

export interface VenueData {
  markets: VaultMarket[];
  fills: VenueFill[];
  governance: GovernanceEntry[];
  /**
   * "supabase" once the indexer writes prices; "chain" while mids are read directly from each market's
   * Chainlink feed and vault TVL, inventory and fills are not indexed yet.
   */
  source: "supabase" | "chain";
}

const AGGREGATOR_ABI = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
] as const;

let chainClient: PublicClient | null = null;
function getChainClient(): PublicClient {
  chainClient ??= createPublicClient({ chain: robinhoodChain, transport: http(platformEnv.chainRpc || undefined) });
  return chainClient;
}

/** Reads each feed's latest answer as a USDG price per whole token (USDG is treated as USD). Unreadable feeds are left out. */
async function readChainlinkMids(feeds: Record<string, `0x${string}`>): Promise<Record<string, number>> {
  const client = getChainClient();
  const entries = await Promise.all(
    Object.entries(feeds).map(async ([marketId, feed]) => {
      try {
        const [round, decimals] = await Promise.all([
          client.readContract({ address: feed, abi: AGGREGATOR_ABI, functionName: "latestRoundData" }),
          client.readContract({ address: feed, abi: AGGREGATOR_ABI, functionName: "decimals" }),
        ]);
        const answer = round[1];
        if (answer <= BigInt(0)) return null;
        return [marketId, Number(answer) / 10 ** decimals] as const;
      } catch {
        return null;
      }
    })
  );
  return Object.fromEntries(entries.filter((e): e is readonly [string, number] => e !== null));
}

/**
 * Fetches the venue: the market list from Supabase, then mids from the indexer's price rows, falling back to
 * the markets' Chainlink feeds when the indexer has not written any. A market with neither is left out.
 * Errors surface through `error` rather than being papered over with sample data.
 */
export function useVenue(): AsyncState<VenueData> {
  const { db } = useSession();
  return useAsync<VenueData>(async () => {
    const [rows, prices, snapshots, fills, governance] = await Promise.all([
      getVenueMarkets(db, platformEnv.chainId),
      getLatestPrices(db),
      getLatestSnapshots(db),
      getRecentFills(db),
      getGovernanceLog(db),
    ]);
    if (rows.length === 0) throw new Error("No markets are listed yet. Run supabase/schema.sql and then supabase/seed.sql.");

    const unpriced = Object.fromEntries(
      rows.filter((m) => !prices[m.id] && m.feed_address).map((m) => [m.id, m.feed_address as `0x${string}`])
    );
    const chainMids = Object.keys(unpriced).length > 0 ? await readChainlinkMids(unpriced) : {};

    const markets: VaultMarket[] = rows.flatMap((m) => {
      const mid = prices[m.id] ? Number(prices[m.id].price) : chainMids[m.id];
      if (!mid) return []; // no price from either source
      const snap = snapshots[m.id];
      const tier = m.tier === 1 || m.tier === 2 || m.tier === 3 ? m.tier : 3;
      return [
        {
          symbol: m.symbol,
          name: m.name,
          tier,
          mid,
          inventoryRatioBps: snap?.inventory_ratio_bps ?? 5_000,
          tvl: Number(snap?.tvl ?? 0),
          volume24h: Number(snap?.volume_24h ?? 0),
          tokenAddress: m.token_address as `0x${string}`,
          tokenDecimals: m.token_decimals,
          vaultAddress: (m.vault_address as `0x${string}` | null) ?? null,
        } satisfies VaultMarket,
      ];
    });

    const marketNames = Object.fromEntries(rows.map((m) => [m.id, m.symbol]));
    const now = Date.now();
    const mappedFills: VenueFill[] = fills.map((f) => ({
      minutesAgo: Math.max(0, (now - new Date(f.executed_at).getTime()) / 60_000),
      symbol: marketNames[f.market_id] ?? "?",
      side: f.side,
      notional: Number(f.notional),
      venue: f.venue,
      executionBps: f.half_spread_bps + f.fee_bps,
    }));

    const mappedGovernance: GovernanceEntry[] = governance.map((g) => ({
      date: new Date(g.occurred_at).toISOString().slice(0, 10),
      action: g.action,
      detail: g.detail,
    }));

    const indexed = Object.keys(prices).length > 0;
    return { markets, fills: mappedFills, governance: mappedGovernance, source: indexed ? "supabase" : "chain" };
  }, [db]);
}
