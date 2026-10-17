import { SectionTitle } from "./SectionTitle";

const ROWS = [
  { topic: "Where the price comes from", pool: "Whatever is sitting in the pool's reserves", zirplus: "The guarded Chainlink mid, held inside a hard band" },
  { topic: "A Saturday trade", pool: "Priced as if it were Tuesday afternoon", zirplus: "Wider spread and smaller size, shown before you sign" },
  { topic: "Liquidity providers", pool: "Picked off by arbitrage every time the stock moves", zirplus: "Earn the spread, and skew pays others to rebalance them" },
  { topic: "Stock splits and corporate actions", pool: "The pool breaks or has to migrate", zirplus: "The market pauses, then resumes on the adjusted feed" },
  { topic: "A large order", pool: "Walks down the curve and pays for it", zirplus: "Goes to competing makers as signed quotes" },
  { topic: "Fees", pool: "Blended into the curve", zirplus: "Listed on the ticket and logged in the fill event" },
];

/** Each comparison is a torn ticket stub: the generic-pool half on paper, the Zirplus half on charcoal. */
export function Contrast() {
  return (
    <section id="contrast" className="frame scroll-mt-6 pt-[clamp(64px,10vw,140px)]">
      <div className="inner">
        <SectionTitle
          tone="dark"
          kicker="04 · Why not a normal pool"
          title="Shares are not memecoins. Stop pricing them like one."
          lead="Constant-product pools are great for crypto pairs. For an asset whose real price is set on an exchange, they drift, overcharge and leave LPs exposed. Here is the difference, line by line."
        />

        <ul className="mt-12 space-y-3">
          {ROWS.map((r) => (
            <li key={r.topic} className="grid overflow-hidden rounded-[20px] shadow-[0_14px_30px_-22px_rgb(60_30_20/0.6)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="bg-zp-paper/90 px-6 py-5">
                <p className="font-display text-[17px] text-zp-paper-ink">{r.topic}</p>
              </div>
              <div className="relative bg-zp-paper/60 px-6 py-5 md:border-l md:border-dashed md:border-zp-paper-ink/20">
                <p className="text-[11px] uppercase tracking-[0.14em] text-zp-paper-ink/55">Generic pool</p>
                <p className="mt-1 text-[14.5px] text-zp-paper-ink/80">{r.pool}</p>
              </div>
              <div className="relative bg-zp-stage px-6 py-5">
                <span className="absolute -left-2 top-1/2 hidden size-4 -translate-y-1/2 rounded-full bg-[#f1d5c6] md:block" aria-hidden="true" />
                <p className="pastel-text text-[11px] uppercase tracking-[0.14em]">Zirplus</p>
                <p className="mt-1 text-[14.5px] text-zp-fg">{r.zirplus}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 max-w-[70ch] text-[14.5px] leading-relaxed text-zp-paper-ink/70">
          We see the two as neighbours, not rivals. Arbitrageurs who pull generic pools towards the anchored price bring
          useful flow, and skew pricing pays them for rebalancing our vaults along the way.
        </p>
      </div>
    </section>
  );
}
