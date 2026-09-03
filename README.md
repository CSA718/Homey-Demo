# Homey — Home Building Made Easy

Homey: a home-building and home-renovation service for buyers,
homeowners, and builders anywhere in the U.S., running on a real backend
with real accounts — the only thing not real is payment processing.

- **Lot Check is free, unlimited, no account required.** Screens a parcel
  against wetlands, watershed/wastewater sensitivity, flood zone, soil
  drainage, zoning/setbacks, priority habitat, and wellhead protection,
  and computes a **Budget Fit**: the buyer's stated budget compared
  against the lot's estimated land value, a realistic construction-cost
  estimate for their chosen size and build tier, and this lot's own
  site-specific added costs — expressed as a likelihood the budget covers
  the full cost to own the finished home. Buyers can also add home
  specifications (bedrooms, bathrooms, stories, garage, style, notes) and
  see an illustrative floor plan computed from those actual inputs, right
  on the report.
- **Renovation Check** is a **Homey Membership** ($25/mo, 7-day free
  trial) — for a home a member already owns, or is buying as-is, new or
  old. It sets a budget and checks off a scope of work across 14
  categories (kitchen, bathroom, room addition, basement, roof, deck,
  windows/doors, flooring, siding, HVAC, electrical, fireplace, painting,
  whole-home renovation), and gets back a likelihood the budget covers it,
  scaled by the state's renovation cost index and a contingency for the
  home's age.

A first-time visitor can run a Lot Check immediately — no signup, no
account, nothing. Being logged in (i.e. a Homey Member) additionally
saves every Lot Check to your account history and unlocks connecting
with member builders and posting jobs for contractor bids, alongside
Renovation Check itself. The account dashboard (`/account`) shows saved
history for both tools together, plus subscription status.

On the builder side, a flat **$499/mo membership** lets builders route
their own unqualified inquiries to Homey *and* be discoverable by buyers
and homeowners who found Homey first, plus a dashboard for managing the
leads that come back either way — including their own line-item cost
estimator that checks a builder's real numbers against what the buyer can
spend and finds the break-even margin.

Both sides support **contractor bidding**. A homeowner can post their
Renovation Check as an open listing for member contractors serving their
state to bid on, and Lot Check buyers who connect with a builder can
likewise receive a formal bid back — a price range and timeline, not just
a callback. Builders see both kinds of jobs (Lot Check leads and open
renovation listings) from the same dashboard and bid on either.

## What's real vs. simulated

- **Flood zone data is live, nationwide.** The Lot Check flow geocodes the
  address via the US Census Bureau's public geocoder (covers the whole
  US), then queries FEMA's National Flood Hazard Layer (ArcGIS REST, also
  nationwide) for that point. If either call fails — network, timeout, or
  the service being unreachable — it falls back to the same modeled engine
  as the other categories, so the report never breaks.
  (`src/lib/geocode.ts`, `src/lib/gis/femaFlood.ts`)
- **The other six categories are modeled**, not looked up: wetlands,
  watershed/wastewater sensitivity, soils, zoning, priority habitat, and
  wellhead protection don't have a single API that covers every state and
  county, so they run on a deterministic seeded engine (same address always
  produces the same findings), with source labels genericized to what each
  category is actually administered by nationally (USACE/state wetlands
  programs, state environmental agencies, state Natural Heritage programs,
  etc). (`src/lib/lotCheck.ts`)
- **Payments are the one deliberately mocked piece.** Checkout has a
  Stripe-style card form, but no real payment processor is wired in — no
  card is validated or charged. Everything else about the account it
  creates (the login, the trial/membership state, the data it can see) is
  real. It handles two signup types: the builder's flat $499/mo
  membership, and the consumer's $25/mo Renovation Check trial. Lot Check
  itself never touches checkout — the form goes straight to the report,
  logged in or not. (`src/pages/Checkout.tsx`, `src/pages/LotCheck.tsx`)
- **Everything else runs on a real backend: Supabase (Postgres + Auth).**
  Builder accounts, consumer accounts, Lot Check history, Renovation Check
  history, renovation listings, bids, and connection leads all live in
  real database tables, gated by row-level security policies, not
  `localStorage`. Two people on two different devices genuinely see each
  other's activity — a builder's bid shows up on a buyer's phone the same
  way it shows up in this browser. Schema + policies:
  `supabase/schema.sql`. Client + account layer: `src/lib/supabaseClient.ts`,
  `src/lib/profile.ts`, `src/lib/auth.ts`, `src/lib/consumerAuth.ts`.
