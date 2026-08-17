// Saved Lot Check history, per consumer account — mirrors renoChecks.ts.
// Stores the full report + budget fit snapshot (like leads.ts does for
// builders) so a saved entry renders instantly without re-running the
// geocode/FEMA lookup.

import type { LotCheckReport } from "./lotCheck";
import type { BudgetFit } from "./budgetFit";
import { storage } from "./storage";

export interface SavedLotCheck {
  id: string;
  accountId: string;
  submittedAt: string;
  reportParams: string; // full query string, so "view" can relink to /report
  report: LotCheckReport;
  budgetFit: BudgetFit | null;
}

const HISTORY_KEY_PREFIX = "homey_lotcheck_history_v1_";

function storageKey(accountId: string) {
  return `${HISTORY_KEY_PREFIX}${accountId}`;
}

export function getLotChecksForAccount(accountId: string): SavedLotCheck[] {
  try {
    const raw = storage.getItem(storageKey(accountId));
    return raw ? (JSON.parse(raw) as SavedLotCheck[]) : [];
  } catch {
    return [];
  }
}

// Upserts by report.id, so revisiting the same address doesn't duplicate
// the history entry.
export function saveLotCheck(
  accountId: string,
  input: Omit<SavedLotCheck, "id" | "accountId" | "submittedAt">,
): SavedLotCheck {
  const existing = getLotChecksForAccount(accountId);
  const dup = existing.find((c) => c.report.id === input.report.id);
  const entry: SavedLotCheck = {
    id: dup?.id ?? Math.random().toString(36).slice(2, 10),
    accountId,
    submittedAt: dup?.submittedAt ?? new Date().toISOString(),
    ...input,
  };
  const rest = existing.filter((c) => c.report.id !== input.report.id);
  storage.setItem(storageKey(accountId), JSON.stringify([entry, ...rest]));
  return entry;
}
