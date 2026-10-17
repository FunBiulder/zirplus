# Supabase setup

The platform keeps two kinds of data in Supabase:

| Data | Tables | Who writes | Who reads |
| --- | --- | --- | --- |
| Private, per user | `profiles`, `attestations` | the API route (`POST /api/platform/db`) for profiles; the attestation issuer for attestations | only the user it belongs to, through the API route |
| Public venue read model | `markets`, `market_prices`, `vault_snapshots`, `fills`, `governance_log` and the views `market_latest_prices`, `vault_latest_snapshots` | the indexer, with the service-role key | anyone, with the anon key |

None of it is authoritative for funds. Balances, fills and attestations that matter live on Robinhood Chain; these tables mirror them for display.

## Files

| File | Run it | What it does |
| --- | --- | --- |
| `schema.sql` | always, first | Tables, views, indexes, row-level security, grants and the `app_user_id()` function. Idempotent, so rerun it after pulling changes. |
| `seed.sql` | always, second | The market catalogue for chain 4663: eight markets with their verified token and Chainlink feed addresses and tier parameters. Configuration only. Rerunnable. |

## Steps

1. Create a project at [supabase.com](https://supabase.com). Any region works; pick the one nearest your Next.js host.
2. Open **SQL Editor**, paste `schema.sql` and run it. Then do the same with `seed.sql`.
3. Under **Project Settings → API keys**, copy these into `frontend/.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role / `sb_secret_…` key → `SUPABASE_SERVICE_ROLE_KEY`. This one is server-only; never prefix it with `NEXT_PUBLIC_`.
4. Restart `npm run dev`. If a variable is missing, `/platform` lists it on the setup screen.

Check that it worked by running this in the SQL editor:

```sql
select symbol, tier_label, token_address, feed_address from public.markets order by tier, symbol;
```

You should see eight rows. Until the indexer writes `market_prices`, the platform reads each market's mid directly from its Chainlink feed (`feed_address`), and TVL, inventory and fills stay empty.

## How authenticated requests work

1. The browser signs in with Privy and sends its access token to `POST /api/platform/db`.
2. The route verifies the token with `PRIVY_APP_SECRET`, takes the Privy user id (`did:privy:…`), and queries Supabase with the service-role key, adding the header `x-zirplus-actor: <user id>`.
3. `app_user_id()` returns that header, **but only when the request's JWT role is `service_role`**. An anon caller who sets the header gets `null`. For requests that carry a user JWT (third-party auth), it returns the token's `sub`.
4. The service role bypasses RLS, so the route's own `.eq("id", actor)` filters are the first guard. A trigger on `profiles` is the backstop: whenever a request names an acting user, it can only insert or update that user's row.

Attestations are written by the issuer, using the service role without an actor header. When someone signs up, or changes the wallet on their profile, any attestations already issued to that wallet are linked to their profile automatically.

## Upgrading from the old brand

If your project was created with an older schema whose `app_user_id()` read a different header name, rerunning `schema.sql` replaces the function with one that reads `x-zirplus-actor`. Nothing else needs changing.

## Feeding the read model (indexer)

The indexer isn't in this repo yet. Whatever you build it with (a cron job, Ponder, Envio or a Supabase Edge Function), it writes with the service-role key and no actor header:

| Source on-chain | Write to | Notes |
| --- | --- | --- |
| `VaultFactory` market created | `update markets set vault_address = …` | Match on `token_address`. |
| `OracleRouter.quote(token)` (poll, e.g. every minute) | `insert into market_prices` | Store `price` in USDG per whole token, `session`, and `multiplier` as a plain number. Set `source = 'chainlink'`. |
| AnchorVault state (poll) | `insert into vault_snapshots` | `tvl` = `totalValue()` / 1e6; `inventory_ratio_bps` = `inventoryRatioBps()`. Set `source = 'indexer'`. |
| Vault and RFQ fill events | `insert into fills … on conflict do nothing` | Always set `tx_hash` and `log_index`; the unique index on them makes reruns safe. Store `trader_address` lowercased. |
| `ParamController` / `OracleRouter` governance events | `insert into governance_log` | Include `tx_hash`. |

The two `*_latest_*` views always return the newest row per market, so the indexer only ever inserts. Prune old `market_prices` and `vault_snapshots` rows on a schedule if the tables grow large.

Right after deploying to mainnet, record the launch vault from `contracts/deployments/4663.json`:

```sql
update public.markets set vault_address = '0x…' where id = 'nvdax-4663';
```
