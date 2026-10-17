import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PrivyClient } from "@privy-io/server-auth";

/** The header the database inspects to find out which user a service-role request acts for (see app_user_id()). */
export const ACTOR_HEADER = "x-zirplus-actor";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

/** Checks the Privy access token on an incoming request and returns the Privy user id. */
export async function verifyPrivyRequest(req: Request): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) throw new ApiError("NEXT_PUBLIC_PRIVY_APP_ID or PRIVY_APP_SECRET is not set on the server.", 500);

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new ApiError("No bearer token supplied", 401);

  try {
    const claims = await new PrivyClient(appId, appSecret).verifyAuthToken(token);
    return claims.userId;
  } catch {
    throw new ApiError("Privy token is invalid or has expired", 401);
  }
}

/**
 * A service-role Supabase client that acts for `actorId`. The actor id is sent as a request header, and
 * `app_user_id()` honours it only when the JWT role is `service_role`; that way the schema's ownership checks
 * and security-definer functions see the genuine user.
 */
export function createServiceClient(actorId: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set on the server.", 500);
  assertServiceRoleKey(key);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { [ACTOR_HEADER]: actorId } },
  });
}

/**
 * Stops early, with a plain message, if the configured key is not a service-role key. Supabase keys come in
 * two forms: legacy JWT keys, whose payload includes `role`, and the newer `sb_secret_...` / `sb_publishable_...`
 * keys. With the anon or publishable key, requests would quietly run under row-level security and all writes would fail.
 */
function assertServiceRoleKey(key: string) {
  if (key.startsWith("sb_secret_")) return;
  if (key.startsWith("sb_publishable_")) {
    throw new ApiError("SUPABASE_SERVICE_ROLE_KEY holds a publishable key. Take the secret (service role) key from Project Settings > API keys instead.", 500);
  }
  if (key.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8")) as { role?: string };
      if (payload.role === "service_role") return;
      throw new ApiError(
        `SUPABASE_SERVICE_ROLE_KEY carries role "${payload.role ?? "unknown"}" rather than service_role. Take the service_role key from Project Settings > API keys instead.`,
        500
      );
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError("SUPABASE_SERVICE_ROLE_KEY is not a usable Supabase key.", 500);
    }
  }
  throw new ApiError("SUPABASE_SERVICE_ROLE_KEY does not appear to be a Supabase service-role key.", 500);
}
