import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { FEES, REGIMES, TIERS, type Session } from "@/lib/platform/markets";
import { DEPLOYMENT } from "@/lib/platform/deployment";
import { platformEnv } from "@/lib/platform/env";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How Zirplus prices, routes and settles tokenized stock swaps on Robinhood Chain: the formula, sessions, halts, liquidity, eligibility, contracts and security model.",
  alternates: { canonical: "/docs" },
};

const EXPLORER = platformEnv.chainExplorer || "https://robinhoodchain.blockscout.com";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "pricing", label: "How a price is built" },
  { id: "sessions", label: "Trading sessions" },
  { id: "routing", label: "Routing" },
  { id: "halts", label: "When a market halts" },
  { id: "liquidity", label: "Providing liquidity" },
  { id: "eligibility", label: "Eligibility" },
  { id: "contracts", label: "Contracts" },
  { id: "governance", label: "Governance & security" },
  { id: "developers", label: "Building on Zirplus" },
] as const;

const SESSION_HOURS: Record<Session, string> = {
  regular: "14:30–21:00 UTC, weekdays",
  extended: "09:00–14:30 and 21:00–01:00 UTC",
  closed: "Overnight and weekends",
};

const fmtMul = (bps: number) => `×${(bps / 10_000).toFixed(bps % 10_000 === 0 ? 0 : bps % 1_000 === 0 ? 1 : 2)}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8 border-t border-zp-line py-[clamp(40px,5vw,64px)] first:border-t-0 first:pt-0">
      <p className="eyebrow">{kicker}</p>
      <h2 id={`${id}-title`} className="display mt-4 text-[clamp(28px,3.4vw,40px)] text-zp-fg">
        {title}
      </h2>
      <div className="mt-6 max-w-[72ch] space-y-5 text-[15.5px] leading-[1.75] text-zp-fg-2">{children}</div>
    </section>
  );
}

function DataTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="not-prose -mx-1 overflow-x-auto rounded-[18px] border border-zp-line">
      <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-zp-line bg-white/[0.03]">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-zp-fg-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-zp-line last:border-b-0">
              {r.map((c, j) => (
                <td key={j} className={j === 0 ? "px-4 py-3 text-zp-fg" : "num px-4 py-3 text-zp-fg-2"}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-[18px] border border-zp-line bg-zp-ink/70 p-5 font-mono text-[13px] leading-relaxed text-zp-fg-2">
      <code>{children}</code>
    </pre>
  );
}

function Addr({ address }: { address: string }) {
  return (
    <a
      href={`${EXPLORER}/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[13px] text-zp-peach underline-offset-4 hover:underline"
      title={address}
    >
      <span className="hidden md:inline">{address}</span>
      <span className="md:hidden">{short(address)}</span>
      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">(opens Blockscout)</span>
    </a>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[13.5px] text-zp-fg">{children}</code>;
}

