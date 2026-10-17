/**
 * Brand constants. Anything that depends on where you deploy (domain, socials, contact, token)
 * comes from NEXT_PUBLIC_* variables, so a fresh deployment never shows someone else's links.
 * Empty values simply hide the link that would use them.
 */
const env = (v: string | undefined) => (v ?? "").trim();

export const SITE = {
  name: "Zirplus",
  url: env(process.env.NEXT_PUBLIC_SITE_URL) || "http://localhost:3000",
  xHandle: env(process.env.NEXT_PUBLIC_X_HANDLE),
  xUrl: env(process.env.NEXT_PUBLIC_X_URL),
  githubUrl: env(process.env.NEXT_PUBLIC_GITHUB_URL),
  contactEmail: env(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  /** Optional $ZIRPLUS token contract. Shown on the homepage only when set. */
  tokenAddress: env(process.env.NEXT_PUBLIC_ZIRPLUS_TOKEN_ADDRESS),
  appHref: "/platform",
} as const;

/** Sections of the homepage, in reading order. */
export const NAV_LINKS = [
  { label: "Formula", href: "#formula" },
  { label: "Hours", href: "#hours" },
  { label: "Routing", href: "#routing" },
  { label: "Why us", href: "#contrast" },
  { label: "Chain", href: "#chain" },
  { label: "Pledges", href: "#pledges" },
  { label: "FAQ", href: "#faq" },
] as const;

/** The four that fit in the top bar; the footer lists every section. */
export const HEADER_LINKS = NAV_LINKS.filter((l) => ["Formula", "Hours", "Routing", "FAQ"].includes(l.label));
