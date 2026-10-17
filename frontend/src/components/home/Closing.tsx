import Link from "next/link";
import { Plus } from "lucide-react";
import { OrbitLines, Sparkle, Leaf } from "@/components/art/Orbit";
import { SITE } from "@/lib/site";

export function Closing() {
  return (
    <section className="frame pt-[clamp(64px,10vw,140px)]">
      <div className="stage">
        <OrbitLines className="absolute left-1/2 top-1/2 w-[min(1100px,140%)] -translate-x-1/2 -translate-y-1/2 opacity-25" />
        <Sparkle size={20} color="#f4e2a3" className="float absolute left-[14%] top-[22%]" />
        <Leaf size={24} className="float-2 absolute right-[16%] top-[30%]" />
        <Sparkle size={12} className="float-3 absolute bottom-[24%] right-[26%]" />
        <div className="inner relative flex flex-col items-center py-[clamp(72px,11vw,150px)] text-center">
          <h2 className="display pastel-text text-[clamp(40px,6vw,80px)]">
            The price is the price.
            <br />
            Everything else is a line item.
          </h2>
          <p className="mt-7 max-w-[54ch] text-[16px] leading-[1.75] text-zp-fg-2">
            Verified traders can swap within minutes. LPs earn the spread, makers quote for free, and every fill settles on
            Robinhood Chain.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link href={SITE.appHref} className="btn btn-lg">
              Open the venue
            </Link>
            <Link href={SITE.appHref} className="plus-btn" aria-label="Open the venue">
              <Plus className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
