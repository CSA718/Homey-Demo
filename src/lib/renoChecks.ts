// Saved Renovation Check history, per consumer account. Same pattern as
// leads.ts: no backend, everything lives in localStorage keyed by account id.

import type { HomeAge, RenovationEstimate, RenovationScopeItem } from "./renovation";

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

const CHECKS_KEY_PREFIX = "homey_reno_checks_v1_";

function storageKey(accountId: string) {
  return `${CHECKS_KEY_PREFIX}${accountId}`;
}

export function getChecksForAccount(accountId: string): SavedRenovationCheck[] {
  try {
    const raw = localStorage.getItem(storageKey(accountId));
    return raw ? (JSON.parse(raw) as SavedRenovationCheck[]) : [];
  } catch {
    return [];
  }
}

export function getCheck(accountId: string, checkId: string): SavedRenovationCheck | null {
  return getChecksForAccount(accountId).find((c) => c.id === checkId) ?? null;
}

export function saveCheck(
  accountId: string,
  input: Omit<SavedRenovationCheck, "id" | "accountId" | "submittedAt">,
): SavedRenovationCheck {
  const check: SavedRenovationCheck = {
    id: Math.random().toString(36).slice(2, 10),
    accountId,
    submittedAt: new Date().toISOString(),
    ...input,
  };
  const existing = getChecksForAccount(accountId);
  localStorage.setItem(storageKey(accountId), JSON.stringify([check, ...existing]));
  return check;
}
