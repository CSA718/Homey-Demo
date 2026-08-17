// Open Renovation Check listings — a shared store (not scoped to one
// account), so a job a homeowner posts is visible to every matched
// contractor's dashboard, the same "shared localStorage as a fake backend"
// pattern used for builder accounts and bids.

import type { HomeAge, RenovationEstimate, RenovationScopeItem } from "./renovation";

export interface RenovationListing {
  id: string;
  consumerAccountId: string;
  consumerName: string;
  consumerEmail: string;
  consumerPhone: string;
  state: string;
  homeAge: HomeAge;
  budget: number;
  scope: RenovationScopeItem[];
  estimate: RenovationEstimate;
  createdAt: string;
}

const LISTINGS_KEY = "homey_reno_listings_v1";

function readAll(): RenovationListing[] {
  try {
    const raw = localStorage.getItem(LISTINGS_KEY);
    return raw ? (JSON.parse(raw) as RenovationListing[]) : [];
  } catch {
    return [];
  }
}

function writeAll(listings: RenovationListing[]) {
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

export function createListing(
  input: Omit<RenovationListing, "id" | "createdAt">,
): RenovationListing {
  const listing: RenovationListing = {
    ...input,
    id: Math.random().toString(36).slice(2, 10),
    createdAt: new Date().toISOString(),
  };
  writeAll([listing, ...readAll()]);
  return listing;
}

export function getListing(id: string): RenovationListing | null {
  return readAll().find((l) => l.id === id) ?? null;
}

export function getListingsForConsumer(accountId: string): RenovationListing[] {
  return readAll().filter((l) => l.consumerAccountId === accountId);
}

// Contractors see open jobs posted in their own service state — a jobs
// board is only useful if it's local, so unlike the builder directory this
// doesn't backfill with other states.
export function getListingsForState(state: string): RenovationListing[] {
  return readAll().filter((l) => l.state === state);
}
