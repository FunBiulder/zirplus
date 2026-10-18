# Zirplus

Zirplus is a non-custodial venue for swapping tokenized stocks on Robinhood Chain, settled in USDG.

Every market has an **anchor vault** that quotes both sides around the guarded Chainlink price. Larger orders can also settle against **signed RFQ quotes** from professional makers. A single **router** picks whichever venue pays the trader more, in the same transaction, and no fill from either venue can clear outside the market's oracle band.

## What makes it different

- **Priced from the oracle, not from a pool curve.** The price is the Chainlink mid, plus a published half-spread, plus a small inventory skew, plus a 2 bps fee. Every term is emitted on-chain with each fill.
- **The trading regime follows the stock market.** Spreads widen ×1.5 in extended hours and ×3 when the market is closed, and the largest allowed trade shrinks with them.
- **LP funds can always leave.** Withdrawals are pro-rata and in kind, need no oracle, and work while a market is halted, paused or retired.
- **No proxies, no sweep functions.** `SwapRouter`, `AnchorVault` and `RfqSettlement` have no owner, no proxy and no sweep function; `VaultFactory`'s owner can only open markets. Protocol parameters change through a 48h timelock, but oracle settings are not timelocked yet, so LP funds still rely on the owner key (see [Security](architecture/security.md)).

## Read next

- [Protocol overview](protocol/overview.md): pricing, routing, regimes and halts
- [Deployments](protocol/deployments.md): addresses, and how to deploy and verify
- [Security](architecture/security.md): the trust model, testing, audits and disclosure

The contracts live in [`contracts/`](../../contracts/README.md) and the app in [`frontend/`](../README.md).

> Zirplus is pre-audit software. Nothing in these docs is investment advice, and access to Stock Tokens depends on your jurisdiction and eligibility.
