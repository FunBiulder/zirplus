"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ArrowRight, BadgeCheck, Layers, Percent, ReceiptText, Wallet } from "lucide-react";
import { useSession } from "@/components/platform/PlatformProviders";
import { RequireAuth } from "@/components/platform/PlatformShell";
import { useAsync, useNow } from "@/components/platform/usePlatformData";
import { Badge, EmptyState, PageHead, Segmented, Sheet, Skeleton, StatBand, StatCard, Table, Td, Th } from "@/components/platform/ui";
import { getMyAttestations, getWalletFills } from "@/lib/platform/queries";
import { fmtAgo, fmtBps, fmtCompact, fmtDate, shortAddress } from "@/lib/platform/format";
import { QUOTE_SYMBOL } from "@/lib/platform/markets";
import { platformEnv } from "@/lib/platform/env";
import { cn } from "@/lib/utils";
import { TokenLogo } from "@/components/platform/TokenLogo";

export default function PortfolioPage() {
  return (
    <div className="space-y-10">
      <PageHead
        code="Portfolio"
        title="What this wallet holds"
        description={`Balances, vault shares and trade history are read from ${platformEnv.chainName} and priced with the same guarded oracles the vaults quote from. Nothing here comes from a private ledger.`}
      />
      <RequireAuth title="Sign in to see your portfolio">
        <Portfolio />
      </RequireAuth>
    </div>
  );
}

const ROLES = ["TRADER", "LP", "MAKER", "RELAYER"] as const;

type SideFilter = "all" | "buy" | "sell";
const SIDE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "buy", label: "Buys" },
  { value: "sell", label: "Sells" },
] as const satisfies readonly { value: SideFilter; label: string }[];

