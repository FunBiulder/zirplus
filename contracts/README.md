# Zirplus contracts

These are the smart contracts behind Zirplus, a non-custodial venue for swapping tokenized real-world assets on Robinhood Chain. In every market, anchor vaults quote both sides around the guarded Chainlink mid, while block-size orders settle against signed RFQ maker quotes; a single router stitches the two together behind one entry point, with everything settled in USDG.

The target is Robinhood Chain (chain ID 4663), which runs on Arbitrum Nitro, and the toolchain is Foundry.

## Layout

```
src/
  SwapRouter.sol              the only entry point for traders: eligibility, choosing vault or RFQ, two-leg composition
  AnchorVault.sol             one per market: quotes anchored to the oracle, inventory skew, LP shares, in-kind withdrawal
  VaultFactory.sol            deploys vaults and doubles as the registry the router looks them up in
  RfqSettlement.sol           EIP-712 maker quotes, cancellation by nonce, atomic settlement checked against the band
  OracleRouter.sol            Chainlink feeds and streams behind session, staleness, move-cap and sequencer guards
  EligibilityRegistry.sol     role checks delegated to a policy adapter that can be swapped
  adapters/NativeAttestationAdapter.sol   standalone attestation store following EAS semantics
  ParamController.sol         protocol parameters behind a timelock; the guardian's only power is pausing swaps
  FeeCollector.sol            collects the itemised swap fees, the RFQ fees and the protocol's share of the spread
  libraries/                  Types (quotes, breakdowns, roles and constants)
  interfaces/                 interfaces for the protocol and for external systems (Chainlink, ERC-8056)
script/Deploy.s.sol           deploys and configures everything on mainnet, then opens the launch market
test/                         Foundry suite covering vault accounting, swap pricing, regimes and halts, RFQ and governance
test/mocks/                   test-only stand-ins (USDG, Stock Token, aggregator, stream adapter); never deployed
deployments/                  addresses recorded by the deploy script, one JSON file for each chain ID
```

## Deployments

There is no Zirplus deployment yet. The target is Robinhood Chain mainnet (chain ID 4663) only; the deploy script refuses any other chain and writes every address to `deployments/4663.json`. The contracts carry the brand strings (EIP-712 domain `Zirplus`, role ids `keccak256("zirplus.role.*")`, vault names `Zirplus <SYMBOL> Vault`), so signatures and attestations from any earlier deployment will not verify against them.

## Swap settlement, step by step

1. A trader calls `SwapRouter.swapExactIn`, passing the pair, an exact input amount, a minimum output and a deadline, and may also attach a signed maker quote.
2. The router confirms the trader's `TRADER` attestation, recomputes the anchor vault's price from oracle and vault state within the same transaction, checks the maker quote's signature when one is supplied, and settles on whichever venue gives the larger output.
3. Vault pricing follows the formula: guarded Chainlink mid, the tier half-spread multiplied by the session multiplier, signed inventory skew and an itemised fee. Each fill emits its complete breakdown, and neither venue can settle outside the tier's oracle band.
4. A token-to-token swap is two atomic legs routed through USDG; should either leg fail to clear within its market's guards, the whole swap reverts.

## Quick start

```bash
forge soldeer install     # pulls forge-std and OpenZeppelin into dependencies/
forge build
forge test -vv
```

Soldeer handles dependencies, so there are no git submodules. The build uses Solidity 0.8.26, the Cancun EVM and via-IR.

## Deploying

`.env.example` already carries the verified mainnet values: RPC and Blockscout URLs, USDG, the NVDA Stock Token and its Chainlink feed, staleness bounds that suit the feed's 24h heartbeat, a 48h timelock and `FINISH_BOOTSTRAP=true`.

1. Copy `.env.example` to `.env` and set `PRIVATE_KEY`. With `GOV`, `GUARDIAN` and `ATTESTATION_ISSUER` empty, the deployer holds all three roles and attests itself for every role (`SELF_ATTEST=true`).
2. Leave `MARKET_STATUS_SOURCE` empty: Stock Tokens have no `marketStatus()`, and pointing at one would make every quote revert. Leave `SEQUENCER_FEED` empty until Chainlink publishes the Robinhood Chain uptime feed.
3. Simulate, then broadcast:

```bash
source .env
forge script script/Deploy.s.sol --rpc-url robinhood                                  # simulation, sends nothing
forge script script/Deploy.s.sol --rpc-url robinhood --broadcast --slow --verify --verifier blockscout --verifier-url "$ROBINHOOD_BLOCKSCOUT_API"      # real deploy
```

