// Contractor bids — a single shared store (not scoped to one account) so a
// bid a builder submits is visible to whichever buyer or homeowner posted
// the job, and vice versa. Same "shared localStorage as a fake backend"
// pattern already used for builder accounts (getAllAccounts in auth.ts).
// Covers both target types: a Lot Check report a buyer connected with
// builders on, and an open Renovation Check listing.

import { storage } from "./storage";

export type BidTargetType = "lot-check" | "renovation";

export interface Bid {
  id: string;
  targetType: BidTargetType;
  targetId: string; // LotCheckReport.id or RenovationListing.id
  builderAccountId: string;
  builderName: string;
  priceLow: number;
  priceHigh: number;
  estimatedWeeks: number;
  message: string;
  submittedAt: string;
}

const BIDS_KEY = "homey_bids_v1";
const ACCEPTED_KEY = "homey_accepted_bids_v1";

function readBids(): Bid[] {
  try {
    const raw = storage.getItem(BIDS_KEY);
    return raw ? (JSON.parse(raw) as Bid[]) : [];
  } catch {
    return [];
  }
}

function writeBids(bids: Bid[]) {
  storage.setItem(BIDS_KEY, JSON.stringify(bids));
}

function readAccepted(): Record<string, string> {
  try {
    const raw = storage.getItem(ACCEPTED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function acceptedKey(targetType: BidTargetType, targetId: string) {
  return `${targetType}:${targetId}`;
}

export function submitBid(
  input: Omit<Bid, "id" | "submittedAt">,
): Bid {
  const bids = readBids();
  const existingIdx = bids.findIndex(
    (b) =>
      b.targetType === input.targetType &&
      b.targetId === input.targetId &&
      b.builderAccountId === input.builderAccountId,
  );
  const bid: Bid = {
    ...input,
    id: existingIdx >= 0 ? bids[existingIdx].id : Math.random().toString(36).slice(2, 10),
    submittedAt: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    bids[existingIdx] = bid;
  } else {
    bids.push(bid);
  }
  writeBids(bids);
  return bid;
}

export function getBidsFor(targetType: BidTargetType, targetId: string): Bid[] {
  return readBids()
    .filter((b) => b.targetType === targetType && b.targetId === targetId)
    .sort((a, b) => a.priceLow - b.priceLow);
}

export function getBidByBuilder(
  targetType: BidTargetType,
  targetId: string,
  builderAccountId: string,
): Bid | null {
  return (
    readBids().find(
      (b) =>
        b.targetType === targetType &&
        b.targetId === targetId &&
        b.builderAccountId === builderAccountId,
    ) ?? null
  );
}

// Bids a specific builder has placed, across every job — for a "your bids"
// view on the dashboard.
export function getBidsByBuilder(builderAccountId: string): Bid[] {
  return readBids()
    .filter((b) => b.builderAccountId === builderAccountId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export function acceptBid(targetType: BidTargetType, targetId: string, bidId: string) {
  const accepted = readAccepted();
  accepted[acceptedKey(targetType, targetId)] = bidId;
  storage.setItem(ACCEPTED_KEY, JSON.stringify(accepted));
}

export function getAcceptedBidId(targetType: BidTargetType, targetId: string): string | null {
  return readAccepted()[acceptedKey(targetType, targetId)] ?? null;
}
