import type { Metadata } from "next";
import { PlatformProviders } from "@/components/platform/PlatformProviders";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { SetupNotice } from "@/components/platform/SetupNotice";
import { missingPlatformEnv } from "@/lib/platform/env";

export const metadata: Metadata = {
  title: "App",
  description: "Swap tokenized stocks for USDG at oracle-anchored prices on Robinhood Chain, or fund a vault and earn the spread.",
  robots: { index: false, follow: false },
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const missing = missingPlatformEnv();
  if (missing.length > 0) return <SetupNotice missing={missing} />;
  return (
    <PlatformProviders>
      <PlatformShell>{children}</PlatformShell>
    </PlatformProviders>
  );
}
