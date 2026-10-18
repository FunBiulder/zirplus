import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createPublicClient, createWalletClient, http, isAddress, keccak256, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ApiError, createServiceClient, verifyPrivyRequest } from "@/lib/platform/server";
import { robinhoodChain } from "@/lib/platform/chain";
import { DEPLOYMENT } from "@/lib/platform/deployment";
import { COUNTRY_CODES, DECLARATION_VERSION, DEFAULT_BLOCKED_COUNTRIES, buildDeclaration } from "@/lib/platform/declaration";

export const runtime = "nodejs";

/**
 * Self-certified TRADER attestation. The signed-in user signs the declaration in lib/platform/declaration.ts
 * with their wallet; this route checks the Privy session, the signature, that the wallet is linked to that
 * Privy user, the declared and network countries against policy, then writes the attestation on-chain from
 * the dedicated issuer key (ATTESTER_PRIVATE_KEY, never the deployer key) and records the declaration.
 */

const MAX_AGE_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 10 * 60 * 1000;
const TRADER_ROLE = keccak256(toHex("zirplus.role.TRADER"));
const addr = (name: string) => DEPLOYMENT.contracts.find((c) => c.name === name)!.address as `0x${string}`;
const ATTESTATIONS = addr("NativeAttestationAdapter");
const REGISTRY = addr("EligibilityRegistry");
const PARAMS = addr("ParamController");

