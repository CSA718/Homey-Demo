// Builder directory for the buyer-facing "Connect with a Builder" step.
// Combines a handful of seeded sample builders (so the marketplace is
// never empty for a state with no coverage yet) with real member accounts
// signed up anywhere — so signing up as a builder and running a Lot Check
// in your own state actually shows your business in the match list, and
// connecting delivers a real lead to your dashboard, on any device.

import { getAllAccounts } from "./auth";

export interface DirectoryBuilder {
  id: string;
  businessName: string;
  state: string;
  tagline: string;
  isRealAccount: boolean;
}

interface SeedBuilder {
  id: string;
  businessName: string;
  state: string;
  tagline: string;
}

const SEED_BUILDERS: SeedBuilder[] = [
  { id: "seed-fearing-hill", businessName: "Fearing Hill Builders", state: "MA", tagline: "Semi-custom homes across Southeastern Massachusetts" },
  { id: "seed-lone-star", businessName: "Lone Star Custom Homes", state: "TX", tagline: "Austin-area new construction specialists" },
  { id: "seed-front-range", businessName: "Front Range Building Co.", state: "CO", tagline: "Custom homes in the Boulder–Denver corridor" },
  { id: "seed-blue-ridge", businessName: "Blue Ridge Home Builders", state: "NC", tagline: "Western North Carolina mountain and lake homes" },
  { id: "seed-gulf-coast", businessName: "Gulf Coast Construction Group", state: "FL", tagline: "Coastal Florida new-home builders" },
  { id: "seed-sonoma-valley", businessName: "Sonoma Valley Builders", state: "CA", tagline: "North Bay custom home construction" },
  { id: "seed-cumberland", businessName: "Cumberland Custom Homes", state: "TN", tagline: "Middle Tennessee semi-custom builds" },
  { id: "seed-cascade-ridge", businessName: "Cascade Ridge Builders", state: "WA", tagline: "Puget Sound area new construction" },
  { id: "seed-peachtree", businessName: "Peachtree Home Partners", state: "GA", tagline: "Metro Atlanta custom home builders" },
  { id: "seed-desert-bloom", businessName: "Desert Bloom Builders", state: "AZ", tagline: "Phoenix-area new construction" },
];

// Returns builders matched to a state — exact matches first, backfilled
// with other members if fewer than `minResults` are found in-state, so the
// list is never empty even for a state with no local coverage yet.
export async function getMatchedBuilders(state: string, minResults = 4): Promise<DirectoryBuilder[]> {
  const accounts = await getAllAccounts();
  const realAccounts: DirectoryBuilder[] = accounts.map((a) => ({
    id: a.id,
    businessName: a.businessName,
    state: a.state,
    tagline: "Homey member builder",
    isRealAccount: true,
  }));

  const seeded: DirectoryBuilder[] = SEED_BUILDERS.map((b) => ({
    ...b,
    isRealAccount: false,
  }));

  // Real accounts first (they're actually reachable), then seeded ones,
  // de-duplicated by state+name isn't necessary — different ids.
  const all = [...realAccounts, ...seeded];

  const inState = all.filter((b) => b.state === state);
  if (inState.length >= minResults) return inState;

  const outOfState = all.filter((b) => b.state !== state);
  return [...inState, ...outOfState.slice(0, minResults - inState.length)];
}