- **A master/admin account can see everything, on any account.** Any real
  account (consumer or builder) can be flagged `is_admin` in the database
  (one SQL statement, see `supabase/schema.sql`), which unlocks `/admin`:
  every account, every Lot Check, every Renovation Check, every listing,
  every bid, across every user — not just the ones in this browser.
  (`src/pages/Admin.tsx`, `src/lib/profile.ts`)
- **The builder marketplace is real accounts plus seed data, and
  connections are real.** The "Connect with a Builder" step on the report
  page matches against builders who actually signed up anywhere (via
  `/checkout?type=membership`, which collects a service-area state) merged
  with ~10 seeded sample builders spread across common states, so the list
  is never empty. Clicking Connect on a real account writes an actual lead
  into that builder's dashboard, in the real `connection_leads` table —
  sign up as a builder in a state, then run a Lot Check in that state from
  any device, and the lead shows up in that builder's dashboard wherever
  they're logged in. Connecting with a seed/sample builder just shows a
  confirmation, since there's no real account behind it to deliver to.
  (`src/lib/builderDirectory.ts`, `src/components/ConnectWithBuilders.tsx`)
- **Budget Fit is a real, deterministic calculation** — not looked up, but
  not hardcoded either. It sums a modeled land value (state + acreage-based
  per-acre rate), the buyer's desired square footage times a per-tier
  construction-cost rate, and the lot's own estimated site-specific costs
  from the screening above, then compares that total range against the
  buyer's stated budget. (`src/lib/budgetFit.ts`)
- **Land value per state is derived from real 2025-2026 market data, not
  invented.** There's no free public dataset of per-acre buildable-lot land
  values, so each state's rate is calculated from its typical home value
  (Zillow ZHVI, via Motley Fool / World Population Review reporting)
  relative to the ~$373,000 national figure, with an exponent that lets
  land value scale faster than home value in expensive/scarce markets and
  slower in cheap ones. States without a directly cited figure are
  estimated from regional economic similarity to ones that are. Two points
  are cross-checked against USDA NASS's 2025 farm real estate survey, which
  independently found Rhode Island the highest-value state for cropland per
  acre and New Mexico the lowest — both land in the same relative position
  here. Full methodology and the table are in `src/lib/lotCheck.ts`
  (`STATE_LAND_RATE_PER_ACRE`). This calibrates *relative* accuracy across
  states well; it is not a substitute for an appraisal of a specific parcel.
- **The builder's cost estimator is a real calculator, seeded but fully
  editable.** 16 line items (foundation, framing, HVAC, irrigation, permits,
  etc.) default to a starting split of the buyer's modeled construction
  estimate, but every number is the builder's own to change. It's saved per
  lead and checked against the buyer's *implied construction budget* (their
  stated budget minus estimated land value and site-specific costs) to
  compute a break-even markup percentage and a turnaround-time suggestion
  factoring in size, tier, and how many flags/cautions the screening found.
  (`src/lib/costEstimate.ts`, `src/components/BuilderEstimateTool.tsx`)
- **The floor plan is a real, computed layout — not a stock image.** There's
  no image/video generation model wired into this demo, so rather than
  faking a photorealistic render, the report computes an actual schematic
  floor plan from the buyer's entered bedroom count, bathroom count, square
  footage, stories, and garage size: rooms are sized and tiled to those
  numbers with a deterministic algorithm (same inputs always produce the
  same layout), split across floor tabs for multi-story homes, with an
  attached garage drawn to scale. It's still illustrative — room adjacency
  and proportions are approximated for concept purposes, not designed by an
  architect. (`src/lib/floorPlan.ts`, `src/components/FloorPlanPreview.tsx`)
