// Contractor bids — a real, shared Postgres table (see supabase/schema.sql)
// so a bid a builder submits is visible to whichever buyer or homeowner
// posted the job, and vice versa, across any device. Covers both target
// types: a Lot Check report a buyer connected with builders on, and an
// open Renovation Check listing.

import { supabase } from "./supabaseClient";

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
  accepted: boolean;
}

interface BidRow {
  id: string;
  target_type: BidTargetType;
  target_id: string;
  builder_account_id: string;
  builder_name: string;
  price_low: number;
  price_high: number;
  estimated_weeks: number;
  message: string;
  submitted_at: string;
  accepted: boolean;
}

function fromRow(row: BidRow): Bid {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    builderAccountId: row.builder_account_id,
    builderName: row.builder_name,
    priceLow: row.price_low,
    priceHigh: row.price_high,
    estimatedWeeks: row.estimated_weeks,
    message: row.message,
    submittedAt: row.submitted_at,
    accepted: row.accepted,
  };
}

export async function submitBid(
  input: Omit<Bid, "id" | "submittedAt" | "accepted">,
): Promise<Bid> {
  const { data, error } = await supabase
    .from("bids")
    .upsert(
      {
        target_type: input.targetType,
        target_id: input.targetId,
        builder_account_id: input.builderAccountId,
        builder_name: input.builderName,
        price_low: input.priceLow,
        price_high: input.priceHigh,
        estimated_weeks: input.estimatedWeeks,
        message: input.message,
      },
      { onConflict: "target_type,target_id,builder_account_id" },
    )
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to submit bid");
  return fromRow(data as BidRow);
}

export async function getBidsFor(targetType: BidTargetType, targetId: string): Promise<Bid[]> {
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("price_low", { ascending: true });
  if (error || !data) return [];
  return (data as BidRow[]).map(fromRow);
}

// Every bid across a batch of targets at once (e.g. every listing on a
// builder's jobs board) — one query instead of one per row.
export async function getBidsForTargets(targetType: BidTargetType, targetIds: string[]): Promise<Bid[]> {
  if (targetIds.length === 0) return [];
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .eq("target_type", targetType)
    .in("target_id", targetIds);
  if (error || !data) return [];
  return (data as BidRow[]).map(fromRow);
}

export async function getBidByBuilder(
  targetType: BidTargetType,
  targetId: string,
  builderAccountId: string,
): Promise<Bid | null> {
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("builder_account_id", builderAccountId)
    .maybeSingle();
  if (error || !data) return null;
  return fromRow(data as BidRow);
}

// Bids a specific builder has placed, across every job — for a "your bids"
// view on the dashboard.
export async function getBidsByBuilder(builderAccountId: string): Promise<Bid[]> {
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .eq("builder_account_id", builderAccountId)
    .order("submitted_at", { ascending: false });
  if (error || !data) return [];
  return (data as BidRow[]).map(fromRow);
}

// Admin-only: every bid across every target.
export async function listAllBids(): Promise<Bid[]> {
  const { data, error } = await supabase.from("bids").select("*").order("submitted_at", { ascending: false });
  if (error || !data) return [];
  return (data as BidRow[]).map(fromRow);
}

export async function acceptBid(targetType: BidTargetType, targetId: string, bidId: string): Promise<void> {
  await supabase
    .from("bids")
    .update({ accepted: false })
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  await supabase.from("bids").update({ accepted: true }).eq("id", bidId);
}

export async function getAcceptedBidId(targetType: BidTargetType, targetId: string): Promise<string | null> {
  const { data } = await supabase
    .from("bids")
    .select("id")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("accepted", true)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}
