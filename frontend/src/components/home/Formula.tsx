import { Cpu, RotateCcw, Scale } from "lucide-react";
import { SectionTitle } from "./SectionTitle";
import { Sparkle } from "@/components/art/Orbit";

const MID = 176.4;
const PRICE = (MID * 1.001) / (1 - 0.0002); // 10 bps half-spread on the mid, 2 bps fee taken on the USDG side
const BAND = 75;
const OVER = ((PRICE - MID) / MID) * 10_000;

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const TERMS = [
  { op: "", name: "Mid", figure: "176.40", unit: "USDG", tint: "#c4e2a9", note: "The Chainlink price, checked for staleness, wild jumps and corporate actions. If any check fails the market stops quoting instead of guessing." },
  { op: "+", name: "Spread", figure: "10 bps", unit: "× 1.0", tint: "#f4e2a3", note: "Each tier has a base half-spread (Tier A is 10 bps). The session multiplies it: ×1.0 while US markets are open, ×1.5 in extended hours, ×3.0 when closed." },
  { op: "±", name: "Skew", figure: "0 bps", unit: "up to ±15", tint: "#f5c39c", note: "When a vault drifts from its 50/50 inventory, the side that brings it back gets a slightly better price. Rebalancing pays for itself." },
  { op: "+", name: "Fee", figure: "2 bps", unit: "own line", tint: "#f2a9b1", note: "Shown on its own line on the ticket and recorded in its own field of the fill event. Never folded into the price curve." },
];

const CHECKS = [
  { icon: Cpu, title: "Recomputed on-chain", body: "Inside your transaction the router rebuilds the vault quote from oracle and vault state. A front end cannot route you to anything worse than the formula." },
  { icon: Scale, title: "Makers must beat it", body: "A signed quote from an attested market maker only settles if it pays you more than the vault would. Otherwise the vault fills you." },
  { icon: RotateCcw, title: "Worse means revert", body: "You sign a minimum output and a deadline. If the price moves past either before your transaction lands, it reverts instead of filling." },
];

/** A half-circle dial from -75 to +75 bps with a needle at the worked example. */
function BandDial() {
  const angle = (OVER / BAND) * 90; // -90..90 degrees from vertical
  const r = 120;
  const arc = (from: number, to: number) => {
    const a = (d: number) => ((d - 90) * Math.PI) / 180;
    const x1 = 150 + r * Math.cos(a(from));
    const y1 = 150 + r * Math.sin(a(from));
    const x2 = 150 + r * Math.cos(a(to));
    const y2 = 150 + r * Math.sin(a(to));
    return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  return (
    <svg viewBox="0 0 300 175" className="w-full max-w-[360px]" role="img" aria-label={`The example price sits ${OVER.toFixed(1)} bps above the mid, inside a band of ${BAND} bps either side`}>
      <defs>
        <linearGradient id="dial" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c4e2a9" />
          <stop offset="0.5" stopColor="#f4e2a3" />
          <stop offset="1" stopColor="#f2a9b1" />
        </linearGradient>
      </defs>
      <path d={arc(-90, 90)} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="18" strokeLinecap="round" />
      <path d={arc(-90, 90)} fill="none" stroke="url(#dial)" strokeWidth="3" strokeLinecap="round" />
      {[-90, -45, 0, 45, 90].map((t) => {
        const a = ((t - 90) * Math.PI) / 180;
        return <line key={t} x1={150 + 100 * Math.cos(a)} y1={150 + 100 * Math.sin(a)} x2={150 + 108 * Math.cos(a)} y2={150 + 108 * Math.sin(a)} stroke="#8f8a82" strokeWidth="1.5" />;
      })}
      <g transform={`rotate(${angle} 150 150)`}>
        <line x1="150" y1="150" x2="150" y2="44" stroke="#f6f1ea" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx="150" cy="150" r="7" fill="#f6f1ea" />
      <text x="24" y="172" fill="#a8a299" fontSize="11" fontFamily="IBM Plex Mono, monospace">-{BAND}</text>
      <text x="141" y="22" fill="#a8a299" fontSize="11" fontFamily="IBM Plex Mono, monospace">mid</text>
      <text x="252" y="172" fill="#a8a299" fontSize="11" fontFamily="IBM Plex Mono, monospace">+{BAND}</text>
    </svg>
  );
}

export function Formula() {
  return (
    <section id="formula" className="frame scroll-mt-6 pt-[clamp(48px,8vw,110px)]">
      <div className="inner">
        <SectionTitle
          tone="dark"
          kicker="01 · The formula"
          title="One equation. Nothing hidden behind it."
          lead="Every Zirplus quote is the same arithmetic run on public state. Take any fill on the explorer and you can rebuild its price from on-chain inputs."
        />

        {/* the four terms as beads on an orbit line */}
        <div className="relative mt-14">
          <svg className="absolute inset-x-0 top-[54px] hidden h-10 w-full lg:block" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M60 20 C 300 -10, 700 50, 940 20" fill="none" stroke="#2a2724" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="4 6" />
          </svg>
          <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {TERMS.map((t) => (
              <li key={t.name} className="flex flex-col items-center text-center">
                <div className="relative">
                  {t.op && (
                    <span className="absolute -left-9 top-1/2 hidden -translate-y-1/2 font-display text-[26px] font-light text-zp-paper-ink/60 lg:block" aria-hidden="true">
                      {t.op}
                    </span>
                  )}
                  <span
                    className="grid size-[128px] place-items-center rounded-full shadow-[inset_0_-10px_24px_rgb(0_0_0/0.12),0_18px_40px_-20px_rgb(60_30_20/0.5)]"
                    style={{ background: `radial-gradient(circle at 35% 30%, #fffaf3 0%, ${t.tint} 70%)` }}
                  >
                    <span>
                      <span className="block font-display text-[26px] font-light text-zp-paper-ink">{t.figure}</span>
                      <span className="block font-mono text-[10.5px] uppercase tracking-[0.12em] text-zp-paper-ink/70">{t.unit}</span>
                    </span>
                  </span>
                </div>
                <h3 className="mt-5 font-display text-[20px] font-normal text-zp-paper-ink">
                  {t.op && <span className="mr-1.5 text-zp-paper-ink/50 lg:hidden">{t.op}</span>}
                  {t.name}
                </h3>
                <p className="mt-2 max-w-[30ch] text-[14px] leading-relaxed text-zp-paper-ink/75">{t.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* the result, on its own stage */}
      <div className="stage stage-flat mt-16">
        <div className="inner grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:py-16">
          <div>
            <p className="eyebrow">= your price, NVDAx example</p>
            <p className="mt-5 flex items-baseline gap-3">
              <span className="num display pastel-text text-[clamp(48px,7vw,84px)]">{fmt(PRICE)}</span>
              <span className="font-mono text-[13px] text-zp-fg-3">USDG</span>
            </p>
            <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-zp-fg-2">
              That is {OVER.toFixed(1)} bps over the mid, all costs included. And there is a hard wall: whatever
              the parameters say, no fill from a vault or a maker can settle more than {BAND} bps from the mid in Tier A.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <BandDial />
          </div>
        </div>
      </div>

      <div className="inner mt-10">
        <ul className="grid gap-4 md:grid-cols-3">
          {CHECKS.map((c) => (
            <li key={c.title} className="paper relative p-7">
              <Sparkle size={14} color="#f5c39c" className="absolute right-6 top-6" />
              <c.icon className="size-5 text-zp-paper-ink" aria-hidden="true" />
              <h3 className="mt-5 font-display text-[21px] font-normal text-zp-paper-ink">{c.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-zp-paper-ink/75">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
