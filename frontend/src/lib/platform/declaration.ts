/**
 * The self-certified eligibility declaration. The browser shows these statements, the wallet signs the exact
 * message built here, and the server rebuilds the same message from the submitted fields to check the
 * signature, so the two can never drift. Changing a statement changes the version, and old signatures
 * stop verifying.
 *
 * This is self-certification, not identity verification: it records what the user declared, from which
 * network country, and with which wallet signature. Whether that is enough where you operate is a legal
 * question for the operator.
 */
export const DECLARATION_VERSION = "zirplus-declaration-v1";

export const DECLARATION_STATEMENTS = [
  "I am not a US person, and I do not live in the United States.",
  "I am not resident in, or a national of, a sanctioned or otherwise restricted jurisdiction.",
  "Accessing tokenized stocks is lawful where I live, and I am of legal age to enter into this agreement.",
  "I understand Stock Tokens are not shares, and that Zirplus is unaudited software I use at my own risk.",
  "What I declare here is true. Signing writes a TRADER attestation for this wallet, which can be revoked.",
] as const;

/** ISO 3166-1 alpha-2 codes offered in the country picker. */
export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ " +
  "DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GI GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG " +
  "KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR " +
  "NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW " +
  "TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW"
).split(" ");

/** Default policy: the US, plus jurisdictions under comprehensive sanctions. Override with ATTEST_BLOCKED_COUNTRIES. */
export const DEFAULT_BLOCKED_COUNTRIES = ["US", "CU", "IR", "KP", "SY", "RU", "BY"];

export interface DeclarationFields {
  wallet: `0x${string}`;
  country: string;
  issuedAt: string; // ISO-8601, set by the browser, checked for freshness by the server
}

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function buildDeclaration({ wallet, country, issuedAt }: DeclarationFields): string {
  return [
    "Zirplus eligibility declaration",
    "",
    `Wallet: ${wallet.toLowerCase()}`,
    "Chain: Robinhood Chain (4663)",
    `Country of residence: ${countryName(country)} (${country})`,
    `Issued: ${issuedAt}`,
    `Version: ${DECLARATION_VERSION}`,
    "",
    "I confirm that:",
    ...DECLARATION_STATEMENTS.map((s, i) => `${i + 1}. ${s}`),
  ].join("\n");
}
