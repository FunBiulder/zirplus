<p align="center">
  <img src="src/app/icon.svg" alt="Zirplus" width="88" />
</p>

<h1 align="center">Zirplus</h1>

<p align="center">
  A non-custodial swap venue for tokenized stocks on Robinhood Chain.<br />
  The marketing site and the trading app under <code>/platform</code> both live in this folder.
</p>

## Stack

- Next.js 16 (App Router, Turbopack), React 19 and TypeScript
- Tailwind CSS 4, with the Zirplus design tokens defined in `src/app/globals.css`
- Privy, which handles sign-in and embedded wallets on Robinhood Chain
- Supabase (Postgres), which stores profiles and eligibility attestations, plus the venue read model
- viem, used for chain configuration and on-chain interaction
- lucide-react for icons

## Getting started

You need Node 24 or later (pinned in `.nvmrc`), a Supabase project and a Privy app.

```bash
npm install
cp .env.example .env.local   # then fill in the Privy and Supabase keys
npm run dev                  # http://localhost:3000
```

The Robinhood Chain values in `.env.example` are already filled in. To set up the database, follow [`supabase/README.md`](supabase/README.md): run `schema.sql`, then `seed.sql`. If any platform variable is missing, `/platform` shows a setup screen listing exactly which ones, rather than failing.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check` | Lint, typecheck and build in one go; run it before shipping |

## The website

The homepage (`src/app/page.tsx`, sections in `src/components/home/`) is a run of charcoal "stages" floating on a pastel field:

- **Hero.** Nav inside the stage, the pastel two-line headline, the orbit illustration (`src/components/art/Orbit.tsx`), today's date with the live US session, socials and a ringed plus that scrolls to the formula.
- **Formula.** The four price terms as gradient beads on an orbit line, then the worked price on its own stage with a half-circle band dial, then three paper cards on how the chain enforces it.
- **Hours.** A paper sheet with a live 24-hour UTC ribbon, the three regimes, weekend pricing and the halt conditions.
- **Routing.** The vault lane and the RFQ lane as overlapping circles with the router where they meet.
- **Why not a normal pool, Chain, Pledges, FAQ.** Torn-ticket comparison rows, a chain datasheet, a sideways deck of eight checkable pledges and an accordion of questions.
- **Closing** and a light footer on the pastel field.

Links to X, GitHub, email and an optional `$ZIRPLUS` token address come from `NEXT_PUBLIC_*` variables (see `.env.example`); anything left empty is hidden.

## The platform

The app lives under `/platform`, inside one floating stage (`src/components/platform/PlatformShell.tsx`): the mark, a centred pill of destinations, the live session and your account across the top. On phones the destinations move to a dock pinned to the bottom of the screen.

| Page | What it shows |
| --- | --- |
| Overview | KPIs, the session dial, every market as a tile (a tile opens that market in Swap), volume by hour, where the TVL sits and the latest fills |
| Swap | A market rail, the ticket and a receipt-style breakdown. `/platform/swap?market=AAPLx` opens with that market selected |
| Vaults | Each vault as a card with an inventory ring against the 50% target, the TVL split, and what LPs earn, risk and never risk |
| Portfolio | A wallet card with role chips, your fills and attestations; holdings and vault shares once the indexer is connected (sign-in required) |
| Explorer | Cost over mid per fill, the fills table with side and lane filters, parameters as spec cards and the governance log |
| Account | Your private profile and your eligibility attestations (sign-in required) |

### How the platform works

- **Pricing.** Prices on the swap ticket, the market list and the explorer all come from the AnchorVault formula in `src/lib/platform/markets.ts`: a guarded mid, the tier half-spread multiplied by the session multiplier, a signed inventory skew and an itemised fee. The trading regime comes from the live US-equity clock, so spreads widen and clips shrink outside the regular session, just as they do in the venue's contracts.
- **Venue data.** `useVenue()` in `src/components/platform/usePlatformData.ts` reads markets, prices, vault snapshots, fills and the governance log from the Supabase read model. Markets come from the `markets` table (`supabase/seed.sql`). Until the indexer writes price rows, each mid is read live from that market's Chainlink feed on Robinhood Chain, while TVL, inventory and fills stay empty, and the pages say which source they are showing. There is no sample data: if Supabase is unreachable, the pages show the error. Every chart is drawn from these rows.
- **Reads.** Anyone can read public content without an account. Reads of profiles and attestations are scoped to each user.
- **Writes and private reads** (profile, attestations) go to `POST /api/platform/db` together with the user's Privy access token. That route checks the token, validates the arguments against `src/lib/platform/ops.ts`, and then executes the operation through a service-role Supabase client, which passes the verified user id in an `x-zirplus-actor` header (renamed from the old brand; update `app_user_id()` in your Supabase schema to read this header name). The `app_user_id()` database function accepts that header only on requests made with the service role.
- **Settlement.** Swaps are settled on-chain via the SwapRouter, and `contracts/` holds the contracts along with their deployment records.
- **Eligibility.** A role attestation (`TRADER`, `LP`, `MAKER`, `RELAYER`) is needed to trade, to provide liquidity and to make markets. Each one appears in Settings, and the EligibilityRegistry enforces it on-chain.

## Design system

Charcoal stages on a pastel field, lit by a mint-to-rose gradient. Everything is defined in `src/app/globals.css`.

- **Colour.** Tokens are prefixed `zp-`: `ink`, `stage`, `card` and `raised` for surfaces; `fg` to `fg-4` for text; `mint`, `peach`, `rose`, `butter` and `lilac` as light; `up`, `down` and `warn` for values and status; `paper` and `paper-ink` for light sheets on the field; `line` and `line-strong` for hairlines. The gradient itself is `var(--pastel)`.
- **Type.** Prompt (light) for display, Outfit for body copy, IBM Plex Mono for kickers, addresses and timestamps. All self-hosted through `@fontsource`, so builds need no network.
- **Classes.** `stage`, `frame`, `inner`, `paper`, `card`, `btn` (`btn-solid`, `btn-quiet`, `btn-ink`), `plus-btn`, `pastel-text`, `pastel-border`, `chip`, `field`, `seg`, `lbl`, `eyebrow`, plus motion helpers (`float`, `spin-slow`).
- **Platform components.** `src/components/platform/ui.tsx` holds the building blocks (Sheet, PageHead, StatCard, Ring, Table, Segmented, Meter, BarList, BarChart, SplitBar and more). `TokenLogo.tsx` draws the issuer mark for each market.
- **Illustrations.** `src/components/art/Orbit.tsx` has the orbit, cloud, planet, paper plane, coin, leaf, sparkle and candle symbols, all inline SVG.

## Project layout

```
src/app/                 routes: homepage, /platform pages, /api/platform/db, metadata and icons
src/components/home/     homepage sections
src/components/platform/ platform shell, UI kit, data hooks and token logos
src/lib/platform/        pricing math, queries, formatting, chain and env config
public/                  app icons and the logo mark used by the Privy sign-in modal
supabase/                schema, seed data and setup guide
contracts/               Solidity contracts (Foundry), deploy scripts and deployment records
docs/                    public documentation (GitBook)
```

## Brand assets

- `src/app/icon.svg` is the master app icon; `public/icon-192.png`, `public/icon-512.png`, `src/app/apple-icon.png` and `favicon.ico` are rendered from it. `public/logo-mark.png` is the bare mark shown in the Privy sign-in modal, and `src/app/opengraph-image.png` is the share card.
- The mark and wordmark are drawn inline in `src/components/Logo.tsx`.
- Company logos in the platform come from [Simple Icons](https://simpleicons.org) (CC0).

## Related

- Documentation: [`docs/`](docs/README.md)
- Contracts: [`contracts/`](contracts/README.md)
