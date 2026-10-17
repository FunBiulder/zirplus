"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Compass,
  Droplets,
  LogOut,
  Orbit as OrbitIcon,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { OrbitLines } from "@/components/art/Orbit";
import { useSession } from "./PlatformProviders";
import { useNow } from "./usePlatformData";
import { shortAddress } from "@/lib/platform/format";
import { REGIMES, currentSession } from "@/lib/platform/markets";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: NavItem[] = [
  { href: "/platform", label: "Overview", icon: OrbitIcon, exact: true },
  { href: "/platform/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/platform/liquidity", label: "Vaults", icon: Droplets },
  { href: "/platform/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/platform/explorer", label: "Explorer", icon: Compass },
  { href: "/platform/settings", label: "Account", icon: Settings },
];

const SESSION_NAME = { regular: "Open", extended: "Extended", closed: "Closed" } as const;
const SESSION_DOT = { regular: "bg-zp-up", extended: "bg-zp-warn", closed: "bg-zp-rose" } as const;

function utcClock(now: number) {
  const d = new Date(now);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/**
 * The app frame. Unlike a dashboard with a sidebar, Zirplus keeps every page on one floating
 * stage: the mark, a centred pill of destinations and the account sit across the top, and on
 * phones the destinations move into a dock pinned to the bottom of the screen.
 */
export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, authenticated, walletAddress, login, logout, sessionError } = useSession();
  const now = useNow();
  const session = currentSession(new Date(now));
  const regime = REGIMES[session];

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const sessionChip = (
    <div
      className="chip h-9"
      title={`Spreads ×${(regime.spreadMulBps / 10_000).toFixed(1)}, max swap size ×${(regime.clipMulBps / 10_000).toFixed(2)}`}
    >
      <span className={cn("pulse-dot size-2 rounded-full", SESSION_DOT[session])} aria-hidden="true" />
      <span className="text-zp-fg">
        <span className="sr-only">US equity session: </span>
        {SESSION_NAME[session]}
      </span>
      <span className="num hidden text-zp-fg-3 2xl:inline" suppressHydrationWarning>
        ×{(regime.spreadMulBps / 10_000).toFixed(1)} · {utcClock(now)} UTC
      </span>
    </div>
  );

  const account = !ready ? (
    <div className="h-9 w-28 animate-pulse rounded-full bg-white/[0.06]" />
  ) : authenticated ? (
    <div className="flex items-center gap-1.5">
      <span className="chip h-9 gap-2 pl-1.5">
        <span className="size-6 rounded-full" style={{ background: "var(--pastel)" }} aria-hidden="true" />
        <span className="num text-zp-fg">{shortAddress(walletAddress)}</span>
      </span>
      <button
        type="button"
        onClick={() => void logout()}
        aria-label="Sign out"
        title="Sign out"
        className="grid size-9 place-items-center rounded-full border border-zp-line-strong text-zp-fg-3 transition-colors hover:text-zp-fg"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  ) : (
    <button type="button" onClick={login} className="btn btn-sm">
      Sign in
    </button>
  );

  return (
    <div className="frame py-[clamp(10px,2vw,22px)] pb-28 lg:pb-[clamp(10px,2vw,22px)]">
      <div className="stage min-h-[calc(100vh-44px)]">
        <OrbitLines className="absolute -right-40 top-40 w-[760px] opacity-25" />

        <header className="relative z-20 border-b border-zp-line">
          <div className="flex h-[78px] items-center justify-between gap-4 px-[clamp(18px,3vw,40px)]">
            <div className="flex items-center gap-3">
              <Logo size={32} withWordmark={false} className="sm:hidden" />
              <Logo size={32} className="hidden sm:inline-flex" />
              <span className="hidden rounded-full border border-zp-line-strong px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-zp-fg-3 md:inline">
                app
              </span>
            </div>

            <nav aria-label="Platform" className="hidden rounded-full border border-zp-line-strong bg-zp-ink/40 p-1 lg:block">
              <ul className="flex items-center gap-0.5">
                {NAV.map((item) => {
                  const active = isActive(item.href, item.exact);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors",
                          active ? "text-zp-ink" : "text-zp-fg-3 hover:text-zp-fg"
                        )}
                        style={active ? { background: "var(--pastel)" } : undefined}
                      >
                        <item.icon className="size-4" aria-hidden="true" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              {sessionChip}
              {account}
            </div>
          </div>
        </header>

        <main className="inner relative z-10 pb-20 pt-8 lg:pt-12">
          {sessionError && (
            <div role="alert" className="mb-6 rounded-[18px] bg-zp-down/[0.1] px-4 py-3 text-[13.5px] text-zp-down">
              {sessionError}
            </div>
          )}
          {children}
        </main>

        <footer className="inner relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-zp-line py-6 text-[12.5px] text-zp-fg-3">
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-zp-fg">
            Back to the website <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
          <span>Non-custodial · settles on Robinhood Chain</span>
        </footer>
      </div>

      {/* Phone dock */}
      <nav
        aria-label="Platform"
        className="fixed inset-x-3 bottom-3 z-50 rounded-[26px] border border-zp-line-strong bg-zp-ink/90 p-1.5 shadow-[0_20px_40px_-12px_rgb(0_0_0/0.5)] backdrop-blur-md lg:hidden"
      >
        <ul className="grid grid-cols-6">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-[20px] py-2 text-[10.5px] font-medium transition-colors",
                    active ? "text-zp-ink" : "text-zp-fg-3"
                  )}
                  style={active ? { background: "var(--pastel)" } : undefined}
                >
                  <item.icon className="size-[18px]" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Shown in place of account-specific content until the visitor signs in. */
export function RequireAuth({ children, title, body }: { children: React.ReactNode; title?: string; body?: string }) {
  const { ready, authenticated, login } = useSession();
  if (!ready) return <div className="h-48 animate-pulse rounded-[26px] bg-white/[0.04]" />;
  if (!authenticated) {
    return (
      <div className="relative overflow-hidden rounded-[30px] border border-zp-line bg-zp-ink/40">
        <OrbitLines className="absolute -right-10 top-1/2 w-[520px] -translate-y-1/2 opacity-70" />
        <div className="relative flex max-w-xl flex-col items-start gap-4 p-7 md:p-12">
          <span className="eyebrow">Sign in required</span>
          <h2 className="display pastel-text text-[clamp(26px,3vw,36px)]">{title ?? "Sign in to continue"}</h2>
          <p className="text-[14.5px] leading-relaxed text-zp-fg-2">
            {body ??
              "Use your email, a social login or any EVM wallet. No wallet yet? One is created for you on Robinhood Chain, and that address is where your swaps settle."}
          </p>
          <button type="button" onClick={login} className="btn btn-solid mt-2">
            Sign in
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
