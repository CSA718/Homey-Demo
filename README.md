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
way.

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
- `/dashboard/leads/:leadId` — protected: a single lead's contact info and
  full Lot Check report
- `/how-it-works` — data sources, the automation + human-review pipeline,
  disclaimers

## Stack

Vite + React + TypeScript + Tailwind CSS v4 + React Router. No backend.

## Running locally

```bash
npm install
npm run dev
```

Build for production with `npm run build`.
