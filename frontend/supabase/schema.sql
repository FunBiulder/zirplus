-- Zirplus database schema (Supabase / Postgres 15+).
--
-- Run this once in the Supabase SQL editor, then seed.sql. It is idempotent: rerunning it after a pull
-- upgrades functions, views and policies in place without touching existing rows.
--
-- Two kinds of data live here:
--   1. Private, per-user rows (profiles, attestations). The browser never touches these tables directly;
--      it calls POST /api/platform/db, which verifies the Privy token and then queries with the service-role
--      key, passing the verified Privy user id in the `x-zirplus-actor` header (see src/lib/platform/server.ts).
--   2. The public venue read model (markets, prices, vault snapshots, fills, governance log). The indexer
--      writes it with the service-role key; anyone can read it with the anon key.
--
-- Nothing here is authoritative for money. Balances, fills and attestations that matter are on-chain; these
-- tables mirror them for display.

-- ---------------------------------------------------------------------------
-- Acting user
-- ---------------------------------------------------------------------------

-- The Privy user id the current request acts for, or null.
--  * Service-role requests (the API route) carry it in the `x-zirplus-actor` header. The header is honoured
--    only for the service role, so an anon caller cannot set it and impersonate someone.
--  * Requests that carry a user JWT (e.g. a Supabase third-party-auth setup) use its `sub` claim.
create or replace function public.app_user_id() returns text
language sql stable
set search_path = ''
as $$
  select case
    when coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'role' = 'service_role'
      then nullif(coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-zirplus-actor', '')
    else nullif(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'sub', '')
  end
$$;

revoke all on function public.app_user_id() from public;
grant execute on function public.app_user_id() to anon, authenticated, service_role;

create or replace function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Profiles (private)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id             text primary key,                -- Privy user id, e.g. did:privy:...
  wallet_address text,
  email          text,
  display_name   text check (char_length(display_name) <= 80),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists profiles_wallet_key on public.profiles (lower(wallet_address)) where wallet_address is not null;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- The service role bypasses row-level security, so the API route's `.eq("id", actor)` is the main guard.
-- This trigger is the backstop: whenever a request names an acting user, it may only write that user's row.
create or replace function public.profiles_guard_actor() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor text := public.app_user_id();
begin
  if actor is not null and new.id is distinct from actor then
    raise exception 'profile % cannot be written by %', new.id, actor using errcode = '42501';
  end if;
  return new;
end
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard_actor();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = public.app_user_id());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (id = public.app_user_id());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = public.app_user_id()) with check (id = public.app_user_id());

-- ---------------------------------------------------------------------------
-- Attestations (private; mirrors NativeAttestationAdapter on-chain)
-- ---------------------------------------------------------------------------

create table if not exists public.attestations (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         text references public.profiles (id) on delete set null,
  wallet_address     text not null,
  role               text not null check (role in ('TRADER', 'LP', 'MAKER', 'RELAYER')),
  jurisdiction_class text,
  investor_class     smallint,
  issuer             text,                         -- address of the attestation issuer
  onchain_uid        text,                         -- attestation uid / tx hash on Robinhood Chain
  status             text not null default 'active' check (status in ('active', 'revoked')),
  issued_at          timestamptz not null default now(),
  expires_at         timestamptz not null,
  check (expires_at > issued_at)
);

create index if not exists attestations_profile_idx on public.attestations (profile_id, issued_at desc);
create index if not exists attestations_wallet_idx on public.attestations (lower(wallet_address));
create unique index if not exists attestations_onchain_uid_key on public.attestations (onchain_uid) where onchain_uid is not null;

-- Read-only for users: only the issuer (service role, outside any acting user) writes attestations.
alter table public.attestations enable row level security;

drop policy if exists attestations_select_own on public.attestations;
create policy attestations_select_own on public.attestations
  for select using (profile_id = public.app_user_id());

-- Link attestations issued to a wallet before its owner signed up, as soon as a profile claims that wallet.
create or replace function public.profiles_link_attestations() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.wallet_address is not null then
    update public.attestations
       set profile_id = new.id
     where profile_id is null
       and lower(wallet_address) = lower(new.wallet_address);
  end if;
  return new;
end
$$;

revoke all on function public.profiles_link_attestations() from public;

drop trigger if exists profiles_link on public.profiles;
create trigger profiles_link after insert or update of wallet_address on public.profiles
  for each row execute function public.profiles_link_attestations();

-- ---------------------------------------------------------------------------
-- Eligibility declarations (private; the audit trail behind self-certified attestations)
-- ---------------------------------------------------------------------------

-- One row per signed declaration: what the user declared, the network country the request came from, the
-- exact message and signature, and the attestation it produced. Written only by POST /api/platform/attest
-- with the service role; nobody reads it through the anon or authenticated roles.
create table if not exists public.eligibility_declarations (
  id               uuid primary key default gen_random_uuid(),
  profile_id       text references public.profiles (id) on delete set null,
  wallet_address   text not null,
  declared_country text not null check (char_length(declared_country) = 2),
  network_country  text,                         -- from the hosting edge (x-vercel-ip-country / cf-ipcountry)
  version          text not null,
  message          text not null,
  signature        text not null,
  attest_tx        text,
  expires_at       timestamptz,
  user_agent       text,
  created_at       timestamptz not null default now()
);

