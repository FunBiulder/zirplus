import type { PlatformClient } from "./supabase";
import type {
  Attestation,
  FillRow,
  GovernanceRow,
  LatestPriceRow,
  Profile,
  VaultSnapshotRow,
  VenueMarketRow,
} from "./types";

/**
 * Access comes in two forms:
 *  - Public reads go through the anon Supabase client (`db`) and cover the venue read model kept
 *    up to date by the indexer (markets, prices, snapshots, fills, governance log).
 *  - Authenticated operations are sent to POST /api/platform/db (`api`), where the route checks the
 *    Privy token and executes the operation on a service-role client acting as the verified user.
 */
export type PlatformApi = <T>(op: string, args?: Record<string, unknown>) => Promise<T>;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }, fallback: T): T {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? fallback;
}

// ---------------------------------------------------------------------------
// Venue read model (public)
// ---------------------------------------------------------------------------

export async function getVenueMarkets(db: PlatformClient, chainId: number): Promise<VenueMarketRow[]> {
  return unwrap(
    await db.from("markets").select("*").eq("chain_id", chainId).eq("enabled", true).order("tier").order("symbol"),
    []
  );
}

export async function getLatestPrices(db: PlatformClient): Promise<Record<string, LatestPriceRow>> {
  const rows = unwrap<LatestPriceRow[]>(await db.from("market_latest_prices").select("*"), []);
  return Object.fromEntries(rows.map((r) => [r.market_id, r]));
}

export async function getLatestSnapshots(db: PlatformClient): Promise<Record<string, VaultSnapshotRow>> {
  const rows = unwrap<VaultSnapshotRow[]>(await db.from("vault_latest_snapshots").select("*"), []);
  return Object.fromEntries(rows.map((r) => [r.market_id, r]));
}

export async function getRecentFills(db: PlatformClient, limit = 24): Promise<FillRow[]> {
  return unwrap(await db.from("fills").select("*").order("executed_at", { ascending: false }).limit(limit), []);
}

/** A fill combined with its market's symbol, used by history views scoped to one wallet. */
export type WalletFillRow = FillRow & { markets: Pick<VenueMarketRow, "symbol" | "name"> | null };

export async function getWalletFills(db: PlatformClient, wallet: string, limit = 50): Promise<WalletFillRow[]> {
  return unwrap(
    await db
      .from("fills")
      .select("*, markets(symbol, name)")
      .ilike("trader_address", wallet)
      .order("executed_at", { ascending: false })
      .limit(limit),
    []
  );
}

export async function getGovernanceLog(db: PlatformClient, limit = 12): Promise<GovernanceRow[]> {
  return unwrap(await db.from("governance_log").select("*").order("occurred_at", { ascending: false }).limit(limit), []);
}

// ---------------------------------------------------------------------------
// Profile and eligibility (authenticated)
// ---------------------------------------------------------------------------

export async function getProfile(api: PlatformApi): Promise<Profile | null> {
  return api<Profile | null>("getProfile");
}

export async function upsertProfile(
  api: PlatformApi,
  profile: Partial<Pick<Profile, "wallet_address" | "email" | "display_name">>
): Promise<Profile> {
  return api<Profile>("upsertProfile", profile);
}

export async function getMyAttestations(api: PlatformApi): Promise<Attestation[]> {
  return api<Attestation[]>("getMyAttestations");
}
