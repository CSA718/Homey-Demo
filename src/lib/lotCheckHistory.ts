// Saved Lot Check history, per consumer account — a real Postgres table
// (see supabase/schema.sql), synced across every device. Stores the full
// report + budget fit snapshot so a saved entry renders instantly without
// re-running the geocode/FEMA lookup.

import type { LotCheckReport } from "./lotCheck";
import type { BudgetFit } from "./budgetFit";
import { supabase } from "./supabaseClient";

export interface SavedLotCheck {
  id: string;
  accountId: string;
  submittedAt: string;
  reportParams: string; // full query string, so "view" can relink to /report
  report: LotCheckReport;
  budgetFit: BudgetFit | null;
}

interface LotCheckRow {
  id: string;
  account_id: string;
  submitted_at: string;
  report_params: string;
  report: LotCheckReport;
  budget_fit: BudgetFit | null;
}

function fromRow(row: LotCheckRow): SavedLotCheck {
  return {
    id: row.id,
    accountId: row.account_id,
    submittedAt: row.submitted_at,
    reportParams: row.report_params,
    report: row.report,
    budgetFit: row.budget_fit,
  };
}

export async function getLotChecksForAccount(accountId: string): Promise<SavedLotCheck[]> {
  const { data, error } = await supabase
    .from("lot_checks")
    .select("*")
    .eq("account_id", accountId)
    .order("submitted_at", { ascending: false });
  if (error || !data) return [];
  return (data as LotCheckRow[]).map(fromRow);
}

export async function getLotCheck(accountId: string, checkId: string): Promise<SavedLotCheck | null> {
  const { data, error } = await supabase
    .from("lot_checks")
    .select("*")
    .eq("account_id", accountId)
    .eq("id", checkId)
    .maybeSingle();
  if (error || !data) return null;
  return fromRow(data as LotCheckRow);
}

// Admin-only: every Lot Check across every account. RLS only returns rows
// at all if the caller's own profile has is_admin = true.
export async function listAllLotChecks(): Promise<SavedLotCheck[]> {
  const { data, error } = await supabase.from("lot_checks").select("*").order("submitted_at", { ascending: false });
  if (error || !data) return [];
  return (data as LotCheckRow[]).map(fromRow);
}

// Upserts by report.id, so revisiting the same address doesn't duplicate
// the history entry.
export async function saveLotCheck(
  accountId: string,
  input: Omit<SavedLotCheck, "id" | "accountId" | "submittedAt">,
): Promise<SavedLotCheck> {
  const { data, error } = await supabase
    .from("lot_checks")
    .upsert(
      {
        account_id: accountId,
        report_id: input.report.id,
        report_params: input.reportParams,
        report: input.report,
        budget_fit: input.budgetFit,
      },
      { onConflict: "account_id,report_id" },
    )
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to save lot check");
  return fromRow(data as LotCheckRow);
}
