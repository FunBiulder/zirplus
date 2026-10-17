"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { HEADER_LINKS, NAV_LINKS, SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * The bar that sits inside the hero stage, as in the reference: round mark on the left, spaced
 * capitals in the middle, an outlined button on the right. On small screens the links fold into a
 * sheet that drops from the top of the stage.
 */
export function SiteNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="relative z-30">
      <div className="flex h-[84px] items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Sections" className="hidden items-center gap-10 lg:flex">
          {HEADER_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[12.5px] font-medium uppercase tracking-[0.16em] text-zp-fg-2 transition-colors hover:text-zp-fg">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/docs" className="btn btn-sm btn-quiet hidden sm:inline-flex">
            Docs
          </Link>
          <Link href={SITE.appHref} className="btn btn-sm hidden sm:inline-flex">
            Launch app
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-grid size-10 place-items-center rounded-full border border-zp-line-strong text-zp-fg lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "absolute inset-x-0 top-[84px] origin-top rounded-[22px] border border-zp-line-strong bg-zp-ink/95 p-3 backdrop-blur transition-all duration-300 lg:hidden",
          open ? "scale-y-100 opacity-100" : "pointer-events-none scale-y-95 opacity-0"
        )}
      >
        <ul className="grid grid-cols-2 gap-1">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className="block rounded-[14px] px-4 py-3 text-[14px] uppercase tracking-[0.12em] text-zp-fg-2 hover:bg-white/5 hover:text-zp-fg">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <Link href="/docs" className="btn btn-quiet mt-3 w-full" onClick={() => setOpen(false)}>
          Docs
        </Link>
        <Link href={SITE.appHref} className="btn btn-solid mt-2 w-full" onClick={() => setOpen(false)}>
          Launch app
        </Link>
      </div>
    </header>
  );
}
