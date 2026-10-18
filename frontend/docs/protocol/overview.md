# Protocol overview

## Contracts

| Contract | Role |
| --- | --- |
| `SwapRouter` | The only entry point for traders. It checks eligibility, compares vault and RFQ, and composes token-to-token swaps out of two legs. |
| `AnchorVault` | One per market. Quotes around the oracle, skews by inventory, mints LP shares and handles in-kind withdrawal. |
| `VaultFactory` | Deploys vaults and is the registry the router reads them from. |
| `RfqSettlement` | Settles EIP-712 maker quotes atomically, checked against the oracle band. Makers cancel by nonce. |
| `OracleRouter` | Chainlink feeds behind session, staleness, move-cap, corporate-action and sequencer guards. |
| `EligibilityRegistry` and `NativeAttestationAdapter` | Role checks (`TRADER`, `LP`, `MAKER`, `RELAYER`) against issuer-signed attestations. |
| `ParamController` | Protocol parameters, behind a timelock. The guardian can only pause swaps. Oracle settings live in `OracleRouter` and are not timelocked. |
| `FeeCollector` | Receives swap fees, RFQ fees and the protocol's share of spread. |

## Price formula

For a vault fill:

```
half      = baseHalfSpread(tier) × sessionMultiplier ∓ skew
skew      = maxSkew(tier) × (inventoryRatio − 50%) / inventoryBand,  clamped to ±maxSkew
ask / bid = mid × (1 ± half)
fee       = 2 bps of the USDG side
```

The skew always favours the trade that brings the vault back towards 50/50. If `half + fee` would exceed the tier's oracle band, the vault returns no quote.

| Tier | Half-spread | Max skew | Oracle band | Max clip (regular) |
| --- | --- | --- | --- | --- |
| A | 10 bps | 15 bps | 75 bps | 50,000 USDG |
| B | 20 bps | 25 bps | 150 bps | 20,000 USDG |
| C | 40 bps | 50 bps | 300 bps | 5,000 USDG |

These are the launch values set by `contracts/script/Deploy.s.sol`. Governance can change them through the timelock.

## Sessions

| Session (UTC, US standard time) | Spread multiplier | Clip multiplier |
| --- | --- | --- |
| Regular, 14:30–21:00 on weekdays | ×1 | ×1 |
| Extended, 09:00–14:30 and 21:00–01:00 | ×1.5 | ×0.75 |
| Closed: overnight and weekends | ×3 | ×0.5 |

When no market-status source is configured, `OracleRouter` uses this weekday schedule, which doesn't model holidays. Robinhood Stock Tokens currently don't expose an on-chain `marketStatus()`, so mainnet runs on the schedule.

## Routing

1. The trader calls `SwapRouter.swapExactIn` with the pair, an exact input, a minimum output and a deadline, and can attach a signed maker quote.
2. The router checks the trader's `TRADER` attestation, recomputes the vault quote in the same transaction, verifies the maker's signature, and settles on whichever venue pays more.
3. A token-to-token swap is two atomic legs through USDG. If either leg fails its guards, the whole swap reverts.

`SwapRouter.previewExactIn` takes the same arguments and returns the output and venue the fill would use.

## Halts

A market stops quoting (previews, vault fills and RFQ alike) when any of these hold:

- **The feed is stale.** The latest Chainlink round is older than the session's staleness bound.
- **A move-cap breach.** A print lands more than 25% away from a checkpoint less than an hour old. Anyone can call `OracleRouter.refresh(token)` to record the pause so it persists, and only governance can `resume` the market.
- **A corporate-action pause.** The token reports `oraclePaused() == true`.
- **A sequencer outage.** The Chainlink L2 uptime feed reports the sequencer down, or it recovered less than an hour ago. This applies only once an uptime feed is configured.
- **An emergency pause.** The guardian or the owner has paused swaps. Only the owner can unpause.

Deposits need the guarded mid, so they also stop during a halt. **Withdrawals never stop.**

## Corporate actions

Robinhood Stock Tokens implement ERC-8056 `uiMultiplier()`. Their Chainlink feeds already include the multiplier, so `OracleRouter` reports it but doesn't apply it a second time.
