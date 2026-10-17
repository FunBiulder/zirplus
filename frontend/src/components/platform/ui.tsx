"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Building blocks for the Zirplus app. Everything lives on the charcoal stage: soft rounded cards,
 * quiet uppercase labels, figures in tabular numerals, and the pastel gradient used as light for
 * the one thing that matters on each surface (the active bar, the selected filter, the key figure).
 */

const PASTELS = ["#c4e2a9", "#f4e2a3", "#f5c39c", "#f2a9b1", "#cbbcf2", "#a9d6d2", "#e7c7a5", "#b8b2aa"];

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}

/** A card with a title row and padded content. A Table placed first bleeds to its edges. */
export function Sheet({
  label,
  meta,
  className,
  children,
}: {
  label: string;
  meta?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      <div className="card-head">
        <h2 className="truncate font-display text-[16px] font-normal text-zp-fg">{label}</h2>
        {meta && <div className="flex shrink-0 items-center gap-2 text-[12.5px] text-zp-fg-3">{meta}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className={cn("font-display text-[18px] text-zp-fg", eyebrow && "mt-2")}>{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-zp-fg-3">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Page opener: a mono kicker, a light pastel title and one line of context, with actions on the
 * right. Titles are short on purpose; the description carries the detail.
 */
export function PageHead({
  code,
  title,
  description,
  action,
}: {
  code: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-rise flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">{code}</p>
        <h1 className="display pastel-text mt-4 text-[clamp(32px,4vw,50px)]">{title}</h1>
        {description && <p className="mt-3 max-w-[64ch] text-[14.5px] leading-relaxed text-zp-fg-2">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/** KPI row: pebble-shaped figures that sit in a single strip. */
export function StatBand({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  accent,
  chart,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  /** "lit" paints the figure in the pastel gradient; "down" marks a loss or fault. */
  accent?: "lit" | "down";
  chart?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-[26px] border border-zp-line bg-zp-ink/45 p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.06] text-zp-fg-2 [&>svg]:size-3.5" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="lbl truncate">{label}</span>
      </div>
      <div
        className={cn(
          "num mt-4 truncate font-display text-[24px] font-light leading-none sm:text-[30px]",
          accent === "lit" ? "pastel-text" : accent === "down" ? "text-zp-down" : "text-zp-fg"
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-2.5 truncate text-[12.5px] text-zp-fg-3">{hint}</div>}
      {chart && <div className="mt-4">{chart}</div>}
    </div>
  );
}

type Tone = "up" | "warn" | "accent" | "down" | "muted";

/** A status pill. */
export function Badge({ tone = "muted", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-[24px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium",
        tone === "up" && "bg-zp-up/[0.14] text-zp-up",
        tone === "warn" && "bg-zp-warn/[0.14] text-zp-warn",
        tone === "accent" && "bg-zp-peach/[0.14] text-zp-peach",
        tone === "down" && "bg-zp-down/[0.14] text-zp-down",
        tone === "muted" && "bg-white/[0.06] text-zp-fg-3"
      )}
    >
      {tone !== "muted" && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Session tones: up when open, warn in extended hours, accent when closed, down when halted. */
export function sessionTone(session: string): Tone {
  if (session === "regular") return "up";
  if (session === "extended") return "warn";
  if (session === "closed") return "accent";
  return "down";
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="lbl mb-2 block">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-[12.5px] leading-relaxed text-zp-fg-3">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const check = props.type === "checkbox" || props.type === "radio";
  return <input {...props} className={cn(check ? "size-4 cursor-pointer accent-zp-peach" : "field", props.className)} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn("relative block", className)}>
      <select {...props} className="field cursor-pointer appearance-none pr-10 [&>option]:bg-zp-card" />
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zp-fg-3" aria-hidden="true" />
    </span>
  );
}

export function Button({
  variant = "solid",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline" | "danger" }) {
  return (
    <button
      {...props}
      className={cn(
        "btn",
        variant === "solid" && "btn-solid",
        variant === "danger" && "border-zp-down/50 text-zp-down hover:bg-zp-down/10",
        className
      )}
    />
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[22px] border border-dashed border-zp-line-strong px-6 py-12 text-center">
      <span className="pastel-border mb-4 grid size-12 place-items-center rounded-full text-zp-fg [&>svg]:size-[18px]" aria-hidden="true">
        {icon ?? <span className="size-2 rounded-full bg-zp-peach" />}
      </span>
      <p className="font-display text-[17px] text-zp-fg">{title}</p>
      {body && <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-zp-fg-3">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex gap-3 rounded-[18px] px-4 py-3.5 text-[13.5px] leading-relaxed",
        tone === "info" && "bg-white/[0.05] text-zp-fg-2",
        tone === "warn" && "bg-zp-warn/[0.09] text-zp-fg-2",
        tone === "error" && "bg-zp-down/[0.1] text-zp-down"
      )}
    >
      <span
        className={cn(
          "mt-[3px] grid size-[18px] shrink-0 place-items-center rounded-full text-[11px] font-semibold text-zp-ink",
          tone === "info" && "bg-zp-mint",
          tone === "warn" && "bg-zp-warn",
          tone === "error" && "bg-zp-down"
        )}
        aria-hidden="true"
      >
        {tone === "info" ? "i" : "!"}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A data table. Placed first inside a Sheet it bleeds to the card edges under the title row. */
export function Table({ children, minWidth = 640 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="scrollbar-none -mx-5 overflow-x-auto first:-mt-5">
      <table
        className={cn(
          "num w-full border-collapse text-left text-[13.5px]",
          "[&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-white/[0.03]",
          "[&_tbody_tr:last-child>td]:border-b-0",
          "[&_th:first-child]:pl-5 [&_td:first-child]:pl-5",
          "[&_th:last-child]:pr-5 [&_td:last-child]:pr-5"
        )}
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn("h-11 whitespace-nowrap border-b border-zp-line pr-4 text-[11.5px] font-medium uppercase tracking-[0.08em] text-zp-fg-3", className)}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("h-[56px] border-b border-zp-line pr-4 align-middle text-zp-fg-2", className)}>{children}</td>;
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="relative h-9 overflow-hidden rounded-full bg-white/[0.05]" style={{ opacity: 1 - i * (0.5 / Math.max(rows, 1)) }}>
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        </div>
      ))}
    </div>
  );
}

/** A label and a figure joined by a dotted leader, like a line on a receipt. */
export function LeaderRow({
  label,
  value,
  sub,
  paper = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: string;
  /** Set on light paper surfaces such as the swap receipt. */
  paper?: boolean;
}) {
  return (
    <div className="py-2 text-[13.5px]">
      <div className="flex items-baseline">
        <span className={cn("shrink-0", paper ? "text-zp-paper-ink/70" : "text-zp-fg-3")}>{label}</span>
        <span className={cn("leader", paper && "border-zp-paper-ink/25")} aria-hidden="true" />
        <span className={cn("num shrink-0 text-right", paper ? "text-zp-paper-ink" : "text-zp-fg")}>{value}</span>
      </div>
      {sub && <div className={cn("mt-1 text-[12px]", paper ? "text-zp-paper-ink/55" : "text-zp-fg-4")}>{sub}</div>}
    </div>
  );
}

export function ExplorerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-zp-peach underline-offset-4 transition-colors hover:text-zp-fg hover:underline">
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Controls and charts
// ---------------------------------------------------------------------------

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("seg", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)} className="seg-item">
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A circular gauge, 0 to 1, with an optional target tick. Used for vault inventory. */
export function Ring({
  value,
  target,
  size = 96,
  warn = false,
  children,
}: {
  value: number;
  target?: number;
  size?: number;
  warn?: boolean;
  children?: React.ReactNode;
}) {
  const v = Math.max(0, Math.min(1, value));
  const r = 42;
  const c = 2 * Math.PI * r;
  const t = target === undefined ? null : ((Math.max(0, Math.min(1, target)) * 360 - 90) * Math.PI) / 180;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c4e2a9" />
            <stop offset="0.5" stopColor="#f4e2a3" />
            <stop offset="1" stopColor="#f5c39c" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={warn ? "#f3c77f" : "url(#ring-grad)"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${v * c} ${c}`}
        />
      </svg>
      {t !== null && (
        <span
          className="absolute h-3 w-[2px] rounded-full bg-zp-fg"
          style={{
            left: `${50 + 42 * Math.cos(t)}%`,
            top: `${50 + 42 * Math.sin(t)}%`,
            transform: `translate(-50%, -50%) rotate(${(target ?? 0) * 360}deg)`,
          }}
          aria-hidden="true"
        />
      )}
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** A horizontal meter, 0 to 1, with an optional target marker. */
export function Meter({
  value,
  target,
  tone = "lit",
  className,
}: {
  value: number;
  target?: number;
  tone?: "lit" | "up" | "warn" | "down";
  className?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("relative h-2 w-full rounded-full bg-white/[0.07]", className)} aria-hidden="true">
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full",
          tone === "up" && "bg-zp-up",
          tone === "warn" && "bg-zp-warn",
          tone === "down" && "bg-zp-down"
        )}
        style={{ width: `${v * 100}%`, background: tone === "lit" ? "var(--pastel)" : undefined }}
      />
      {target !== undefined && <span className="absolute -top-1 h-4 w-px bg-zp-fg-2" style={{ left: `${Math.max(0, Math.min(1, target)) * 100}%` }} />}
    </div>
  );
}

/** A ranked list where each row carries a proportional pastel bar. */
export function BarList({
  items,
  className,
}: {
  items: readonly { key: string; label: React.ReactNode; value: number; display: React.ReactNode; sub?: React.ReactNode }[];
  className?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 0);
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, i) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-4 text-[13.5px]">
            <span className="flex min-w-0 items-center gap-2 truncate text-zp-fg">
              {item.label}
              {item.sub && <span className="truncate text-[12.5px] text-zp-fg-4">{item.sub}</span>}
            </span>
            <span className="num shrink-0 text-zp-fg-2">{item.display}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
            <span
              className="block h-full rounded-full"
              style={{ width: max > 0 ? `${Math.max(2, (item.value / max) * 100)}%` : "0%", background: PASTELS[i % PASTELS.length] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Rounded column chart. Hovering or focusing a column shows its label and value in the readout;
 * the highlighted column (by default the last) wears the pastel gradient.
 */
export function BarChart({
  data,
  height = 160,
  format = (v) => String(v),
  highlight,
  axisLabels,
  emptyLabel = "No data yet",
  className,
}: {
  data: readonly { label: string; value: number }[];
  height?: number;
  format?: (v: number) => string;
  highlight?: number;
  axisLabels?: [string, string, string];
  emptyLabel?: string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  const lit = highlight ?? data.length - 1;
  const active = hover ?? lit;
  const n = Math.max(data.length, 1);
  const gap = n > 40 ? 2 : 5;

  if (max === 0) {
    return (
      <div className={cn("flex items-center justify-center rounded-[18px] border border-dashed border-zp-line text-[13px] text-zp-fg-4", className)} style={{ height }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-3 text-[12.5px]" aria-live="polite">
        <span className="text-zp-fg-3">{data[active]?.label}</span>
        <span className="num font-display text-[16px] text-zp-fg">{format(data[active]?.value ?? 0)}</span>
      </div>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end" style={{ gap }} onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(3, (d.value / max) * 100) : 0;
            const on = i === active;
            return (
              <button
                key={`${d.label}-${i}`}
                type="button"
                aria-label={`${d.label}: ${format(d.value)}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="group relative flex h-full min-w-0 flex-1 cursor-default items-end outline-none"
              >
                <span className="absolute inset-x-0 bottom-0 top-0 rounded-full bg-white/[0.035]" aria-hidden="true" />
                <span
                  className={cn("relative w-full rounded-full transition-opacity duration-150", on ? "opacity-100" : "opacity-45 group-hover:opacity-75")}
                  style={{ height: `${h}%`, background: on ? "var(--pastel)" : "#d2ccc3" }}
                />
              </button>
            );
          })}
        </div>
      </div>
      {axisLabels && (
        <div className="mt-2 flex justify-between text-[11.5px] text-zp-fg-4">
          {axisLabels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** A segmented bar showing how a total splits across parts, with a legend. */
export function SplitBar({
  parts,
  format = (v) => String(v),
  className,
}: {
  parts: readonly { key: string; label: string; value: number }[];
  format?: (v: number) => string;
  className?: string;
}) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  return (
    <div className={className}>
      <div className="flex h-4 w-full gap-1" aria-hidden="true">
        {total > 0 &&
          parts.map((p, i) =>
            p.value > 0 ? (
              <span key={p.key} className="h-full rounded-full" style={{ width: `${(p.value / total) * 100}%`, background: PASTELS[i % PASTELS.length] }} />
            ) : null
          )}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
        {parts.map((p, i) => (
          <li key={p.key} className="flex min-w-0 items-center gap-2 text-[12.5px]">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: PASTELS[i % PASTELS.length] }} aria-hidden="true" />
            <span className="truncate text-zp-fg-2">{p.label}</span>
            <span className="num ml-auto shrink-0 text-zp-fg-3">{total > 0 ? `${((p.value / total) * 100).toFixed(0)}%` : format(0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
