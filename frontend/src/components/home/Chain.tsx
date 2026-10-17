import { SectionTitle } from "./SectionTitle";
import { OrbitLines, Planet, Sparkle } from "@/components/art/Orbit";

const FACTS = [
  ["Network", "Robinhood Chain, built on Arbitrum Nitro and fully EVM-equivalent"],
  ["Assets", "Stock Tokens issued as ordinary ERC-20s"],
  ["Prices", "Chainlink feeds that also report market status"],
  ["Settlement", "USDG, native to the chain"],
  ["Receipts", "Every fill visible on Blockscout"],
  ["Mainnet chain ID", "4663"],
] as const;

const REASONS = [
  { title: "No allowlist in the way", body: "Stock Tokens are plain ERC-20s, so nothing stands between an eligible wallet and a swap." },
  { title: "The clock comes with the price", body: "The session flag that drives our regimes arrives from the same oracle that prices the fill." },
  { title: "Cheap enough for small trades", body: "Low fees make a $50 swap sensible and let quotes refresh constantly." },
];

export function Chain() {
  return (
    <section id="chain" className="frame scroll-mt-6 pt-[clamp(64px,10vw,140px)]">
      <div className="stage">
        <OrbitLines className="absolute -left-40 bottom-0 w-[620px] opacity-40" />
        <div className="inner relative grid gap-12 py-[clamp(48px,7vw,96px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <SectionTitle
              kicker="05 · The chain"
              title="Built where the shares already live"
              lead="Robinhood Chain is where Stock Tokens are issued, priced and held. Building the venue there removes bridges, wrappers and guesswork from the path between you and the asset."
            />
            <div className="mt-10 flex items-center gap-5">
              <Planet size={86} className="float" />
              <Sparkle size={18} color="#f4e2a3" className="float-2" />
            </div>
          </div>

          <div>
            <dl className="divide-y divide-zp-line rounded-[22px] border border-zp-line bg-zp-ink/40">
              {FACTS.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 px-5 py-4 sm:grid-cols-[170px_minmax(0,1fr)]">
                  <dt className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-zp-fg-3">{k}</dt>
                  <dd className="text-[14.5px] text-zp-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-8 space-y-5">
              {REASONS.map((r) => (
                <li key={r.title}>
                  <h3 className="font-display text-[18px] text-zp-fg">{r.title}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-zp-fg-2">{r.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
