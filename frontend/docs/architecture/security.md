# Security

This page covers what Zirplus trusts, what it guarantees, how it's tested, and how to report a problem.

> **Status: pre-audit.** No external audit has been completed and no bug bounty is live. Don't deposit funds you can't afford to lose until both rows of the [programme table](#programme) say otherwise.

## Trust model

| Party | Can | Cannot |
| --- | --- | --- |
| **Governance owner** (the deployer at launch) | Change any parameter through `ParamController.schedule` / `execute` after the timelock (1 hour to 30 days, 48 hours recommended); pause or resume a market's oracle; unpause swaps; cancel scheduled operations | Move LP or trader funds; block withdrawals; upgrade contracts (there are no proxies); make a fill clear outside the oracle band |
| **Guardian** | Pause swaps immediately | Unpause, change parameters, or pause deposits, withdrawals or RFQ cancellation |
| **Attestation issuer** | Grant and revoke `TRADER`, `LP`, `MAKER` and `RELAYER` roles | Touch funds. Revoking an LP's role never blocks that LP's withdrawal. |
| **RFQ makers** | Quote prices signed with EIP-712; cancel by nonce or with `cancelBelow` | Settle outside the band; reuse a cancelled or filled nonce |
| **Chainlink** | Supplies the mid, through the feed proxy | Push a print that moves more than the cap within the window without halting the market; serve a round past the staleness bound |
| **Robinhood Stock Token issuer** | Pause, freeze or update the multiplier on its own token | Change Zirplus parameters. Its `oraclePaused()` halts the market rather than mispricing it. |
| **Sequencer** (Robinhood Chain) | Order and censor transactions | Trigger trading straight after an outage, once an uptime feed is configured (1 hour grace) |

During bootstrap the owner can call setters directly, without the timelock. `finishBootstrap()` ends this permanently. Mainnet deploys should set `FINISH_BOOTSTRAP=true` so that bootstrap never lasts past the deploy transaction.

## Invariants

These are enforced in code and exercised by the test suite:

1. **Band.** In every regime, and with any parameter set the controller accepts, no vault or maker fill clears outside the tier's oracle band.
2. **Exit.** Withdrawals are pro-rata and in kind, consult no oracle, and succeed in every state: halted, paused, retired or with expired attestations.
3. **Value per share.** A swap never lowers value per share, and rounding on mint and burn favours the vault.
4. **Inventory.** A fill can't push a vault outside its inventory band, or further out once a price move has put it there. The harmful side becomes one-sided, and the rebalancing side stays open.
5. **Preview equals fill.** `AnchorVault.quoteSwap` and `SwapRouter.previewExactIn` return exactly what the fill would settle at.
6. **Exact feed.** Each market is priced from the feed configured for the exact token in its vault, never from a wrapper or a derived rate.
7. **Itemised.** Every fill emits its mid, spread, skew and fee.

## Known risks and limitations

- **The sequencer guard is off at launch.** Chainlink hasn't published an L2 Sequencer Uptime Feed for Robinhood Chain yet. Until one is configured with `OracleRouter.setSequencerFeed`, a sequencer outage doesn't start a grace period.
- **Holidays aren't modelled.** Stock Tokens don't expose `marketStatus()`, so sessions follow a weekday schedule. On US market holidays, the venue quotes "regular" spreads against a feed that isn't updating, and the staleness bound and move cap are the only protection.
- **Heartbeat versus staleness.** The equity feeds update every 24 hours or on a 0.5% move. Staleness bounds shorter than the heartbeat halt quiet markets, and much longer bounds let a frozen price trade. The mainnet deploy uses 25 hours for open sessions and 4 days when closed.
- **USDG is treated as USD.** Feeds are priced in USD and vaults settle in USDG. A USDG depeg passes straight through to LPs. Monitor the Chainlink USDG / USD feed.
- **One key holds every role at launch.** The deployer is the owner, the guardian and the attestation issuer. A leaked deployer key could schedule parameter changes (visible for 48h before they can execute), unpause swaps, and attest any wallet. It still could not move LP funds or block withdrawals. Keep the key offline, and move ownership to a multisig (`transferOwnership`, then `acceptOwnership`) as soon as TVL grows.
- **Self-attestations.** The deploy attests the deployer for every role so the flows can be tested. Revoke them with `NativeAttestationAdapter.revoke` once real issuance starts.
- **The off-chain read model isn't trusted.** The Supabase tables behind the web app are for display only. A compromised indexer can show wrong numbers but can't move funds, because every swap is bounded by the user's `minAmountOut` and the on-chain checks.

## Testing

| Layer | What runs | Command |
| --- | --- | --- |
| Unit | Vault accounting, swap pricing, regimes and halts, RFQ, governance, fees, eligibility and attestations: 112 tests across 9 suites | `forge test -vv` |
| Fuzz | Pricing and accounting under random sizes, prices and inventories (`test/Fuzz.t.sol`) | `forge test --match-path test/Fuzz.t.sol --fuzz-runs 10000` |
| Static analysis | Slither and `forge lint` | `slither .` · `forge lint` |
| Fork | Deploy against the live USDG, NVDA token and Chainlink feed with no broadcast | `forge script script/Deploy.s.sol --fork-url $ROBINHOOD_RPC` |
| Web app | Lint, typecheck and production build | `npm run check` (in `frontend/`) |

Before a mainnet deploy, the full suite must pass on the exact commit being deployed, and the fork simulation must succeed with the final `.env.mainnet`.

## Programme

| Item | Status |
| --- | --- |
| Internal review | To do: record who reviewed which commit |
| External audit | Not started. Get at least one independent audit of `src/` before mainnet TVL caps are raised. |
| Bug bounty | Not live. Launch one (e.g. on Immunefi) alongside mainnet. |
| Monitoring | Planned: alerts on `MarketPausedEvent`, `EmergencyPause`, scheduled governance operations, feed staleness and the USDG / USD feed |
| Incident response | The guardian pauses swaps. The owner investigates, then resumes or schedules a fix. LPs can withdraw throughout. |

## Reporting a vulnerability

Please report vulnerabilities **privately**. Don't open a public issue or post about them.

- Email: `security@<your-domain>` *(set this before launch, and keep it in step with `NEXT_PUBLIC_CONTACT_EMAIL`)*
- Include the affected contract or page, steps to reproduce, and the impact you expect.
- We aim to acknowledge reports within 48 hours and to agree a disclosure timeline with you. Good-faith research that avoids harm to users and their funds won't be pursued.
