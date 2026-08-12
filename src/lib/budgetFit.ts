// Budget Fit: compares a buyer's stated budget against a realistic estimated
// build cost — a regional per-square-foot construction range for their
// chosen tier, plus this specific lot's site-specific added costs (from the
// Lot Check report's flagged/cautioned categories). Land purchase price is
// not included; this is a construction-cost estimate only.

export type BuildTier = "standard" | "custom" | "high-end";

export interface BuildTierDef {
  value: BuildTier;
  label: string;
  rateLow: number;
  rateHigh: number;
  description: string;
}

export const BUILD_TIERS: BuildTierDef[] = [
  {
    value: "standard",
    label: "Standard",
    rateLow: 220,
    rateHigh: 260,
    description: "Production-style finishes, efficient layout",
  },
  {
    value: "custom",
    label: "Semi-Custom",
    rateLow: 260,
    rateHigh: 320,
    description: "Upgraded finishes, more design flexibility",
  },
  {
    value: "high-end",
    label: "High-End",
    rateLow: 320,
    rateHigh: 400,
    description: "Full custom design, premium finishes and systems",
  },
];

export type BudgetFitStatus = "comfortable" | "tight" | "short";

export interface BudgetFit {
  budget: number;
  sqft: number;
  tier: BuildTier;
  baseCostLow: number;
  baseCostHigh: number;
  totalCostLow: number;
  totalCostHigh: number;
  status: BudgetFitStatus;
  statusLabel: string;
  likelihood: number; // 0-100, rough read of where budget sits vs. the estimated range
  gap: number; // budget minus the high end of the estimated range; negative = shortfall
}

export function computeBudgetFit(
  budget: number,
  sqft: number,
  tier: BuildTier,
  siteCostLow: number,
  siteCostHigh: number,
): BudgetFit {
  const tierDef = BUILD_TIERS.find((t) => t.value === tier) ?? BUILD_TIERS[1];
  const baseCostLow = sqft * tierDef.rateLow;
  const baseCostHigh = sqft * tierDef.rateHigh;
  const totalCostLow = baseCostLow + siteCostLow;
  const totalCostHigh = baseCostHigh + siteCostHigh;

  let status: BudgetFitStatus;
  let statusLabel: string;
  if (budget >= totalCostHigh) {
    status = "comfortable";
    statusLabel = "Comfortably Within Budget";
  } else if (budget >= totalCostLow) {
    status = "tight";
    statusLabel = "Tight — Within Range, Little Cushion";
  } else {
    status = "short";
    statusLabel = "Likely Short of Budget";
  }

  // Map the budget's position within [totalCostLow, totalCostHigh] onto a
  // 10-90 scale (so it never claims false certainty at the edges), letting
  // it extend past 90 or below 10 for budgets well outside the range.
  let likelihood: number;
  if (totalCostHigh === totalCostLow) {
    likelihood = budget >= totalCostHigh ? 90 : 10;
  } else {
    const t = (budget - totalCostLow) / (totalCostHigh - totalCostLow);
    likelihood = 10 + t * 80;
  }
  likelihood = Math.round(Math.max(3, Math.min(97, likelihood)));

  const gap = budget - totalCostHigh;

  return {
    budget,
    sqft,
    tier,
    baseCostLow,
    baseCostHigh,
    totalCostLow,
    totalCostHigh,
    status,
    statusLabel,
    likelihood,
    gap,
  };
}
