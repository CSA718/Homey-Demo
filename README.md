# Homey — Home Building Made Easy

A demo of Homey: a lot-buildability screening service for Southeastern
Massachusetts. Buyers get a **Lot Check** ($25, 48-hour turnaround) that
screens a parcel against wetlands, nitrogen-sensitive/septic triggers, flood
zone, soil drainage, zoning/setbacks, priority habitat, and wellhead
protection, and computes a **Budget Fit**: the buyer's stated budget compared
against the lot's estimated land value, a realistic construction-cost
estimate for their chosen size and build tier, and this lot's own
site-specific added costs — expressed as a likelihood the budget covers the
full cost to own the finished home. Builders get a flat **$499/mo
membership** to route unqualified inquiries to Homey instead of burning
estimator hours on them, plus a dashboard for managing the leads that come
back — each with the same budget-fit read the buyer saw.

## What's real vs. simulated

- **Flood zone data is live.** The Lot Check flow geocodes the address via
  the US Census Bureau's public geocoder, then queries FEMA's National Flood
  Hazard Layer (ArcGIS REST) for that point. If either call fails — network,
  timeout, or the service being unreachable — it falls back to the same
  modeled engine as the other categories, so the report never breaks.
  (`src/lib/geocode.ts`, `src/lib/gis/femaFlood.ts`)
- **The other six categories are modeled**, not looked up: wetlands,
  nitrogen-sensitive area, soils, zoning, priority habitat, and wellhead
  protection don't have a single reliable statewide public API, so they run
  on a deterministic seeded engine (same address always produces the same
  findings). (`src/lib/lotCheck.ts`)
- **Payments are fully mocked.** Checkout has a Stripe-style card form, but
  no backend, no real charge, and no data leaves the browser.
  (`src/pages/Checkout.tsx`)
- **Builder accounts are local demo accounts.** Signup/login/leads all live
  in `localStorage` — no server, no database. Data persists across reloads
  in the same browser but resets if storage is cleared.
  (`src/lib/auth.ts`, `src/lib/leads.ts`)
- **Budget Fit is a real, deterministic calculation** — not looked up, but
  not hardcoded either. It sums a modeled land value (town + acreage-based
  per-acre rate), the buyer's desired square footage times a per-tier
  construction-cost rate, and the lot's own estimated site-specific costs
  from the screening above, then compares that total range against the
  buyer's stated budget. Land value is modeled, not a lookup of this
  specific parcel's actual price — no free public source exists for that.
  (`src/lib/budgetFit.ts`, land modeling in `src/lib/lotCheck.ts`)

## Pages

- `/` — landing page, problem framing, both audiences
- `/lot-check` — address/town intake form
- `/checkout` — mocked payment (shared by Lot Check and builder membership)
- `/report` — the generated screening report, with a live geocode + FEMA
  flood-zone lookup and a staged "scanning" animation
- `/builders` — flat $499/mo membership pricing, an interactive ROI
  calculator
- `/builder-login` — login for existing builder demo accounts
- `/dashboard` — protected: a builder's referred leads, pipeline stats, and
  status tracking
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
