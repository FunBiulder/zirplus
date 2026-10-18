"use client";

import { useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ShieldCheck } from "lucide-react";
import { createWalletClient, custom } from "viem";
import { useSession } from "./PlatformProviders";
import { Button, Notice, Select } from "./ui";
import { robinhoodChain } from "@/lib/platform/chain";
import { platformEnv } from "@/lib/platform/env";
import { COUNTRY_CODES, DECLARATION_STATEMENTS, DEFAULT_BLOCKED_COUNTRIES, buildDeclaration, countryName } from "@/lib/platform/declaration";
import { describeSwapError } from "./useOnchainSwap";

/**
 * Self-certification: the trader picks their country, ticks each statement, and signs the declaration with
 * their wallet. The server checks it and writes a TRADER attestation for the wallet.
 */
export function SelfCertify({ onVerified }: { onVerified: () => void }) {
  const { walletAddress } = useSession();
  const { getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [country, setCountry] = useState("");
  const [ticked, setTicked] = useState<boolean[]>(() => DECLARATION_STATEMENTS.map(() => false));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const countries = useMemo(
    () =>
      COUNTRY_CODES.filter((c) => !DEFAULT_BLOCKED_COUNTRIES.includes(c))
        .map((c) => ({ code: c, name: countryName(c) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const ready = Boolean(country) && ticked.every(Boolean) && Boolean(walletAddress);

  async function submit() {
    if (!walletAddress) return;
    setBusy(true);
    setError(null);
    try {
      const wallet = wallets.find((w) => w.address.toLowerCase() === walletAddress.toLowerCase()) ?? wallets[0];
      if (!wallet) throw new Error("No wallet is connected.");
      const issuedAt = new Date().toISOString();
      const message = buildDeclaration({ wallet: wallet.address as `0x${string}`, country, issuedAt });
      const signer = createWalletClient({
        account: wallet.address as `0x${string}`,
        chain: robinhoodChain,
        transport: custom(await wallet.getEthereumProvider()),
      });
      const signature = await signer.signMessage({ account: wallet.address as `0x${string}`, message });

      const token = await getAccessToken();
      if (!token) throw new Error("Please sign in again.");
      const res = await fetch("/api/platform/attest", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: wallet.address, country, issuedAt, signature }),
      });
      const body = (await res.json().catch(() => ({}))) as { data?: { status: string; txHash?: string }; error?: string };
      if (!res.ok) throw new Error(body.error ?? `Verification failed (${res.status})`);
      setTxHash(body.data?.txHash ?? null);
      onVerified();
    } catch (e) {
      setError(describeSwapError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="verify-title" className="mt-6 rounded-[22px] border border-zp-line-strong bg-zp-ink/40 p-5">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-5 text-zp-mint" aria-hidden="true" />
        <h3 id="verify-title" className="font-display text-[19px] font-light text-zp-fg">
          Verify your wallet to trade on Zirplus
        </h3>
      </div>
      <p className="mt-2 text-[13.5px] leading-relaxed text-zp-fg-3">
        Zirplus vaults trade only with attested wallets. Confirm where you live and sign the declaration; nothing is sent to the
        chain except your wallet&apos;s TRADER role, a two-letter country code and an expiry. Signing is free.
      </p>

      <div className="mt-4">
        <label htmlFor="verify-country" className="lbl mb-2 block">
          Country of residence
        </label>
        <Select id="verify-country" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">Choose your country</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="mt-4 space-y-2.5">
        <legend className="lbl mb-2">I confirm that</legend>
        {DECLARATION_STATEMENTS.map((s, i) => (
          <label key={s} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[14px] px-2 py-1.5 text-[13.5px] leading-relaxed text-zp-fg-2 hover:bg-white/[0.03]">
            <input
              type="checkbox"
              checked={ticked[i]}
              onChange={(e) => setTicked((t) => t.map((v, j) => (j === i ? e.target.checked : v)))}
              className="mt-1 size-4 shrink-0 accent-[#f5c39c]"
            />
            <span>{s}</span>
          </label>
        ))}
      </fieldset>

      {error && (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {txHash && (
        <div className="mt-4">
          <Notice tone="info">
            Verified. Your attestation is on-chain:{" "}
            <a
              href={`${platformEnv.chainExplorer || "https://robinhoodchain.blockscout.com"}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              view it on Blockscout
            </a>
            .
          </Notice>
        </div>
      )}

      <Button className="mt-5 w-full" disabled={!ready || busy} onClick={() => void submit()}>
        {busy ? "Check your wallet…" : "Sign & verify"}
      </Button>
    </section>
  );
}