export default function DocsPage() {
  const tierA = TIERS[1];
  return (
    <>
      <main>
        {/* Header and table of contents */}
        <section className="frame pt-[clamp(10px,2vw,22px)]">
          <div className="stage">
            <div className="inner">
              <header className="flex h-[84px] items-center justify-between gap-6">
                <Logo />
                <nav aria-label="Site" className="flex items-center gap-2">
                  <Link href="/" className="btn btn-sm btn-quiet hidden sm:inline-flex">
                    Home
                  </Link>
                  <Link href={SITE.appHref} className="btn btn-sm">
                    Launch app
                  </Link>
                </nav>
              </header>

              <div className="grid gap-12 pb-[clamp(40px,6vw,80px)] pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
                <div>
                  <p className="eyebrow">Documentation</p>
                  <h1 className="display mt-5 text-[clamp(42px,5.6vw,72px)]">
                    <span className="pastel-text">How Zirplus works</span>
                  </h1>
                  <p className="mt-6 max-w-[48ch] text-[15.5px] leading-[1.75] text-zp-fg-2">
                    Pricing, routing, sessions, halts and the contracts behind them. Everything here is enforced on-chain on Robinhood
                    Chain; if this page and the chain ever disagree, the chain is right.
                  </p>
                </div>
                <nav aria-label="On this page">
                  <ol className="grid gap-2 sm:grid-cols-2">
                    {SECTIONS.map((s, i) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="flex min-h-11 items-center gap-3 rounded-[14px] border border-zp-line px-4 py-2.5 text-[14px] text-zp-fg-2 transition-colors hover:border-zp-line-strong hover:bg-white/[0.04] hover:text-zp-fg"
                        >
                          <span className="num font-mono text-[11px] text-zp-fg-4">{String(i + 1).padStart(2, "0")}</span>
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="frame pt-[clamp(16px,2.4vw,28px)]">
          <div className="stage">
            <div className="inner py-[clamp(48px,7vw,96px)]">
              <Section id="overview" kicker="01 · Overview" title="A swap venue anchored to the oracle">
                <p>
                  Zirplus is a non-custodial venue for swapping tokenized stocks (Robinhood Stock Tokens) for USDG on Robinhood Chain.
                  Every market has an <strong className="font-medium text-zp-fg">anchor vault</strong> that quotes both sides around
                  the guarded Chainlink price. Larger orders can also settle against <strong className="font-medium text-zp-fg">signed
                  RFQ quotes</strong> from market makers. A single router picks whichever venue pays more, in the same transaction.
                </p>
                <ul className="list-disc space-y-2 pl-5 marker:text-zp-fg-4">
                  <li>Prices come from a published formula, not from a pool curve, and every term is emitted on-chain with each fill.</li>
                  <li>No fill from either venue can clear outside the market&apos;s oracle band.</li>
                  <li>Withdrawals from a vault always work: halted, paused or retired.</li>
                  <li>The router, vaults, factory and RFQ contract have no owner, no proxy and no sweep function.</li>
                </ul>
                <p className="text-[14px] text-zp-fg-3">
                  Stock Tokens track a share&apos;s price but are a claim on their issuer, not shares registered to you. Zirplus is pre-audit
                  software; nothing here is investment advice.
                </p>
              </Section>

              <Section id="pricing" kicker="02 · Pricing" title="How a price is built">
                <p>A vault quote is four terms over public state:</p>
                <Code>{`half      = baseHalfSpread(tier) × sessionMultiplier ∓ skew
skew      = maxSkew(tier) × (inventoryRatio − 50%) / inventoryBand   (clamped to ±maxSkew)
ask / bid = mid × (1 ± half)
fee       = ${FEES.swapFeeBps} bps of the USDG side`}</Code>
                <p>
                  The <strong className="font-medium text-zp-fg">mid</strong> is the Chainlink price for the exact token held in the
                  vault. The <strong className="font-medium text-zp-fg">skew</strong> always favours the trade that brings the vault back
                  towards 50/50, so the rebalancing side gets the tighter price. If the half-spread plus the fee would exceed the tier&apos;s
                  oracle band, the vault returns no quote rather than a bad one.
                </p>
                <DataTable
                  head={["Tier", "Half-spread", "Max skew", "Oracle band", "Max trade (regular)"]}
                  rows={([1, 2, 3] as const).map((t) => [
                    TIERS[t].label,
                    `${TIERS[t].baseHalfSpreadBps} bps`,
                    `${TIERS[t].maxSkewBps} bps`,
                    `${TIERS[t].oracleBandBps} bps`,
                    `${TIERS[t].maxClip.toLocaleString("en-US")} USDG`,
                  ])}
                />
                <p>
                  Fees: {FEES.swapFeeBps} bps on vault swaps, {FEES.rfqFeeBps} bps on RFQ fills, and the protocol keeps{" "}
                  {FEES.spreadShareBps / 100}% of the spread. LPs keep the rest.
                </p>
                <p>
                  Worked example, Tier A in the regular session: a buy at a $200.00 mid with a balanced vault pays an ask of{" "}
                  <span className="num">$200.20</span> ({tierA.baseHalfSpreadBps} bps), plus a {FEES.swapFeeBps} bps fee taken from the USDG
                  you send.
                </p>
              </Section>

              <Section id="sessions" kicker="03 · Sessions" title="Spreads follow the stock market">
                <p>
                  Tokens trade around the clock, but the underlying shares do not. Outside regular hours LPs carry the risk of a gap to the
                  next open, so spreads widen and the largest allowed trade shrinks.
                </p>
                <DataTable
                  head={["Session", "Hours (US standard time)", "Spread", "Max trade"]}
                  rows={(Object.keys(REGIMES) as Session[]).map((s) => [
                    REGIMES[s].label.charAt(0) + REGIMES[s].label.slice(1).toLowerCase(),
                    SESSION_HOURS[s],
                    fmtMul(REGIMES[s].spreadMulBps),
                    fmtMul(REGIMES[s].clipMulBps),
                  ])}
                />
                <p className="text-[14px] text-zp-fg-3">
                  Stock Tokens do not publish an on-chain market status yet, so sessions follow this weekday schedule. US market holidays are
                  not modelled; the feed staleness bound and the move cap still protect those days.
                </p>
              </Section>

              <Section id="routing" kicker="04 · Routing" title="One entry point, two venues">
                <ol className="list-decimal space-y-3 pl-5 marker:text-zp-fg-4">
                  <li>
                    You call <Pill>SwapRouter.swapExactIn</Pill> with the pair, an exact input, a minimum output and a deadline. You can
                    attach a signed maker quote.
                  </li>
                  <li>
                    The router checks your <Pill>TRADER</Pill> attestation, recomputes the vault quote in the same transaction, verifies any
                    maker signature, and settles on whichever venue pays more.
                  </li>
                  <li>A token-to-token swap is two atomic legs through USDG. If either leg fails its guards, the whole swap reverts.</li>
                </ol>
                <p>
                  Anything worse than your <Pill>minAmountOut</Pill> reverts, so the price you approve is the worst price you can get.
                </p>
              </Section>

              <Section id="halts" kicker="05 · Halts" title="When a market stops quoting">
                <p>A market stops quoting (previews, vault fills and RFQ alike) when any of these hold:</p>
                <ul className="list-disc space-y-2 pl-5 marker:text-zp-fg-4">
                  <li>
                    <strong className="font-medium text-zp-fg">Stale feed.</strong> The latest Chainlink round is older than the
                    session&apos;s staleness bound (25 hours while open, 4 days while closed, matching the feed&apos;s 24-hour heartbeat).
                  </li>
                  <li>
                    <strong className="font-medium text-zp-fg">Move cap.</strong> A print lands more than 25% from a checkpoint under an
                    hour old. Anyone can call <Pill>OracleRouter.refresh</Pill> to make the pause stick until governance resumes it.
                  </li>
                  <li>
                    <strong className="font-medium text-zp-fg">Corporate action.</strong> The token reports <Pill>oraclePaused()</Pill>.
                  </li>
                  <li>
                    <strong className="font-medium text-zp-fg">Emergency pause.</strong> The guardian has paused swaps; only the owner can
                    unpause.
                  </li>
                </ul>
                <p>Deposits need the guarded mid, so they stop too. Withdrawals never stop.</p>
              </Section>

              <Section id="liquidity" kicker="06 · Liquidity" title="Providing liquidity">
                <p>
                  LPs deposit the Stock Token, USDG or both into a market&apos;s vault and receive vault shares. Income is the spread the vault
                  earns on its fills, less the protocol&apos;s {FEES.spreadShareBps / 100}% share, paid into the value of each share. There are
                  no emissions and no points.
                </p>
                <ul className="list-disc space-y-2 pl-5 marker:text-zp-fg-4">
                  <li>Withdrawals are pro-rata and in kind, need no oracle, and work in every state.</li>
                  <li>A swap never lowers value per share; rounding on mint and burn favours the vault.</li>
                  <li>
                    A fill can never push the vault outside its inventory band (30–70% token share). Past the band, the harmful side turns
                    one-sided while the rebalancing side stays open.
                  </li>
                </ul>
                <p>
                  The real risks are price exposure to the token you hold, weekend gaps (priced in by the closed-session multiplier) and the
                  Stock Token issuer&apos;s own risk.
                </p>
              </Section>

              <Section id="eligibility" kicker="07 · Eligibility" title="Roles and attestations">
                <p>
                  Trading, providing liquidity and making markets each need a role attestation on your wallet: <Pill>TRADER</Pill>,{" "}
                  <Pill>LP</Pill>, <Pill>MAKER</Pill> or <Pill>RELAYER</Pill>. An approved issuer writes it on-chain with only the role, a
                  jurisdiction class, an investor class and an expiry. No personal data goes on-chain.
                </p>
                <p>You never need a role to withdraw from a vault. Your attestations are listed under Account in the app.</p>
              </Section>

              <Section id="contracts" kicker="08 · Contracts" title={`Deployed on Robinhood Chain · ${DEPLOYMENT.deployedAt}`}>
                <p>
                  Chain ID {DEPLOYMENT.chainId}. Every address links to Blockscout. There are no proxies: upgrades arrive as fresh deployments,
                  and LPs choose whether to migrate.
                </p>
                <DataTable
                  head={["Contract", "Address", "Role"]}
                  rows={DEPLOYMENT.contracts.map((c) => [c.name, <Addr key={c.address} address={c.address} />, c.role])}
                />
                <h3 className="pt-4 font-display text-[20px] font-light text-zp-fg">External dependencies</h3>
                <DataTable
                  head={["Contract", "Address", "Notes"]}
                  rows={DEPLOYMENT.dependencies.map((c) => [c.name, <Addr key={c.address} address={c.address} />, c.role])}
                />
              </Section>

              <Section id="governance" kicker="09 · Governance" title="Governance and security">
                <ul className="list-disc space-y-2 pl-5 marker:text-zp-fg-4">
                  <li>
                    Every parameter lives in <Pill>ParamController</Pill> behind a 48-hour timelock: changes are scheduled publicly and can
                    only execute after the delay.
                  </li>
                  <li>The guardian&apos;s only power is pausing swaps. Deposits, withdrawals and RFQ cancellation cannot be paused by anyone.</li>
                  <li>No role can move LP or trader funds, block withdrawals or make a fill clear outside the oracle band.</li>
                </ul>
                <p>
                  <strong className="font-medium text-zp-fg">Status: pre-audit.</strong> No external audit has been completed and no bug
                  bounty is live yet. At launch the deployer key holds the owner, guardian and issuer roles; ownership moves to a multisig as
                  the venue grows. Chainlink has not published an L2 sequencer uptime feed for Robinhood Chain yet, so that guard switches on
                  once it exists.
                </p>
                <p>
                  Found a vulnerability? Report it privately
                  {SITE.contactEmail ? (
                    <>
                      {" "}to{" "}
                      <a href={`mailto:${SITE.contactEmail}`} className="text-zp-peach underline-offset-4 hover:underline">
                        {SITE.contactEmail}
                      </a>
                    </>
                  ) : null}
                  , not in a public issue.
                </p>
              </Section>

              <Section id="developers" kicker="10 · Developers" title="Building on Zirplus">
                <p>
                  The router is a public contract with a stable interface. Traders approve the router; makers approve{" "}
                  <Pill>RfqSettlement</Pill>. Eligibility belongs to your users&apos; wallets, so any front end can route.
                </p>
                <Code>{`// Preview: same arguments as the swap; returns the output and the venue it would settle on
SwapRouter.previewExactIn(SwapParams) returns (uint256 amountOut, Venue venue)

// Swap: reverts if the output would be below minAmountOut or past the deadline
struct SwapParams {
  address tokenIn;        // USDG or a Stock Token
  address tokenOut;
  uint256 amountIn;
  uint256 minAmountOut;
  address to;             // address(0) = msg.sender; any other recipient also needs TRADER
  uint256 deadline;
  MakerQuote quote;       // optional RFQ quote, single-leg swaps only; maker = address(0) for none
  bytes quoteSig;
}
SwapRouter.swapExactIn(SwapParams)`}</Code>
                <ul className="list-disc space-y-2 pl-5 marker:text-zp-fg-4">
                  <li>
                    <Pill>AnchorVault.quoteSwap</Pill> gives the exact vault preview and reverts while a market is halted; the router treats
                    that as &ldquo;no vault quote&rdquo;, so RFQ can keep the market running.
                  </li>
                  <li>
                    The preview throws the same errors the fill would, except the deadline, eligibility and maker signature, which only the
                    swap itself checks.
                  </li>
                  <li>Each fill emits mid, spread, skew and fee, so indexers can rebuild every receipt from events alone.</li>
                </ul>
              </Section>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
