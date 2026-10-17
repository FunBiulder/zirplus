import type { Metadata, Viewport } from "next";
import "@fontsource/prompt/200.css";
import "@fontsource/prompt/300.css";
import "@fontsource/prompt/400.css";
import "@fontsource/prompt/500.css";
import "@fontsource-variable/outfit";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { SITE } from "@/lib/site";

const TITLE = "Zirplus | Tokenized stock swaps at the real price";
const DESCRIPTION =
  "Zirplus is a non-custodial swap venue on Robinhood Chain. Trade Stock Tokens for USDG at prices anchored to the guarded Chainlink mid, with the spread and fee written out on every ticket and every fill settled on-chain.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: TITLE, template: "%s | Zirplus" },
  description: DESCRIPTION,
  applicationName: "Zirplus",
  keywords: ["Zirplus", "Robinhood Chain", "tokenized stocks", "Stock Tokens", "RWA swap", "USDG", "DeFi"],
  authors: [{ name: "Zirplus" }],
  creator: "Zirplus",
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: SITE.url, siteName: "Zirplus", title: TITLE, description: DESCRIPTION, locale: "en_US" },
  twitter: {
    card: "summary_large_image",
    ...(SITE.xHandle ? { site: SITE.xHandle, creator: SITE.xHandle } : {}),
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f1d5c6",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="relative min-h-screen antialiased">
        <div className="field-bg" aria-hidden="true" />
        {children}
        <div className="noise" aria-hidden="true" />
      </body>
    </html>
  );
}
