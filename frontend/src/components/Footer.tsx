import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NAV_LINKS, SITE } from "@/lib/site";

export function Footer() {
  const elsewhere = [
    SITE.xUrl && { label: SITE.xHandle ? `X · ${SITE.xHandle}` : "X", href: SITE.xUrl },
    SITE.githubUrl && { label: "GitHub", href: SITE.githubUrl },
    SITE.contactEmail && { label: "Email", href: `mailto:${SITE.contactEmail}` },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <footer className="frame pb-10 pt-[clamp(56px,8vw,100px)]">
      <div className="inner text-zp-paper-ink">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Logo tone="dark" />
            <p className="mt-5 max-w-[40ch] text-[14.5px] leading-relaxed text-zp-paper-ink/75">
              A non-custodial swap venue for tokenized stocks on Robinhood Chain. Oracle-anchored prices, itemised fees,
              atomic settlement in USDG.
            </p>
          </div>
          <nav aria-label="Homepage sections">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zp-paper-ink/60">Homepage</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[14.5px]">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={`/${l.href}`} className="hover:underline">{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zp-paper-ink/60">Go</p>
            <ul className="mt-4 space-y-2 text-[14.5px]">
              <li><Link href={SITE.appHref} className="hover:underline">Launch the app</Link></li>
              <li><Link href="/platform/explorer" className="hover:underline">Public explorer</Link></li>
              <li><Link href="/docs" className="hover:underline">Documentation</Link></li>
              {elsewhere.map((e) => (
                <li key={e.href}>
                  <a href={e.href} target="_blank" rel="noopener noreferrer" className="hover:underline">{e.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-zp-paper-ink/15 pt-6 text-[12.5px] text-zp-paper-ink/65">
          <span>&copy; {new Date().getFullYear()} Zirplus</span>
          <span>Stock Tokens are not shares. Trading involves risk.</span>
        </div>
      </div>
    </footer>
  );
}
