import { Plus } from "lucide-react";
import { SectionTitle } from "./SectionTitle";
import { SITE } from "@/lib/site";

const QA = [
  {
    q: "Is Zirplus an exchange?",
    a: "It is a swap venue that never takes custody. Anchored vaults and competing makers supply prices, settlement happens atomically on Robinhood Chain, and your assets stay in your wallet until the moment they swap. There is no order book and no account to fund.",
  },
  {
    q: "Why is the spread wider tonight than this afternoon?",
    a: "Because the stock market is closed. Liquidity providers carry the risk of a gap until the next open, so closed-session quotes use a ×3 spread multiplier and a smaller maximum size. The session badge on the ticket always shows the multiplier before you sign.",
  },
  {
    q: "If I buy tokenized Apple, do I own Apple shares?",
    a: "No. You hold a Stock Token, an ERC-20 issued against the share that tracks its price. It is a claim on the issuer, not a share registered in your name. Read the issuer's terms before you trade.",
  },
  {
    q: "Where does LP income come from?",
    a: "From the spread each vault earns on its fills, less the protocol's 10% share, paid into the value of your vault shares. There are no emissions and no points. Because quotes follow the oracle, arbitrage does not drain the vault the way it drains an AMM; the real risks are price exposure to your token, weekend gaps and issuer risk.",
  },
  {
    q: "Who decides the price?",
    a: "A formula over public state: the guarded mid, the tier spread times the session multiplier, the inventory skew and an itemised fee. Nobody at Zirplus can change a quote or a fill, and parameters only move through a timelock.",
  },
  {
    q: "Do I need to be verified?",
    a: "Yes, to trade, provide liquidity or make markets. A KYC provider issues a role attestation to your wallet; only the role, a jurisdiction class and an expiry go on-chain. You never need one to withdraw from a vault.",
  },
  {
    q: "Can I build on Zirplus?",
    a: "Yes. The router is a public contract with a stable interface, and eligibility belongs to your users' wallets rather than to any particular app. The official site gets no special route.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="frame scroll-mt-6 pt-[clamp(64px,10vw,140px)]">
      <div className="stage">
        <div className="inner grid gap-12 py-[clamp(48px,7vw,96px)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <SectionTitle kicker="07 · Questions" title="Straight answers" lead="The short versions. For anything else, read the source or write to us." />
            <div className="mt-8 flex flex-wrap gap-3">
              {SITE.githubUrl && (
                <a href={SITE.githubUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                  Read the source
                </a>
              )}
              {SITE.contactEmail && (
                <a href={`mailto:${SITE.contactEmail}`} className="btn btn-sm btn-quiet">
                  Write to us
                </a>
              )}
            </div>
          </div>
          <div className="divide-y divide-zp-line border-y border-zp-line">
            {QA.map((item, i) => (
              <details key={item.q} className="group" open={i === 0}>
                <summary className="flex list-none items-center justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-[18px] font-normal text-zp-fg">{item.q}</span>
                  <Plus className="size-5 shrink-0 text-zp-peach transition-transform duration-300 group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="pb-6 pr-10 text-[15px] leading-[1.75] text-zp-fg-2">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
