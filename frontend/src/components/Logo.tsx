import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The Zirplus mark ("Ink & Band"): a geometric Z whose two bars are the bid and the ask, joined by a diagonal
 * in the pastel gradient (the oracle band the price is held inside), with a plus set like an exponent.
 * Drawn inline so it stays crisp at any size; `tone="dark"` is the version for light grounds.
 */
export function LogoMark({ size = 34, className, tone = "light" }: { size?: number; className?: string; tone?: "light" | "dark" }) {
  const id = useId().replace(/:/g, "");
  const dark = tone === "dark";
  const stops = dark ? ["#6f9e57", "#c39a2f", "#cf7a47", "#c25a6a"] : ["#c4e2a9", "#f4e2a3", "#f5c39c", "#f2a9b1"];
  const bars = dark ? "#1d1b19" : "#f6f1ea";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`zp-${id}`} x1="12" y1="41" x2="46" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor={stops[0]} />
          <stop offset="0.38" stopColor={stops[1]} />
          <stop offset="0.68" stopColor={stops[2]} />
          <stop offset="1" stopColor={stops[3]} />
        </linearGradient>
      </defs>
      <rect x="12" y="16" width="34" height="7" rx="1.2" fill={bars} />
      <polygon points="37,23 46,23 21,41 12,41" fill={`url(#zp-${id})`} />
      <rect x="12" y="41" width="34" height="7" rx="1.2" fill={bars} />
      <rect x="51.4" y="6" width="3.2" height="12" rx="1.6" fill={`url(#zp-${id})`} />
      <rect x="47" y="10.4" width="12" height="3.2" rx="1.6" fill={`url(#zp-${id})`} />
    </svg>
  );
}

export function Logo({
  size = 34,
  withWordmark = true,
  className,
  href = "/",
  tone = "light",
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
  href?: string;
  /** "dark" sets the wordmark in ink for use on the pastel field. */
  tone?: "light" | "dark";
}) {
  return (
    <Link
      href={href}
      aria-label="Zirplus home"
      className={cn("group inline-flex items-center gap-2.5", tone === "dark" ? "text-zp-paper-ink" : "text-zp-fg", className)}
    >
      <LogoMark size={size} tone={tone} className="shrink-0 transition-transform duration-500 group-hover:scale-105" />
      {withWordmark && <span className="font-display text-[16px] font-light uppercase tracking-[0.34em]">Zirplus</span>}
    </Link>
  );
}
