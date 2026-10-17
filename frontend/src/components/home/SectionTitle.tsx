import { cn } from "@/lib/utils";

/** Section opener: a small numbered kicker, a light display title and an optional lead. */
export function SectionTitle({
  kicker,
  title,
  lead,
  tone = "light",
  align = "left",
  className,
}: {
  kicker: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** "light" for text on a charcoal stage, "dark" for text on the pastel field. */
  tone?: "light" | "dark";
  align?: "left" | "center";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("max-w-[760px]", align === "center" && "mx-auto text-center", className)}>
      <p
        className={cn(
          "inline-flex items-center gap-2.5 font-mono text-[11.5px] uppercase tracking-[0.18em]",
          dark ? "text-zp-paper-ink/70" : "text-zp-fg-3"
        )}
      >
        <span className={cn("size-1.5 rounded-full", dark ? "bg-zp-paper-ink/60" : "bg-zp-peach")} aria-hidden="true" />
        {kicker}
      </p>
      <h2 className={cn("display mt-5 text-[clamp(34px,4.6vw,58px)]", dark ? "text-zp-paper-ink" : "pastel-text")}>{title}</h2>
      {lead && (
        <p className={cn("mt-5 text-[16px] leading-[1.75]", dark ? "text-zp-paper-ink/75" : "text-zp-fg-2", align === "center" && "mx-auto max-w-[60ch]")}>
          {lead}
        </p>
      )}
    </div>
  );
}
