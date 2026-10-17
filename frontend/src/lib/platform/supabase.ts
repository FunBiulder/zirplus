import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { platformEnv } from "./env";

export type PlatformClient = SupabaseClient;

/**
 * A browser client that attaches the Supabase JWT returned by `getToken`. It stays for deployments that
 * issue Supabase JWTs; the platform's own reads go through `createAnonClient`, and its writes go via the API route.
 */
export function createPlatformClient(getToken: () => Promise<string | null>): PlatformClient {
  return createClient(platformEnv.supabaseUrl, platformEnv.supabaseAnonKey, {
    accessToken: getToken,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** An anonymous client used for public reads (explorer, order book) ahead of sign-in. */
export function createAnonClient(): PlatformClient {
  return createClient(platformEnv.supabaseUrl, platformEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
