# Deployments

Zirplus is deployed on **Robinhood Chain mainnet** (2026-10-15). Every address is also recorded in `contracts/deployments/4663.json`.

## Network

| | Robinhood Chain |
| --- | --- |
| Chain ID | 4663 |
| Public RPC (rate-limited) | `https://rpc.mainnet.chain.robinhood.com` |
| Provider RPC | `https://robinhood-mainnet.g.alchemy.com/v2/<key>` |
| Explorer | [robinhoodchain.blockscout.com](https://robinhoodchain.blockscout.com) |
| Blockscout verifier API | `https://robinhoodchain.blockscout.com/api/` |

## External dependencies

Checked on 2026-10-14 against the mainnet RPC. Re-check them before deploying.

| Name | Address | Notes |
| --- | --- | --- |
| USDG | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | 6 decimals. Quote asset for every market. |
| NVDA Stock Token | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` | 18 decimals. Implements `uiMultiplier()` and `oraclePaused()`. |
| Chainlink NVDA / USD | `0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15` | 8 decimals, 24h heartbeat, 0.5% deviation. |
| Chainlink USDG / USD | `0x61B7e5650328764B076A108EFF5fa7282a1B9aD2` | For depeg monitoring; not used by the contracts. |
| L2 Sequencer Uptime Feed | not published yet | See [Sequencer feed](#sequencer-feed). |

The other catalogue markets (SPY, AAPL, MSFT, QQQ, TSLA, AMZN, PLTR) have their token and feed addresses in `frontend/supabase/seed.sql`.

## Zirplus contracts

| Contract | Address |
| --- | --- |
| ParamController | [`0xf7D02fd1Bc8C40fd20aed40FCeD073e408144701`](https://robinhoodchain.blockscout.com/address/0xf7D02fd1Bc8C40fd20aed40FCeD073e408144701) |
| EligibilityRegistry | [`0x5a65e561D94dD61c1A6C20F9A3F149559DEF7214`](https://robinhoodchain.blockscout.com/address/0x5a65e561D94dD61c1A6C20F9A3F149559DEF7214) |
| NativeAttestationAdapter | [`0xdA43608E348EE415857A036333ACE7e7ae25e003`](https://robinhoodchain.blockscout.com/address/0xdA43608E348EE415857A036333ACE7e7ae25e003) |
| OracleRouter | [`0xb9460491694e13Afffdc13Dd578147f3323241d2`](https://robinhoodchain.blockscout.com/address/0xb9460491694e13Afffdc13Dd578147f3323241d2) |
| FeeCollector | [`0xFa35360d6f200BFDD768fD2AA3610568c5EbB13d`](https://robinhoodchain.blockscout.com/address/0xFa35360d6f200BFDD768fD2AA3610568c5EbB13d) |
| VaultFactory | [`0x762C2B13fD2c5784dBeD06Dc57A521f482BAAC0F`](https://robinhoodchain.blockscout.com/address/0x762C2B13fD2c5784dBeD06Dc57A521f482BAAC0F) |
| RfqSettlement | [`0x1c9329D6B66f610bD38ad284A435DC59B76a25d4`](https://robinhoodchain.blockscout.com/address/0x1c9329D6B66f610bD38ad284A435DC59B76a25d4) |
| SwapRouter | [`0xE5cfF6b8E51651838C74b73a4cA49202F1ed0594`](https://robinhoodchain.blockscout.com/address/0xE5cfF6b8E51651838C74b73a4cA49202F1ed0594) |
| AnchorVault (NVDA) | [`0x049A177583309763350e46B3CB2eAd7508c08D9d`](https://robinhoodchain.blockscout.com/address/0x049A177583309763350e46B3CB2eAd7508c08D9d) |

## Deploying

All commands run from `contracts/`, in Git Bash or WSL. `contracts/.env` already holds the mainnet values. With `GOV`, `GUARDIAN` and `ATTESTATION_ISSUER` left empty, the deployer becomes the owner, the guardian and the issuer, and it attests itself for every role.

```bash
source .env
forge script script/Deploy.s.sol --rpc-url robinhood                              # 1. simulation, sends nothing
forge script script/Deploy.s.sol --rpc-url robinhood --broadcast --slow --verify --verifier blockscout --verifier-url "$ROBINHOOD_BLOCKSCOUT_API"  # 2. real deploy
```

The script refuses any chain other than 4663, and it checks that USDG, the token and the feed all have code. Bootstrap finishes at the end of the deploy, so from then on every parameter change waits out the 48h timelock (`ParamController.schedule`, then `execute`). Pausing swaps and pausing or resuming a market stay immediate.

### Verifying the vault

The factory deploys `AnchorVault`, so forge can't recover its constructor arguments. Verify it by hand, using the addresses in `deployments/4663.json`:

```bash
ARGS=$(cast abi-encode "constructor(address,address,address,address,address,address,string,string)" \
  $PARAM_CONTROLLER $ELIGIBILITY_REGISTRY $ORACLE_ROUTER $FEE_COLLECTOR $USDG $STOCK_TOKEN \
  "Zirplus NVDA Vault" "zvNVDA")
forge verify-contract $ANCHOR_VAULT src/AnchorVault.sol:AnchorVault --chain 4663 \
  --verifier blockscout --verifier-url "$ROBINHOOD_BLOCKSCOUT_API" --constructor-args "$ARGS" --watch
```

### After deploying

1. Record the vault in Supabase: `update public.markets set vault_address = '0x…' where id = 'nvdax-4663';`
2. Fill in the address table above.
3. Check `ParamController.owner()`, `guardian()` and `bootstrapped()` on Blockscout.
4. Make a small deposit and a small swap from the deployer, then read the fill event on Blockscout.

### Moving governance later

The deployer key controls everything while it's the owner, guardian and issuer. To hand control to a multisig, call `ParamController.transferOwnership(<safe>)`, then have the Safe call `acceptOwnership()`. Changing the guardian (`setGuardian`) and the issuer (`setAttestationIssuer`) are timelocked operations, so schedule them and execute them after 48h.

## Sequencer feed

Chainlink publishes L2 Sequencer Uptime Feeds per network at [docs.chain.link/data-feeds/l2-sequencer-feeds](https://docs.chain.link/data-feeds/l2-sequencer-feeds). As of 2026-10-14, neither that page nor Chainlink's Robinhood feed directory lists one for Robinhood Chain. To check again:

```bash
curl -s https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json \
  | grep -i -o '"name":"[^"]*\(sequencer\|uptime\)[^"]*"[^}]*"proxyAddress":"0x[0-9a-fA-F]*"'
```

Once it appears, set it from the owner. It's a direct call, not a timelocked one:

```bash
cast send $ORACLE_ROUTER "setSequencerFeed(address)" <FEED_ADDRESS> --rpc-url robinhood --private-key $PRIVATE_KEY
```
