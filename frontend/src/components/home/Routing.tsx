import { ArrowLeftRight, Landmark, LineChart } from "lucide-react";
import { SectionTitle } from "./SectionTitle";
import { FEES, TIERS } from "@/lib/platform/markets";

const ROLES = [
  { icon: ArrowLeftRight, who: "Traders", line: "Swap at any hour at an itemised price. The ticket shows which session you are in before you sign." },
  { icon: Landmark, who: "Liquidity providers", line: "Fund a vault and earn the spread it collects. Withdrawals are in kind and work in every state, even halted or paused." },
  { icon: LineChart, who: "Market makers", line: "Answer block-size requests with signed quotes. Quoting is free; you only fill when you beat the vault." },
];

/** Two overlapping circles: the vault lane and the RFQ lane, with the router where they meet. */
function Venn() {
  return (
    <svg viewBox="0 0 520 320" className="w-full" role="img" aria-label="The router sits where the vault lane and the RFQ lane overlap">
      <defs>
        <radialGradient id="vA" cx="35%" cy="40%" r="70%">
          <stop offset="0" stopColor="#c4e2a9" stopOpacity="0.35" />
          <stop offset="1" stopColor="#c4e2a9" stopOpacity="0.04" />
        </radialGradient>
        <radialGradient id="vB" cx="65%" cy="40%" r="70%">
          <stop offset="0" stopColor="#f2a9b1" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f2a9b1" stopOpacity="0.04" />
        </radialGradient>
      </defs>
      <circle cx="190" cy="160" r="140" fill="url(#vA)" stroke="#c4e2a9" strokeOpacity="0.6" />
      <circle cx="330" cy="160" r="140" fill="url(#vB)" stroke="#f2a9b1" strokeOpacity="0.6" />
      <text x="120" y="150" fill="#f6f1ea" fontSize="20" fontFamily="Prompt, sans-serif" fontWeight="300" textAnchor="middle">Anchor</text>
      <text x="120" y="174" fill="#f6f1ea" fontSize="20" fontFamily="Prompt, sans-serif" fontWeight="300" textAnchor="middle">vaults</text>
      <text x="120" y="198" fill="#a8a299" fontSize="11" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">standard size</text>
      <text x="400" y="150" fill="#f6f1ea" fontSize="20" fontFamily="Prompt, sans-serif" fontWeight="300" textAnchor="middle">RFQ</text>
      <text x="400" y="174" fill="#f6f1ea" fontSize="20" fontFamily="Prompt, sans-serif" fontWeight="300" textAnchor="middle">makers</text>
      <text x="400" y="198" fill="#a8a299" fontSize="11" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">block size</text>
      <rect x="214" y="132" width="92" height="56" rx="28" fill="#161617" stroke="#f4e2a3" strokeOpacity="0.8" />
      <text x="260" y="157" fill="#f4e2a3" fontSize="14" fontFamily="Prompt, sans-serif" textAnchor="middle">Router</text>
      <text x="260" y="175" fill="#a8a299" fontSize="10" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">best wins</text>
    </svg>
  );
}

export function Routing() {
  return (
    <section id="routing" className="frame scroll-mt-6 pt-[clamp(64px,10vw,140px)]">
      <div className="stage">
        <div className="inner py-[clamp(48px,7vw,96px)]">
          <SectionTitle
            kicker="03 · Routing"
            title="Two venues, one door"
            lead="Everyday orders fill instantly against vaults anchored to the oracle. Big orders are put out to professional makers as signed quotes. A single router prices both and settles whichever pays you more."
          />

          <div className="mt-12 grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <Venn />
            <dl className="space-y-6">
              <div className="border-l-2 border-zp-mint/70 pl-5">
                <dt className="font-display text-[19px] text-zp-fg">Vault lane</dt>
                <dd className="mt-1.5 text-[14.5px] leading-relaxed text-zp-fg-2">
                  Two-sided quotes around the guarded mid in every market. Tier, session and inventory set the spread; you can
                  work the price out yourself.
                </dd>
              </div>
              <div className="border-l-2 border-zp-rose/70 pl-5">
                <dt className="font-display text-[19px] text-zp-fg">RFQ lane</dt>
                <dd className="mt-1.5 text-[14.5px] leading-relaxed text-zp-fg-2">
                  Orders big enough to move a curve go to attested makers instead. Their signed quote settles atomically against
                  their own wallet, and only if it beats the vault.
                </dd>
              </div>
              <div className="border-l-2 border-zp-butter/70 pl-5">
                <dt className="font-display text-[19px] text-zp-fg">The router</dt>
                <dd className="mt-1.5 text-[14.5px] leading-relaxed text-zp-fg-2">
                  Checks eligibility and the oracle band, prices both lanes and settles the better one. A stock-to-stock swap runs
                  as two legs through USDG in one transaction; if either leg fails, both revert.
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-px overflow-hidden rounded-[22px] border border-zp-line bg-zp-line text-center">
            {[
              [`${TIERS[1].oracleBandBps} bps`, "the hard band around the mid in Tier A"],
              [`${FEES.swapFeeBps} bps + ${FEES.spreadShareBps / 100}%`, "swap fee, plus the protocol's share of spread"],
              ["0", "assets held by the venue between trades"],
            ].map(([v, k]) => (
              <div key={k} className="bg-zp-stage/90 px-3 py-7">
                <p className="num display pastel-text text-[clamp(22px,3vw,34px)]">{v}</p>
                <p className="mx-auto mt-2 max-w-[22ch] text-[12.5px] leading-snug text-zp-fg-3">{k}</p>
              </div>
            ))}
          </div>

          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {ROLES.map((r) => (
              <li key={r.who} className="flex gap-4">
                <span className="pastel-border grid size-11 shrink-0 place-items-center rounded-full">
                  <r.icon className="size-[18px] text-zp-fg" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-[18px] text-zp-fg">{r.who}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-zp-fg-2">{r.line}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