- **Renovation Check's cost ranges are grounded in real 2026 cost-guide
  data, and its state index reuses this app's existing methodology.**
  Per-category national dollar ranges (kitchen $20k–$80k, bathroom
  $9k–$30k/bath, roof $5–$11/sq ft, HVAC $8k–$22k, etc.) come from 2026
  contractor-cost industry surveys (Angi, HomeAdvisor/Modernize, Fixr, This
  Old House, Zonda's Cost vs Value report). Those sources disagree with
  each other on precise per-state dollars — they're SEO content, not a
  government index — but agree on which states run consistently above or
  below the national average (Hawaii/California/Northeast highest,
  Mississippi/Arkansas/Oklahoma/Alabama lowest, ~2.5x spread). Rather than
  presenting a false-precision number from any one source,
  `STATE_RENOVATION_COST_INDEX` reuses this app's existing ZHVI-derived
  state economic ordering (the same one behind `STATE_LAND_RATE_PER_ACRE`),
  compressed to match that real, narrower spread. A contingency percentage
  (5–22%) is added based on the home's age bracket, since older homes more
  often turn up hidden costs once work starts. (`src/lib/renovation.ts`)
- **The consumer Homey Membership is one real account covering both
  tools**, separate from builder accounts since those are a different kind
  of member — but only Renovation Check actually requires it. Signup/login
  runs on Supabase Auth; a 7-day trial → $25/mo subscription state
  (trialing/active/canceled, computed from a stored trial-end date — still
  no real billing) and saved history for both Lot Checks and Renovation
  Checks live in Postgres under one account, visible from any device that
  account logs into. (`src/lib/consumerAuth.ts`,
  `src/lib/lotCheckHistory.ts`, `src/lib/renoChecks.ts`,
  `src/context/ConsumerAuthContext.tsx`)
- **Bids and renovation listings are real, shared, cross-account data**,
  enforced by row-level security rather than by trusting the browser — a
  bid a builder submits is visible to the buyer or homeowner who posted
  the job (and to any other builder who can already see that job), from
  wherever each of them is logged in. A Renovation Check listing is posted
  once and is visible to every matched contractor in that state, who each
  submit their own bid; a Lot Check report can likewise collect bids from
  every builder the buyer connected with — connecting itself still needs a
  Homey Membership login, since that's what a bid is tied to and how you
  find your way back to it. Anyone can still view and run a Lot Check
  itself with no account at all; they just won't see or receive bids on
  it. (`src/lib/bids.ts`, `src/lib/renovationListings.ts`,
  `src/components/BidForm.tsx`, `src/components/BidList.tsx`)

## Pages

- `/` — landing page, problem framing, three ways to use Homey
- `/lot-check` — address/city/state intake form, any US state — free, no
  account needed, goes straight to `/report` either way. Logged-in members
  additionally get the report saved to their account history.
- `/checkout` — mocked payment: the builder's $499/mo membership, or the
  consumer's $25/mo Renovation Check trial
- `/report` — the generated screening report, with a live geocode + FEMA
  flood-zone lookup, a staged "scanning" animation, and (for logged-in
  members) auto-saved into their account history
- `/builders` — flat $499/mo membership pricing, an interactive ROI
  calculator
- `/builder-login` — login for existing builder demo accounts
- `/dashboard` — protected: a builder's Lot Check leads and open
  Renovation Check jobs in tabs, pipeline stats, and status tracking
- `/dashboard/leads/:leadId` — protected: a single lead's contact info,
  full Lot Check report, and the builder's bid + everyone else's bids on it
- `/dashboard/renovation-jobs/:listingId` — protected: an open renovation
  listing matched to the builder's state, with a bid form
- `/how-it-works` — data sources, the automation + human-review pipeline,
  disclaimers
- `/renovate` — Renovation Check marketing page
- `/renovate/check` — protected: budget + scope-of-work form and the
  resulting estimate
- `/account/login` — login for existing Homey Members
- `/account` — protected: subscription status, trial countdown, and saved
  history for both Lot Checks and Renovation Checks
- `/account/lot-checks/:checkId` — protected: redirects into the matching
  `/report` URL
- `/account/renovation-checks/:checkId` — protected: a single saved
  renovation estimate
- `/account/listings/:listingId` — protected: a posted listing and the
  bids contractors have submitted on it, with an accept action
- `/admin` — protected, admin-only: every account and every piece of
  activity across the whole app, not just this browser

## Stack

Vite + React + TypeScript + Tailwind CSS v4 + React Router + Supabase
(Postgres + Auth).

## Backend setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run `supabase/schema.sql` — it creates every
   table, row-level security policy, and the trigger that turns a signup
   into a profile row.
3. In **Authentication → Providers → Email**, turn off "Confirm email" so
   signup grants an active session immediately (matches the rest of the
   app's instant-access UX). Leave it on if you'd rather have real email
   verification — the app handles that case too, it just won't log the
   new account straight in.
4. Copy the Project URL and anon public key from **Project Settings →
   API** into `.env.local` (see `.env.example`) — or pass them as
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at build time.
5. Sign up once on the live site (as either a consumer or a builder), then
   run this in the SQL Editor to make that account a master/admin account:
   ```sql
   update public.profiles set is_admin = true where email = 'you@example.com';
   ```

## Running locally

```bash
npm install
npm run dev
```

Build for production with `npm run build`.
