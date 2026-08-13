// Builder-side cost estimator. Unlike the buyer-facing Budget Fit (which
// models a cost range from square footage and tier), this is meant to be
// filled in by the builder with their own line-item numbers for a specific
// lead — then checked against what the buyer said they can spend, to find
// the markup the builder can actually charge and still land the job.

import type { BudgetFit } from "./budgetFit";

export interface CostLineItemDef {
  key: string;
  label: string;
  defaultPercent: number; // share of a typical construction budget, used only to seed a starting number
}

export const COST_LINE_ITEMS: CostLineItemDef[] = [
  { key: "site", label: "Site Work & Excavation", defaultPercent: 5 },
  { key: "foundation", label: "Foundation", defaultPercent: 10 },
  { key: "framing", label: "Framing", defaultPercent: 15 },
  { key: "roofing", label: "Roofing", defaultPercent: 6 },
  { key: "exterior", label: "Exterior Finishes & Siding", defaultPercent: 7 },
  { key: "windowsDoors", label: "Windows & Doors", defaultPercent: 6 },
  { key: "plumbing", label: "Plumbing", defaultPercent: 7 },
  { key: "electrical", label: "Electrical", defaultPercent: 6 },
  { key: "hvac", label: "HVAC", defaultPercent: 7 },
  { key: "insulationDrywall", label: "Insulation & Drywall", defaultPercent: 5 },
  { key: "interiorFinishes", label: "Interior Finishes & Trim", defaultPercent: 8 },
  { key: "cabinetryCounters", label: "Cabinetry & Countertops", defaultPercent: 6 },
  { key: "flooring", label: "Flooring", defaultPercent: 5 },
  { key: "irrigationLandscaping", label: "Irrigation & Landscaping", defaultPercent: 3 },
  { key: "permitsFees", label: "Permits & Fees", defaultPercent: 2 },
  { key: "contingency", label: "Contingency", defaultPercent: 2 },
];

export interface CostLineItem {
  key: string;
  label: string;
  amount: number;
}

export interface BuilderEstimate {
  lineItems: CostLineItem[];
  targetMarginPercent: number;
  turnaroundWeeks: number;
  updatedAt: string;
}

// Suggested starting point only — every number is editable. Seeded from the
// buyer's own Budget Fit so it's in the right neighborhood for this lead
// rather than generic.
export function buildDefaultEstimate(budgetFit: BudgetFit): BuilderEstimate {
  const baseConstructionMid = (budgetFit.baseCostLow + budgetFit.baseCostHigh) / 2;
  const lineItems: CostLineItem[] = COST_LINE_ITEMS.map((def) => ({
    key: def.key,
    label: def.label,
    amount: Math.round((baseConstructionMid * def.defaultPercent) / 100 / 100) * 100,
  }));
  return {
    lineItems,
    targetMarginPercent: 15,
    turnaroundWeeks: suggestTurnaroundWeeks(budgetFit),
    updatedAt: new Date().toISOString(),
  };
}

// Base timeline plus adjustments for size, finish level, and how much
// permitting/engineering risk the Lot Check screening turned up.
export function suggestTurnaroundWeeks(
  budgetFit: BudgetFit,
  flagCount = 0,
  cautionCount = 0,
): number {
  const tierWeeks: Record<string, number> = { standard: 0, custom: 2, "high-end": 5 };
  const base = 12 + budgetFit.sqft / 300 + (tierWeeks[budgetFit.tier] ?? 2) + flagCount * 3 + cautionCount * 0.5;
  return Math.round(base);
}

export interface EstimateSummary {
  totalCost: number;
  impliedConstructionBudget: number;
  requiredPrice: number;
  breakEvenMarginPercent: number;
  gap: number;
  status: "fits" | "tight" | "exceeds";
  statusLabel: string;
}

// impliedConstructionBudget = what's left of the buyer's stated budget after
// backing out the lot's estimated land value and the site-specific costs
// the screening already flagged — i.e., roughly what's actually available
// to pay a builder for construction.
export function computeEstimateSummary(
  estimate: BuilderEstimate,
  budgetFit: BudgetFit,
  siteCostLow: number,
  siteCostHigh: number,
): EstimateSummary {
  const totalCost = estimate.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const landMid = (budgetFit.landCostLow + budgetFit.landCostHigh) / 2;
  const siteMid = (siteCostLow + siteCostHigh) / 2;
  const impliedConstructionBudget = Math.max(0, budgetFit.budget - landMid - siteMid);

  const requiredPrice = totalCost * (1 + estimate.targetMarginPercent / 100);
  const gap = impliedConstructionBudget - requiredPrice;

  const breakEvenMarginPercent =
    totalCost > 0 ? ((impliedConstructionBudget - totalCost) / totalCost) * 100 : 0;

  let status: EstimateSummary["status"];
  let statusLabel: string;
  if (gap >= 0) {
    status = "fits";
    statusLabel = "Fits Buyer's Budget at This Margin";
  } else if (breakEvenMarginPercent >= 0) {
    status = "tight";
    statusLabel = "Tight — Lower Your Margin to Fit";
  } else {
    status = "exceeds";
    statusLabel = "Exceeds Budget Even at Cost";
  }

  return {
    totalCost,
    impliedConstructionBudget,
    requiredPrice,
    breakEvenMarginPercent,
    gap,
    status,
    statusLabel,
  };
}