const ABI = [
  {
    type: "function",
    name: "attest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "role", type: "bytes32" },
      { name: "jurisdictionClass", type: "bytes2" },
      { name: "investorClass", type: "uint8" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  { type: "function", name: "isEligible", stateMutability: "view", inputs: [{ name: "a", type: "address" }, { name: "r", type: "bytes32" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "attestationIssuer", stateMutability: "view", inputs: [{ name: "i", type: "address" }], outputs: [{ type: "bool" }] },
] as const;

const list = (v: string | undefined) => (v ?? "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);

function policy() {
  const blocked = list(process.env.ATTEST_BLOCKED_COUNTRIES);
  return {
    blocked: new Set(blocked.length ? blocked : DEFAULT_BLOCKED_COUNTRIES),
    allowed: new Set(list(process.env.ATTEST_ALLOWED_COUNTRIES)), // empty = every country not blocked
    ttlDays: Number(process.env.ATTEST_TTL_DAYS ?? 180),
  };
}

function networkCountry(req: Request): string | null {
  const c = req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry");
  return c && /^[A-Z]{2}$/i.test(c) ? c.toUpperCase() : null;
}

export async function POST(req: Request) {
  try {
    const actor = await verifyPrivyRequest(req);
    const body = (await req.json().catch(() => null)) as { wallet?: string; country?: string; issuedAt?: string; signature?: string } | null;
    const wallet = body?.wallet;
    const country = body?.country?.toUpperCase();
    const issuedAt = body?.issuedAt;
    const signature = body?.signature as Hex | undefined;
    if (!wallet || !isAddress(wallet) || !country || !COUNTRY_CODES.includes(country) || !issuedAt || !signature) {
      throw new ApiError("The declaration is incomplete.", 400);
    }

    // Freshness: a signature is only good for a few minutes.
    const age = Date.now() - Date.parse(issuedAt);
    if (!Number.isFinite(age) || age < -60_000 || age > MAX_AGE_MS) throw new ApiError("This declaration has expired. Please sign it again.", 400);

    // Country policy, on both what the user declared and where the request came from.
    const { blocked, allowed, ttlDays } = policy();
    const fromNetwork = networkCountry(req);
    const refused = (c: string | null) => c !== null && (blocked.has(c) || (allowed.size > 0 && !allowed.has(c)));
    if (refused(country) || refused(fromNetwork)) {
      throw new ApiError("Zirplus trading isn't available in your region.", 403);
    }

    // The wallet really signed this exact declaration (EOA or smart-wallet signatures alike).
    const reader = createPublicClient({ chain: robinhoodChain, transport: http(process.env.NEXT_PUBLIC_CHAIN_RPC || undefined) });
    const message = buildDeclaration({ wallet, country, issuedAt });
    const valid = await reader.verifyMessage({ address: wallet, message, signature });
    if (!valid) throw new ApiError("The signature doesn't match this wallet.", 400);

    // ...and that wallet belongs to the signed-in Privy user.
    const privy = new PrivyClient(process.env.NEXT_PUBLIC_PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);
    const owner = await privy.getUserByWalletAddress(wallet).catch(() => null);
    if (!owner || owner.id !== actor) throw new ApiError("That wallet isn't linked to your account.", 403);

    const db = createServiceClient(actor);

    // Already attested: nothing to send.
    if (await reader.readContract({ address: REGISTRY, abi: ABI, functionName: "isEligible", args: [wallet, TRADER_ROLE] })) {
      return NextResponse.json({ data: { status: "already-eligible" } });
    }

    // One attestation per wallet per cooldown window, so a double click cannot pay gas twice.
    const recent = await db
      .from("eligibility_declarations")
      .select("attest_tx, created_at")
      .ilike("wallet_address", wallet)
      .not("attest_tx", "is", null)
      .gte("created_at", new Date(Date.now() - COOLDOWN_MS).toISOString())
      .limit(1);
    if (recent.data?.length) return NextResponse.json({ data: { status: "pending", txHash: recent.data[0].attest_tx } });

    const key = process.env.ATTESTER_PRIVATE_KEY as Hex | undefined;
    if (!key) throw new ApiError("Self-verification isn't switched on yet. Please try again later.", 503);
    const issuer = privateKeyToAccount(key);
    if (!(await reader.readContract({ address: PARAMS, abi: ABI, functionName: "attestationIssuer", args: [issuer.address] }))) {
      throw new ApiError("Self-verification isn't switched on yet. Please try again later.", 503);
    }

    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
    const signer = createWalletClient({ account: issuer, chain: robinhoodChain, transport: http(process.env.NEXT_PUBLIC_CHAIN_RPC || undefined) });
    const jurisdiction = toHex(country, { size: 2 });
    const { request } = await reader.simulateContract({
      account: issuer,
      address: ATTESTATIONS,
      abi: ABI,
      functionName: "attest",
      // Investor class 1 marks a self-certified retail declaration, distinct from issuer-reviewed classes.
      args: [wallet, TRADER_ROLE, jurisdiction, 1, BigInt(Math.floor(expiresAt.getTime() / 1000))],
    });
    const txHash = await signer.writeContract(request);

    const profile = await db.from("profiles").select("id").eq("id", actor).maybeSingle();
    await db.from("eligibility_declarations").insert({
      profile_id: profile.data ? actor : null,
      wallet_address: wallet.toLowerCase(),
      declared_country: country,
      network_country: fromNetwork,
      version: DECLARATION_VERSION,
      message,
      signature,
      attest_tx: txHash,
      expires_at: expiresAt.toISOString(),
      user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    });

    const receipt = await reader.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") throw new ApiError("The attestation transaction failed. Please try again.", 502);

    await db.from("attestations").insert({
      profile_id: profile.data ? actor : null,
      wallet_address: wallet.toLowerCase(),
      role: "TRADER",
      jurisdiction_class: country,
      investor_class: 1,
      issuer: issuer.address.toLowerCase(),
      onchain_uid: txHash,
      status: "active",
      expires_at: expiresAt.toISOString(),
    });

    return NextResponse.json({ data: { status: "attested", txHash, expiresAt: expiresAt.toISOString() } });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    const message = e instanceof ApiError ? e.message : "Verification failed. Please try again.";
    if (!(e instanceof ApiError)) console.error("attest route:", e);
    return NextResponse.json({ error: message }, { status });
  }
}
