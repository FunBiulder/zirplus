-- Zirplus market catalogue for Robinhood Chain mainnet (chain ID 4663). Run after schema.sql.
--
-- Configuration only: which token, Chainlink feed and tier parameters each market uses. No prices, snapshots
-- or fills. Until the indexer writes price rows, /platform reads each market's mid straight from its feed.
--
-- Rerunnable: rows are upserted by id, so editing a value here and running it again updates that market.
--
-- Addresses were checked on 2026-10-14:
--   tokens  api.robinhood.com/rhj/assets (chainId 4663), symbol() and decimals() read from the mainnet RPC
--   feeds   Chainlink "Robinhood <SYM> / USD" proxies (8 decimals, 24h heartbeat, 0.5% deviation)
--   USDG    docs.robinhood.com/chain/contracts, 6 decimals
-- Display symbols keep the `x` suffix the UI and its logos use; the tokens' own ERC-20 symbols drop it.
--
-- Only NVDAx is opened by contracts/script/Deploy.s.sol. The others need governance to configure the feed
-- and market (OracleRouter.configureFeed, ParamController.setMarketConfig) and call VaultFactory.createMarket,
-- after which set vault_address below. Tier parameters mirror the deploy script; the Tier B and C volume and
-- TVL caps are proposals until governance sets them on-chain.

insert into public.markets (
  id, chain_id, symbol, name, token_address, token_decimals, feed_address,
  quote_symbol, quote_address, quote_decimals,
  tier, tier_label, base_half_spread_bps, max_skew_bps, inventory_band_bps, oracle_band_bps,
  max_clip, daily_volume_cap, tvl_cap, vault_address, enabled
)
select
  m.id, 4663, m.symbol, m.name, m.token_address, 18, m.feed_address,
  'USDG', '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168', 6,
  m.tier, t.label, t.half, t.skew, 2000, t.band,
  t.clip, t.daily_cap, t.tvl_cap,
  case m.id when 'nvdax-4663' then '0x049A177583309763350e46B3CB2eAd7508c08D9d' end, -- launch vault, deployed 2026-10-15
  true
from (values
  ('nvdax-4663', 'NVDAx', 'NVIDIA • Robinhood Token',           '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC', '0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15', 1),
  ('spyx-4663',  'SPYx',  'SPDR S&P 500 ETF Trust • Robinhood Token', '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C', '0x319724394D3A0e3669269846abE664Cd621f9f6A', 1),
  ('aaplx-4663', 'AAPLx', 'Apple • Robinhood Token',            '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9', '0x6B22A786bAa607d76728168703a39Ea9C99f2cD0', 1),
  ('msftx-4663', 'MSFTx', 'Microsoft • Robinhood Token',        '0xe93237C50D904957Cf27E7B1133b510C669c2e74', '0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E', 1),
  ('qqqx-4663',  'QQQx',  'Invesco QQQ • Robinhood Token',      '0xD5f3879160bc7c32ebb4dC785F8a4F505888de68', '0x80901d846d5D7B030F26B480776EE3b29374C2ae', 1),
  ('tslax-4663', 'TSLAx', 'Tesla • Robinhood Token',            '0x322F0929c4625eD5bAd873c95208D54E1c003b2d', '0x4A1166a659A55625345e9515b32adECea5547C38', 2),
  ('amznx-4663', 'AMZNx', 'Amazon • Robinhood Token',           '0x12f190a9F9d7D37a250758b26824B97CE941bF54', '0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C', 2),
  ('pltrx-4663', 'PLTRx', 'Palantir Technologies • Robinhood Token', '0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A', '0x820ABedFF239034956B7A9d2F0a331f9F075eB4c', 3)
) as m (id, symbol, name, token_address, feed_address, tier)
join (values
  -- tier, label, half-spread, max skew, oracle band, clip, daily volume cap, TVL cap (USDG)
  (1, 'A', 10, 15,  75, 50000, 2000000, 5000000),
  (2, 'B', 20, 25, 150, 20000, 1000000, 2000000),
  (3, 'C', 40, 50, 300,  5000,  250000,  500000)
) as t (tier, label, half, skew, band, clip, daily_cap, tvl_cap) on t.tier = m.tier
on conflict (id) do update set
  symbol               = excluded.symbol,
  name                 = excluded.name,
  token_address        = excluded.token_address,
  token_decimals       = excluded.token_decimals,
  feed_address         = excluded.feed_address,
  quote_symbol         = excluded.quote_symbol,
  quote_address        = excluded.quote_address,
  quote_decimals       = excluded.quote_decimals,
  tier                 = excluded.tier,
  tier_label           = excluded.tier_label,
  base_half_spread_bps = excluded.base_half_spread_bps,
  max_skew_bps         = excluded.max_skew_bps,
  inventory_band_bps   = excluded.inventory_band_bps,
  oracle_band_bps      = excluded.oracle_band_bps,
  max_clip             = excluded.max_clip,
  daily_volume_cap     = excluded.daily_volume_cap,
  tvl_cap              = excluded.tvl_cap,
  -- never overwrite a vault address the deploy or indexer has already recorded
  vault_address        = coalesce(public.markets.vault_address, excluded.vault_address),
  enabled              = excluded.enabled;