The script checks that USDG, the token and the feed have code on-chain, deploys the eight core contracts, applies the launch parameters (Tier A: 10 bps half-spread, 75 bps band, 50,000 USDG clip; session multipliers of x1.5 extended and x3 closed; 2 bps fees and a 10% spread share), opens the NVDA market and finishes bootstrap, after which every `ParamController` change waits out the timelock (oracle configuration does not; see Governance model).

`--verify` covers the contracts the script deploys itself. The factory deploys the `AnchorVault`, so forge cannot recover its constructor arguments; verify it by hand with the addresses from `deployments/4663.json`. The vault takes its name from the token's own symbol, `NVDA`:

```bash
ARGS=$(cast abi-encode "constructor(address,address,address,address,address,address,string,string)" \
  $PARAM_CONTROLLER $ELIGIBILITY_REGISTRY $ORACLE_ROUTER $FEE_COLLECTOR $USDG $STOCK_TOKEN \
  "Zirplus NVDA Vault" "zvNVDA")
forge verify-contract $ANCHOR_VAULT src/AnchorVault.sol:AnchorVault --chain 4663 \
  --verifier blockscout --verifier-url "$ROBINHOOD_BLOCKSCOUT_API" --constructor-args "$ARGS" --watch
```

The full runbook, including what to do right after deploying, is in [`frontend/docs/protocol/deployments.md`](../frontend/docs/protocol/deployments.md).

## Governance model

- `ParamController` begins in bootstrap mode, where the owner calls setters directly. Calling `finishBootstrap()` cannot be undone and sends every subsequent change through `schedule` / `execute` with the configured delay.
- Not everything is timelocked. The owner calls these directly, with no delay: `OracleRouter.configureFeed` (which can replace a live market's price feed), `setSequencerFeed`, `setSchedule`, `pause` and `resume`; `VaultFactory.createMarket`; and on `ParamController`, unpausing swaps, cancelling scheduled operations and `transferOwnership`. `configureFeed` overwrites a live market's feed, so a compromised owner key could mis-price fills and drain vault inventory; timelocking the oracle configuration (or holding ownership in a multisig) is the fix.
- Pausing swaps is the guardian's only power. Deposits, withdrawals and RFQ cancellation cannot be paused by anyone.
- There is no proxy and no admin on `SwapRouter`, `AnchorVault` or `RfqSettlement`; `VaultFactory`'s only owner powers are opening markets and its one-time router wiring. Upgrades arrive as fresh deployments, and LPs choose whether to migrate.

## Key invariants

- Whatever the regime and whatever parameter set the controller accepts, no fill from a vault or a maker clears outside the tier's oracle band.
- Withdrawing from a vault is pro-rata and in kind, and it works in every state: halted, paused by the guardian, market retired or attestation expired. LP funds cannot be trapped.
- A swap never lowers value per share, and rounding on mint and burn always goes in the vault's favour.
- No fill may push a vault outside its inventory band, or move it further out when a price move has already done so, and the preview matches the fill exactly; the harmful side therefore turns one-sided rather than soaking up unlimited inventory, while the rebalancing side brings the vault back inside.
- Each market is priced from the feed configured for the precise token held in the vault, never from a wrapper or a derived rate.
- Every quote is itemised on-chain, with the fill event recording mid, spread, skew and fee in line with the quote.

## Integration guidance

- Traders approve the router and makers approve `RfqSettlement`; Permit2 and ERC-4337 batching live a layer above these contracts, not within them.
- Because deposits value incoming assets at the guarded mid, they revert while a market is halted; withdrawals consult no oracle and never revert because of market state.
- `AnchorVault.quoteSwap` gives the exact preview. It reverts while the market is halted, and the router reads that as "no vault quote", letting RFQ keep the market running.
- `SwapRouter.previewExactIn` accepts the same params as `swapExactIn` and returns the output and venue the fill would settle on, covering the RFQ candidate and two-leg composition. It throws the same errors the fill would, except for the deadline, eligibility and the candidate's signature, which only the call itself checks.
- If a feed print lands further than the move cap from a recent checkpoint, the market halts in that same block for previews, fills and RFQ settlement alike. Anyone may call `OracleRouter.refresh`: on a halted market it records the pause so that it persists beyond the move-cap window, and only a governance `resume` lifts it.

## Security

[`frontend/docs/architecture/security.md`](../frontend/docs/architecture/security.md) sets out the security programme (testing, audits, bounty and disclosure). Please report vulnerabilities privately to the maintainers rather than opening public issues.
