import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attestation, Profile } from "./types";

/**
 * Database operations that require authentication. The browser reaches them via POST /api/platform/db, and
 * they execute server-side on a service-role client bound to the verified Privy user id.
 *
 * By design, little here is writable: the user's own profile, plus read access to attestations issued to
 * them. Trades happen on-chain, so nothing else needs writing at this layer.
 */

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export type OpArgs = Record<string, unknown>;

export const ops = {
  async getProfile(db: SupabaseClient, actor: string): Promise<Profile | null> {
    const res = await db.from("profiles").select("*").eq("id", actor).maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  },

  async upsertProfile(db: SupabaseClient, actor: string, a: OpArgs): Promise<Profile> {
    const row = {
      id: actor,
      wallet_address: typeof a.wallet_address === "string" ? a.wallet_address : null,
      email: typeof a.email === "string" ? a.email : null,
      display_name: typeof a.display_name === "string" ? a.display_name.slice(0, 80) : null,
    };
    return unwrap(await db.from("profiles").upsert(row, { onConflict: "id" }).select("*").single());
  },

  async getMyAttestations(db: SupabaseClient, actor: string): Promise<Attestation[]> {
    return unwrap(await db.from("attestations").select("*").eq("profile_id", actor).order("issued_at", { ascending: false })) ?? [];
  },
};

export type OpName = keyof typeof ops;
