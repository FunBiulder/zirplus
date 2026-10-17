import Link from "next/link";
import { Plus } from "lucide-react";
import { SiteNav } from "./SiteNav";
import { LiveSession } from "./LiveSession";
import { Orbit } from "@/components/art/Orbit";
import { GitHubIcon, MailIcon, XIcon } from "@/components/icons";
import { SITE } from "@/lib/site";

/**
 * The opening stage, composed like the reference poster: nav across the top, a two-line pastel
 * headline on the left with one outlined call to action, the orbit illustration on the right,
 * today's session stacked at the far right, socials centred along the base and a ringed plus
 * that drops you into the formula.
 */
export function Hero() {
  const socials = [
    SITE.xUrl && { href: SITE.xUrl, label: `Zirplus on X${SITE.xHandle ? ` (${SITE.xHandle})` : ""}`, icon: <XIcon className="size-[15px]" /> },
    SITE.githubUrl && { href: SITE.githubUrl, label: "Zirplus on GitHub", icon: <GitHubIcon className="size-[15px]" /> },
    SITE.contactEmail && { href: `mailto:${SITE.contactEmail}`, label: "Email Zirplus", icon: <MailIcon className="size-[16px]" /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  return (
    <section className="frame pt-[clamp(10px,2vw,22px)]">
      <div className="stage">
        <div className="inner">
          <SiteNav />

          <div className="grid items-center gap-10 pb-10 pt-6 lg:min-h-[540px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_auto] lg:gap-6 lg:pb-8">
            <div className="animate-rise">
              <h1 className="display text-[clamp(46px,6.4vw,84px)]">
                <span className="pastel-text">Real stocks,</span>
                <br />
                <span className="pastel-text">fair swaps.</span>
              </h1>
              <p className="mt-7 max-w-[46ch] text-[15.5px] leading-[1.75] text-zp-fg-2">
                Swap tokenized shares for USDG on Robinhood Chain at the guarded Chainlink price, not
                at whatever a thin pool happens to say. The spread and the fee each get their own line,
                and every fill lands on-chain where anyone can read it.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href={SITE.appHref} className="btn">
                  Open the venue
                </Link>
                <a href="#formula" className="text-[13px] tracking-[0.06em] text-zp-fg-3 underline-offset-[6px] hover:text-zp-fg hover:underline">
                  How a price is built
                </a>
              </div>
              {SITE.tokenAddress && (
                <p className="mt-8 inline-flex max-w-full items-center gap-2 rounded-full border border-zp-line-strong px-3.5 py-1.5 font-mono text-[11.5px] text-zp-fg-2">
                  <span className="text-zp-peach">$ZIRPLUS</span>
                  <span className="truncate">{SITE.tokenAddress}</span>
                </p>
              )}
            </div>

            <div className="relative mx-auto w-full max-w-[560px]">
              <Orbit />
            </div>

            <div className="lg:self-center">
              <LiveSession />
            </div>
          </div>

          <div className="relative flex items-center justify-between pb-10">
            <ul className="flex items-center gap-5 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
              {socials.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="text-zp-fg-2 transition-colors hover:text-zp-fg">
                    {s.icon}
                  </a>
                </li>
              ))}
            </ul>
            <a href="#formula" className="plus-btn ml-auto" aria-label="Scroll to the pricing formula">
              <Plus className="size-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
