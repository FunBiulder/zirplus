import Link from "next/link";
import { Logo } from "@/components/Logo";
import { OrbitLines } from "@/components/art/Orbit";

export function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="frame flex min-h-screen items-center py-6">
      <div className="stage w-full">
        <OrbitLines className="absolute -right-24 -top-10 w-[640px] opacity-60" />
        <div className="inner relative py-14 md:py-20">
          <Logo />
          <p className="eyebrow mt-12">Setup needed</p>
          <h1 className="display pastel-text mt-4 text-[clamp(32px,4.4vw,54px)]">The app is missing its keys</h1>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-zp-fg-2">
            Sign-in comes from Privy and data from Supabase. Add the values below to{" "}
            <code className="font-mono text-[13.5px] text-zp-peach">.env.local</code>, apply{" "}
            <code className="font-mono text-[13.5px] text-zp-peach">supabase/schema.sql</code> and then{" "}
            <code className="font-mono text-[13.5px] text-zp-peach">supabase/seed.sql</code> to your project, and restart
            the dev server.
          </p>

          <ul className="mt-8 flex max-w-xl flex-col gap-2 font-mono text-[13px]">
            {missing.map((m) => (
              <li key={m} className="flex items-center gap-3 rounded-full border border-zp-line-strong px-4 py-2.5 text-zp-fg">
                <span className="size-2 shrink-0 rounded-full bg-zp-warn" aria-hidden="true" />
                <span className="min-w-0 break-all">{m}</span>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-[13.5px] text-zp-fg-3">
            Full setup steps are in <code className="font-mono text-zp-fg-2">supabase/README.md</code>. Or{" "}
            <Link href="/" className="text-zp-peach underline-offset-4 hover:underline">
              return to the homepage
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