function SwapCta({ label = "Make your first swap" }: { label?: string }) {
  return (
    <Link href="/platform/swap" className="btn btn-solid btn-sm">
      {label}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

function Portfolio() {
  const { api, db, userId, walletAddress, email } = useSession();
  const fills = useAsync(() => (walletAddress ? getWalletFills(db, walletAddress) : Promise.resolve([])), [db, walletAddress]);
  const attestations = useAsync(() => getMyAttestations(api), [api, userId]);
  const now = useNow();
  const [side, setSide] = useState<SideFilter>("all");

  const fillRows = useMemo(() => fills.data ?? [], [fills.data]);
  const shown = useMemo(() => (side === "all" ? fillRows : fillRows.filter((f) => f.side === side)), [fillRows, side]);

  const activeRoles = ROLES.map((role) => ({
    role,
    attestation: attestations.data?.find((x) => x.role === role && x.status === "active" && new Date(x.expires_at) > new Date()),
  }));
  const activeCount = activeRoles.filter((r) => r.attestation).length;

  const fillsReady = !(fills.loading && !fills.data);
  const attestationsReady = !(attestations.loading && !attestations.data);
  const totalNotional = fillRows.reduce((s, f) => s + (Number(f.notional) || 0), 0);
  const avgOverMid = fillRows.length > 0 ? fillRows.reduce((s, f) => s + f.half_spread_bps + f.fee_bps, 0) / fillRows.length : null;

  return (
    <div className="space-y-10">
      {/* Wallet card */}
      <section aria-label="Connected wallet" className="relative overflow-hidden rounded-[30px] p-6 text-zp-ink sm:p-8" style={{ background: "var(--pastel)" }}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zp-ink/60">Connected wallet</p>
            <p className="num mt-3 truncate font-display text-[clamp(24px,3vw,34px)] font-light">{shortAddress(walletAddress)}</p>
            <p className="mt-1 truncate text-[13px] text-zp-ink/70">{email ?? "Signed in with a wallet"}</p>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Role attestations">
            {activeRoles.map(({ role, attestation }) => (
              <li
                key={role}
                className={cn(
                  "rounded-full px-3 py-1.5 font-mono text-[11.5px]",
                  attestation ? "bg-zp-ink text-zp-fg" : "border border-zp-ink/25 text-zp-ink/60"
                )}
              >
                {role}
                <span className="sr-only">{attestation ? ", active" : ", not issued"}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 max-w-[80ch] text-[13px] leading-relaxed text-zp-ink/75">
          While the launch is guarded, balance indexing is still being wired to the venue indexer, so the chain itself is your
          record of truth for balances. Trade history and attestations below come from the venue&apos;s public read model.
        </p>
      </section>

      {fillsReady && attestationsReady ? (
        <StatBand>
          <StatCard label="Fills" value={String(fillRows.length)} hint={fillRows.length === 50 ? "latest 50 for this wallet" : "this wallet"} icon={<ReceiptText />} />
          <StatCard label="Notional traded" value={fmtCompact(totalNotional)} hint={`${QUOTE_SYMBOL}, across these fills`} icon={<ArrowLeftRight />} />
          <StatCard label="Avg cost over mid" value={avgOverMid === null ? "n/a" : fmtBps(avgOverMid)} hint="half-spread plus fee" icon={<Percent />} />
          <StatCard
            label="Roles active"
            value={`${activeCount} of ${ROLES.length}`}
            hint={activeCount > 0 ? activeRoles.filter((r) => r.attestation).map((r) => r.role).join(" · ") : "none issued yet"}
            accent={activeCount > 0 ? "lit" : undefined}
            icon={<BadgeCheck />}
          />
        </StatBand>
      ) : (
        <Skeleton rows={2} />
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Sheet label="Holdings" meta="tokens and shares">
          <EmptyState
            icon={<Wallet />}
            title="Nothing indexed yet"
            body="Once the indexer is connected, this wallet's balances appear here automatically. Any swap you settle is on-chain immediately either way."
            action={<SwapCta />}
          />
        </Sheet>
        <Sheet label="Vault shares" meta="value per share and earned spread">
          <EmptyState
            icon={<Layers />}
            title="No vault shares yet"
            body="Fund a vault on the Vaults page to start earning the spread. Shares only move between attested LPs, and you can always withdraw."
            action={
              <Link href="/platform/liquidity" className="btn btn-sm">
                Browse vaults
              </Link>
            }
          />
        </Sheet>
      </div>

      <Sheet
        label="Trade history"
        meta={fillRows.length > 0 ? <Segmented label="Filter fills by side" options={SIDE_OPTIONS} value={side} onChange={setSide} /> : "from the venue read model"}
      >
        {!fillsReady ? (
          <Skeleton rows={5} />
        ) : fillRows.length === 0 ? (
          <EmptyState
            icon={<ReceiptText />}
            title="No fills from this wallet yet"
            body="Every swap you settle will be listed here with its full breakdown of mid, spread, skew and fee, exactly as the fill event records it."
            action={<SwapCta />}
          />
        ) : (
          <>
            <Table minWidth={720}>
              <thead>
                <tr>
                  <Th>Market</Th>
                  <Th>Side</Th>
                  <Th className="text-right">Notional ({QUOTE_SYMBOL})</Th>
                  <Th>Venue</Th>
                  <Th className="text-right">Cost over mid</Th>
                  <Th className="text-right">When</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((f) => {
                  const sym = f.markets?.symbol ?? "?";
                  const name = f.markets?.name;
                  return (
                    <tr key={f.id}>
                      <Td>
                        <span className="flex items-center gap-3">
                          <TokenLogo symbol={sym} size={32} rounded="round" />
                          <span className="min-w-0">
                            <span className="block font-medium text-zp-fg">{sym}</span>
                            {name && <span className="block truncate text-[12.5px] text-zp-fg-4">{name}</span>}
                          </span>
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={f.side === "buy" ? "up" : "down"}>{f.side === "buy" ? "Buy" : "Sell"}</Badge>
                      </Td>
                      <Td className="text-right text-zp-fg">
                        {fmtCompact(f.notional)}
                        <span className="text-zp-fg-4"> {QUOTE_SYMBOL}</span>
                      </Td>
                      <Td>
                        <Badge tone={f.venue === "vault" ? "muted" : "accent"}>{f.venue === "vault" ? "Vault" : "RFQ"}</Badge>
                      </Td>
                      <Td className="text-right text-zp-fg-2">{fmtBps(f.half_spread_bps + f.fee_bps)}</Td>
                      <Td className="whitespace-nowrap text-right font-mono text-[12.5px] text-zp-fg-3">
                        <time dateTime={f.executed_at} title={fmtDate(f.executed_at)}>
                          {fmtAgo(Math.max(0, (now - new Date(f.executed_at).getTime()) / 60_000))}
                        </time>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {shown.length === 0 && <p className="py-6 text-center text-[13.5px] text-zp-fg-3">No {side === "buy" ? "buys" : "sells"} from this wallet yet.</p>}
            <p className="mt-4 text-[12.5px] leading-relaxed text-zp-fg-3">Every fill, itemised exactly as it appears on the public explorer.</p>
          </>
        )}
      </Sheet>

      <section aria-labelledby="roles-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="roles-title" className="font-display text-[26px] font-light text-zp-fg">Role attestations</h2>
            <p className="mt-1 max-w-2xl text-[13.5px] text-zp-fg-3">
              Trading, providing liquidity and making markets each need a role. Withdrawing from a vault never does.
            </p>
          </div>
          <Link href="/platform/settings" className="btn btn-sm">
            Manage in Account
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {!attestationsReady ? (
          <div className="mt-5">
            <Skeleton rows={2} />
          </div>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {activeRoles.map(({ role, attestation: a }) => (
              <li key={role} className="rounded-[22px] border border-zp-line bg-zp-ink/40 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[13px] text-zp-fg">{role}</span>
                  <Badge tone={a ? "up" : "muted"}>{a ? "Active" : "Not issued"}</Badge>
                </div>
                <p className="mt-3 font-mono text-[12px] text-zp-fg-4">{a ? `expires ${fmtDate(a.expires_at)}` : "ask the team to start onboarding"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
