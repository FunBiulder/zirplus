/**
 * The live Zirplus deployment on Robinhood Chain mainnet (chain ID 4663), deployed 2026-10-15.
 * Mirrors contracts/deployments/4663.json; update both together if the protocol is ever redeployed.
 */
export const DEPLOYMENT = {
  chainId: 4663,
  deployedAt: "2026-10-15",
  contracts: [
    { name: "SwapRouter", address: "0xE5cfF6b8E51651838C74b73a4cA49202F1ed0594", role: "The only entry point for traders: eligibility, venue choice, two-leg swaps" },
    { name: "AnchorVault · NVDA", address: "0x049A177583309763350e46B3CB2eAd7508c08D9d", role: "Launch vault: oracle-anchored quotes, LP shares, in-kind withdrawal" },
    { name: "VaultFactory", address: "0x762C2B13fD2c5784dBeD06Dc57A521f482BAAC0F", role: "Deploys vaults and is the registry the router reads" },
    { name: "RfqSettlement", address: "0x1c9329D6B66f610bD38ad284A435DC59B76a25d4", role: "Settles signed EIP-712 maker quotes inside the oracle band" },
    { name: "OracleRouter", address: "0xb9460491694e13Afffdc13Dd578147f3323241d2", role: "Chainlink feeds behind session, staleness and move-cap guards (owner-configured, not timelocked)" },
    { name: "ParamController", address: "0xf7D02fd1Bc8C40fd20aed40FCeD073e408144701", role: "Protocol parameters, behind a 48-hour timelock" },
    { name: "EligibilityRegistry", address: "0x5a65e561D94dD61c1A6C20F9A3F149559DEF7214", role: "Role checks for traders, LPs, makers and relayers" },
    { name: "NativeAttestationAdapter", address: "0xdA43608E348EE415857A036333ACE7e7ae25e003", role: "Issuer-signed role attestations, no personal data" },
    { name: "FeeCollector", address: "0xFa35360d6f200BFDD768fD2AA3610568c5EbB13d", role: "Receives swap fees, RFQ fees and the protocol's spread share" },
  ],
  dependencies: [
    { name: "USDG", address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", role: "Quote asset for every market (6 decimals)" },
    { name: "NVDA Stock Token", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", role: "Launch listing (18 decimals, ERC-8056 multiplier)" },
    { name: "Chainlink NVDA / USD", address: "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15", role: "Price feed: 8 decimals, 24h heartbeat, 0.5% deviation" },
  ],
} as const;