create index if not exists eligibility_declarations_wallet_idx on public.eligibility_declarations (lower(wallet_address), created_at desc);

alter table public.eligibility_declarations enable row level security;
revoke all on public.eligibility_declarations from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Venue read model (public)
-- ---------------------------------------------------------------------------

create table if not exists public.markets (
  id                   text primary key,          -- stable slug, e.g. 'nvdax-4663'
  chain_id             integer not null,
  symbol               text not null,             -- display symbol used by the UI (NVDAx); the token's own is NVDA
  name                 text not null,
  token_address        text not null,
  token_decimals       smallint not null default 18,
  feed_address         text,                      -- Chainlink proxy the OracleRouter is configured with
  quote_symbol         text not null default 'USDG',
  quote_address        text not null,
  quote_decimals       smallint not null default 6,
  tier                 smallint not null check (tier in (1, 2, 3)),
  tier_label           text not null,
  base_half_spread_bps integer not null,
  max_skew_bps         integer not null,
  inventory_band_bps   integer not null,
  oracle_band_bps      integer not null,
  max_clip             numeric not null,          -- quote units (USDG), whole tokens not base units
  daily_volume_cap     numeric not null,
  tvl_cap              numeric not null,
  vault_address        text,                      -- set once VaultFactory.createMarket has run for this token
  enabled              boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (chain_id, symbol),
  unique (chain_id, token_address)
);

drop trigger if exists markets_touch on public.markets;
create trigger markets_touch before update on public.markets
  for each row execute function public.touch_updated_at();

create table if not exists public.market_prices (
  id          bigint generated always as identity primary key,
  market_id   text not null references public.markets (id) on delete cascade,
  price       numeric not null check (price > 0), -- USDG per whole token (guarded mid)
  session     text not null check (session in ('regular', 'extended', 'closed')),
  multiplier  numeric not null default 1,         -- ERC-8056 uiMultiplier, as a plain number
  source      text,                               -- 'chainlink', 'stream', ...
  observed_at timestamptz not null default now()
);

create index if not exists market_prices_latest_idx on public.market_prices (market_id, observed_at desc);

create table if not exists public.vault_snapshots (
  id                  bigint generated always as identity primary key,
  market_id           text not null references public.markets (id) on delete cascade,
  tvl                 numeric not null default 0,
  inventory_ratio_bps integer not null default 5000 check (inventory_ratio_bps between 0 and 10000),
  volume_24h          numeric not null default 0,
  spread_revenue_24h  numeric not null default 0,
  source              text,                       -- 'indexer', ...
  observed_at         timestamptz not null default now()
);

alter table public.vault_snapshots add column if not exists source text;

create index if not exists vault_snapshots_latest_idx on public.vault_snapshots (market_id, observed_at desc);

create table if not exists public.fills (
  id              bigint generated always as identity primary key,
  market_id       text not null references public.markets (id) on delete cascade,
  tx_hash         text,
  log_index       integer,                        -- with tx_hash, makes indexer inserts idempotent
  trader_address  text,
  side            text not null check (side in ('buy', 'sell')),
  venue           text not null check (venue in ('vault', 'rfq')),
  amount_in       numeric not null,
  amount_out      numeric not null,
  notional        numeric not null,               -- USDG at mid
  mid             numeric not null,
  half_spread_bps integer not null,
  skew_bps        integer not null default 0,
  fee_bps         integer not null,
  fee_amount      numeric not null default 0,
  session         text not null check (session in ('regular', 'extended', 'closed')),
  executed_at     timestamptz not null default now()
);

create index if not exists fills_executed_idx on public.fills (executed_at desc);
create index if not exists fills_market_idx on public.fills (market_id, executed_at desc);
create index if not exists fills_trader_idx on public.fills (lower(trader_address), executed_at desc);
create unique index if not exists fills_event_key on public.fills (tx_hash, log_index) where tx_hash is not null;

create table if not exists public.governance_log (
  id            bigint generated always as identity primary key,
  action        text not null,
  detail        text not null,
  rationale_url text,
  tx_hash       text,
  occurred_at   timestamptz not null default now()
);

create index if not exists governance_log_occurred_idx on public.governance_log (occurred_at desc);

-- Latest row per market. security_invoker keeps the underlying tables' RLS in force for whoever queries.
create or replace view public.market_latest_prices with (security_invoker = true) as
  select distinct on (market_id) market_id, price, session, multiplier, source, observed_at
    from public.market_prices
   order by market_id, observed_at desc, id desc;

create or replace view public.vault_latest_snapshots with (security_invoker = true) as
  select distinct on (market_id) market_id, tvl, inventory_ratio_bps, volume_24h, spread_revenue_24h, observed_at
    from public.vault_snapshots
   order by market_id, observed_at desc, id desc;

-- Public read, no public write: the indexer writes with the service role, which bypasses RLS.
do $$
declare
  t text;
begin
  foreach t in array array['markets', 'market_prices', 'vault_snapshots', 'fills', 'governance_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format('create policy %I on public.%I for select using (true)', t || '_public_read', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.attestations from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.attestations to authenticated;

revoke insert, update, delete, truncate on public.markets, public.market_prices, public.vault_snapshots,
  public.fills, public.governance_log from anon, authenticated;
grant select on public.markets, public.market_prices, public.vault_snapshots, public.fills, public.governance_log,
  public.market_latest_prices, public.vault_latest_snapshots to anon, authenticated;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
