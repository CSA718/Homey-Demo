// Open Renovation Check listings — a real, shared Postgres table (see
// supabase/schema.sql) so a job a homeowner posts is visible to every
// matched contractor's dashboard, across any device.

import type { HomeAge, RenovationEstimate, RenovationScopeItem } from "./renovation";
import { supabase } from "./supabaseClient";

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

interface ListingRow {
  id: string;
  consumer_account_id: string;
  consumer_name: string;
  consumer_email: string;
  consumer_phone: string;
  state: string;
  home_age: HomeAge;
  budget: number;
  scope: RenovationScopeItem[];
  estimate: RenovationEstimate;
  created_at: string;
}

function fromRow(row: ListingRow): RenovationListing {
  return {
    id: row.id,
    consumerAccountId: row.consumer_account_id,
    consumerName: row.consumer_name,
    consumerEmail: row.consumer_email,
    consumerPhone: row.consumer_phone,
    state: row.state,
    homeAge: row.home_age,
    budget: row.budget,
    scope: row.scope,
    estimate: row.estimate,
    createdAt: row.created_at,
  };
}

export async function createListing(
  input: Omit<RenovationListing, "id" | "createdAt">,
): Promise<RenovationListing> {
  const { data, error } = await supabase
    .from("renovation_listings")
    .insert({
      consumer_account_id: input.consumerAccountId,
      consumer_name: input.consumerName,
      consumer_email: input.consumerEmail,
      consumer_phone: input.consumerPhone,
      state: input.state,
      home_age: input.homeAge,
      budget: input.budget,
      scope: input.scope,
      estimate: input.estimate,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to post listing");
  return fromRow(data as ListingRow);
}

export async function getListing(id: string): Promise<RenovationListing | null> {
  const { data, error } = await supabase.from("renovation_listings").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return fromRow(data as ListingRow);
}

export async function getListingsForConsumer(accountId: string): Promise<RenovationListing[]> {
  const { data, error } = await supabase
    .from("renovation_listings")
    .select("*")
    .eq("consumer_account_id", accountId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ListingRow[]).map(fromRow);
}

// Admin-only: every listing across every state.
export async function listAllListings(): Promise<RenovationListing[]> {
  const { data, error } = await supabase
    .from("renovation_listings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ListingRow[]).map(fromRow);
}

// Contractors see open jobs posted in their own service state — a jobs
// board is only useful if it's local, so unlike the builder directory this
// doesn't backfill with other states.
export async function getListingsForState(state: string): Promise<RenovationListing[]> {
  const { data, error } = await supabase
    .from("renovation_listings")
    .select("*")
    .eq("state", state)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ListingRow[]).map(fromRow);
}
