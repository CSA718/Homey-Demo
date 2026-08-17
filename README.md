# Homey — Home Building Made Easy

A demo of Homey: a lot-buildability screening service for buyers and
builders anywhere in the U.S. Buyers get a **Lot Check** ($25, 48-hour
turnaround) that screens a parcel against wetlands, watershed/wastewater
sensitivity, flood zone, soil drainage, zoning/setbacks, priority habitat,
and wellhead protection, and computes a **Budget Fit**: the buyer's stated
budget compared against the lot's estimated land value, a realistic
construction-cost estimate for their chosen size and build tier, and this
lot's own site-specific added costs — expressed as a likelihood the budget
covers the full cost to own the finished home. Right on that report, buyers
can **connect with a member builder** serving their state — one click sends
their contact info, report, and budget fit into that builder's real
dashboard. Builders get a flat **$499/mo membership** to route their own
unqualified inquiries to Homey *and* to be discoverable by buyers who found
Homey first, plus a dashboard for managing the leads that come back either
way — including their own line-item cost estimator that checks a builder's
real numbers against what the buyer can spend and finds the break-even
margin. Buyers can also add home specifications (bedrooms, bathrooms,
stories, garage, style, notes) and see an illustrative floor plan computed
from those actual inputs, right on the report.

Separately, **Renovation Check** ($25/mo, 7-day free trial) is for anyone
who already owns — or is buying as-is — a home, new or old. A homeowner
sets a budget and checks off a scope of work across 14 categories (kitchen,
bathroom, room addition, basement, roof, deck, windows/doors, flooring,
siding, HVAC, electrical, fireplace, painting, whole-home renovation), and
gets back a likelihood their budget covers it, scaled by their state's
renovation cost index and a contingency for the home's age. It's a
separate membership from Lot Check/builder membership, with its own
consumer accounts, trial/subscription state, and saved check history.

Both sides now support **contractor bidding**. A homeowner can post their
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
- **Payments are fully mocked.** Checkout has a Stripe-style card form, but
  no backend, no real charge, and no data leaves the browser.
  (`src/pages/Checkout.tsx`)
- **Builder accounts are local demo accounts.** Signup/login/leads all live
  in `localStorage` — no server, no database. Data persists across reloads
  in the same browser but resets if storage is cleared.
  (`src/lib/auth.ts`, `src/lib/leads.ts`)
- **The builder marketplace is real accounts plus seed data, and connections
  are real.** The "Connect with a Builder" step on the report page matches
  against builders who actually signed up in this browser (via
  `/checkout?type=membership`, which now collects a service-area state)
  merged with ~10 seeded sample builders spread across common states, so the
  list is never empty. Clicking Connect on a real account writes an actual
  lead into that builder's dashboard via `addConnectionLead` — sign up as a
  builder in a state, then run a Lot Check in that state in the same
  browser, and you can watch your own new lead land in your dashboard.
  Connecting with a seed/sample builder just shows a confirmation, since
  there's no real account behind it to deliver to.
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
- **Renovation Check membership is a separate local demo account system
  from builder accounts**, with its own signup/login, a mocked 7-day trial
  → $25/mo subscription state (trialing/active/canceled, computed from a
  stored trial-end date — no real billing), and a saved history of every
  check run, all in `localStorage`. (`src/lib/renoAuth.ts`,
  `src/lib/renoChecks.ts`, `src/context/RenoAuthContext.tsx`)
- **Bids and renovation listings are real, shared, cross-account data** —
  the same "shared `localStorage` as a fake backend" pattern as builder
  accounts, so a bid one account (a builder) submits is immediately visible
  to the other account (a buyer or homeowner) in the same browser, even
  though they're different logins. A Renovation Check listing is posted
  once and is visible to every matched contractor in that state, who each
  submit their own bid; a Lot Check report can likewise collect bids from
  every builder the buyer connected with. Buyers have no login for Lot
  Check, so bids are looked up by the report's deterministic id (same
  address always produces the same report and the same id) — bookmarking
  the report URL is what lets a buyer check back for bids.
  (`src/lib/bids.ts`, `src/lib/renovationListings.ts`,
  `src/components/BidForm.tsx`, `src/components/BidList.tsx`)

## Pages

- `/` — landing page, problem framing, both audiences
- `/lot-check` — address/city/state intake form, any US state
- `/checkout` — mocked payment (shared by Lot Check and builder membership)
- `/report` — the generated screening report, with a live geocode + FEMA
  flood-zone lookup and a staged "scanning" animation
- `/builders` — flat $499/mo membership pricing, an interactive ROI
  calculator
- `/builder-login` — login for existing builder demo accounts
- `/dashboard` — protected: a builder's referred leads (seeded across
  multiple states), pipeline stats, and status tracking
- `/dashboard/leads/:leadId` — protected: a single lead's contact info,
  full Lot Check report, and the builder's bid + everyone else's bids on it
- `/dashboard/renovation-jobs/:listingId` — protected: an open renovation
  listing matched to the builder's state, with a bid form
- `/how-it-works` — data sources, the automation + human-review pipeline,
  disclaimers
- `/renovate` — Renovation Check marketing page, $25/mo with a 7-day free
  trial
- `/renovate/login` — login for existing Renovation Check members
- `/renovate/check` — protected: budget + scope-of-work form and the
  resulting estimate
- `/renovate/dashboard` — protected: subscription status, trial countdown,
  and saved check history
- `/renovate/checks/:checkId` — protected: a single saved renovation
  estimate
- `/renovate/listings/:listingId` — protected: a posted listing and the
  bids contractors have submitted on it, with an accept action

## Stack

Vite + React + TypeScript + Tailwind CSS v4 + React Router. No backend.

## Running locally

```bash
npm install
npm run dev
```

Build for production with `npm run build`.
