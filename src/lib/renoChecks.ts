// Saved Renovation Check history, per consumer account — a real Postgres
// table (see supabase/schema.sql), synced across every device.

import type { HomeAge, RenovationEstimate, RenovationScopeItem } from "./renovation";
import { supabase } from "./supabaseClient";

export interface SavedRenovationCheck {
  id: string;
  accountId: string;
  submittedAt: string;
  state: string;
  homeAge: HomeAge;
  budget: number;
  scope: RenovationScopeItem[];
  estimate: RenovationEstimate;
}

interface CheckRow {
  id: string;
  account_id: string;
  submitted_at: string;
  state: string;
  home_age: HomeAge;
  budget: number;
  scope: RenovationScopeItem[];
  estimate: RenovationEstimate;
}

function fromRow(row: CheckRow): SavedRenovationCheck {
  return {
    id: row.id,
    accountId: row.account_id,
    submittedAt: row.submitted_at,
    state: row.state,
    homeAge: row.home_age,
    budget: row.budget,
    scope: row.scope,
    estimate: row.estimate,
  };
}

export async function getChecksForAccount(accountId: string): Promise<SavedRenovationCheck[]> {
  const { data, error } = await supabase
    .from("renovation_checks")
    .select("*")
    .eq("account_id", accountId)
    .order("submitted_at", { ascending: false });
  if (error || !data) return [];
  return (data as CheckRow[]).map(fromRow);
}

export async function getCheck(accountId: string, checkId: string): Promise<SavedRenovationCheck | null> {
  const { data, error } = await supabase
    .from("renovation_checks")
    .select("*")
    .eq("account_id", accountId)
    .eq("id", checkId)
    .maybeSingle();
  if (error || !data) return null;
  return fromRow(data as CheckRow);
}

// Admin-only: every Renovation Check across every account.
export async function listAllRenovationChecks(): Promise<SavedRenovationCheck[]> {
  const { data, error } = await supabase
    .from("renovation_checks")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error || !data) return [];
  return (data as CheckRow[]).map(fromRow);
}

export async function saveCheck(
  accountId: string,
  input: Omit<SavedRenovationCheck, "id" | "accountId" | "submittedAt">,
): Promise<SavedRenovationCheck> {
  const { data, error } = await supabase
    .from("renovation_checks")
    .insert({
      account_id: accountId,
      state: input.state,
      home_age: input.homeAge,
      budget: input.budget,
      scope: input.scope,
      estimate: input.estimate,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to save renovation check");
  return fromRow(data as CheckRow);
}
