// Renovation Check engine — estimates whether a stated budget realistically
// covers a described scope of renovation work, anywhere in the US, on a new
// or existing (used) home alike.
//
// National per-category cost ranges are grounded in 2026 industry cost
// guides (Angi, HomeAdvisor/Modernize, Fixr, This Old House, Zonda's Cost vs
// Value report, and related contractor-cost surveys) rather than invented.
// Those sources broadly agree on two things this engine leans on: (1) the
// national dollar ranges per category below, and (2) which states run
// consistently above or below the national average to build or renovate in
// — Hawaii, California, and the Northeast corridor at the top; Mississippi,
// Arkansas, Oklahoma, and Alabama at the bottom; a roughly 2.5x spread
// between them. Individual cost-guide sites disagree with each other on
// precise per-state dollar figures (they're SEO content, not a government
// index), so rather than presenting a false-precision number from any one
// of them, STATE_RENOVATION_COST_INDEX reuses this app's existing
// ZHVI-derived state economic ordering (see STATE_LAND_RATE_PER_ACRE in
// lotCheck.ts) as the relative ranking, compressed to match renovation's
// real, much narrower spread (national home value varies far more state to
// state than construction labor/materials do). This is a real, sourced
// estimate, not a lookup of your specific contractor's pricing.

export type RenovationUnit = "sqft" | "count" | "project";

export interface RenovationCategoryDef {
  key: string;
  label: string;
  unit: RenovationUnit;
  unitLabel: string;
  rateLow: number;
  rateHigh: number;
  helpText: string;
}

export const RENOVATION_CATEGORIES: RenovationCategoryDef[] = [
  {
    key: "kitchen",
    label: "Kitchen Remodel",
    unit: "project",
    unitLabel: "kitchen(s)",
    rateLow: 20000,
    rateHigh: 80000,
    helpText: "Minor refresh to full gut remodel with new cabinets, counters, appliances",
  },
  {
    key: "bathroom",
    label: "Bathroom Remodel",
    unit: "count",
    unitLabel: "bathroom(s)",
    rateLow: 9000,
    rateHigh: 30000,
    helpText: "Per bathroom, standard to upscale finishes",
  },
  {
    key: "addition",
    label: "Room Addition",
    unit: "sqft",
    unitLabel: "sq ft added",
    rateLow: 130,
    rateHigh: 300,
    helpText: "New square footage; higher end for plumbing or a second story",
  },
  {
    key: "basement",
    label: "Basement Finish",
    unit: "sqft",
    unitLabel: "sq ft",
    rateLow: 20,
    rateHigh: 75,
    helpText: "Unfinished to finished living space",
  },
  {
    key: "roof",
    label: "Roof Replacement",
    unit: "sqft",
    unitLabel: "sq ft of roof",
    rateLow: 5,
    rateHigh: 11,
    helpText: "Tear-off and replace; varies by material (shingle to metal/slate)",
  },
  {
    key: "deck",
    label: "Deck / Patio",
    unit: "sqft",
    unitLabel: "sq ft",
    rateLow: 35,
    rateHigh: 85,
    helpText: "Composite or wood decking, installed",
  },
  {
    key: "windows",
    label: "Windows & Exterior Doors",
    unit: "count",
    unitLabel: "window(s)/door(s)",
    rateLow: 500,
    rateHigh: 1500,
    helpText: "Per opening, installed",
  },
  {
    key: "flooring",
    label: "Flooring Replacement",
    unit: "sqft",
    unitLabel: "sq ft",
    rateLow: 4,
    rateHigh: 18,
    helpText: "Laminate/vinyl to hardwood or tile, installed",
  },
  {
    key: "siding",
    label: "Siding / Exterior",
    unit: "sqft",
    unitLabel: "sq ft",
    rateLow: 4,
    rateHigh: 13,
    helpText: "Vinyl to fiber cement, installed",
  },
  {
    key: "hvac",
    label: "HVAC System Replacement",
    unit: "project",
    unitLabel: "system(s)",
    rateLow: 8000,
    rateHigh: 22000,
    helpText: "Furnace + central air or heat pump, full replacement",
  },
  {
    key: "electrical",
    label: "Electrical Panel / Rewire",
    unit: "project",
    unitLabel: "project(s)",
    rateLow: 1500,
    rateHigh: 8000,
    helpText: "Panel upgrade alone to a fuller rewire",
  },
  {
    key: "fireplace",
    label: "Fireplace (New or Replacement)",
    unit: "project",
    unitLabel: "fireplace(s)",
    rateLow: 3000,
    rateHigh: 12000,
    helpText: "Gas insert on the low end, wood-burning masonry on the high end",
  },
  {
    key: "painting",
    label: "Interior Painting (Whole Home)",
    unit: "sqft",
    unitLabel: "sq ft of home",
    rateLow: 2,
    rateHigh: 6,
    helpText: "Walls, trim, and ceilings",
  },
  {
    key: "whole-home",
    label: "Whole-Home Interior Renovation",
    unit: "sqft",
    unitLabel: "sq ft of home",
    rateLow: 100,
    rateHigh: 200,
    helpText: "Broad gut-and-rebuild of the interior, all systems and finishes",
  },
];

export type HomeAge = "new" | "recent" | "older" | "historic";

export const HOME_AGE_OPTIONS: { value: HomeAge; label: string; contingencyPercent: number }[] = [
  { value: "new", label: "Built in the last 10 years", contingencyPercent: 5 },
  { value: "recent", label: "10–30 years old", contingencyPercent: 8 },
  { value: "older", label: "30–60 years old", contingencyPercent: 14 },
  { value: "historic", label: "60+ years old", contingencyPercent: 22 },
];

// State cost-of-renovation index (1.00 = national average). Derived from
// this app's existing state economic ordering, compressed to a ~0.68–1.65x
// range — the real spread multiple independent 2026 state construction-cost
// surveys converge on, even where they disagree on exact dollars. See file
// header for full methodology.
export const STATE_RENOVATION_COST_INDEX: Record<string, number> = {
  HI: 1.65, CA: 1.6, MA: 1.45, DC: 1.44, WA: 1.42, NY: 1.41, NJ: 1.41,
  CO: 1.39, OR: 1.32, UT: 1.31, RI: 1.28, NH: 1.28, ID: 1.27, MT: 1.27,
  NV: 1.25, AZ: 1.24, CT: 1.23, MD: 1.23, VA: 1.22, FL: 1.17, VT: 1.17,
  ME: 1.17, DE: 1.17, NC: 1.12, MN: 1.12, TN: 1.12, AK: 1.12, GA: 1.11,
  SC: 1.09, WY: 1.09, TX: 1.07, WI: 1.07, IL: 1.04, PA: 1.03, SD: 1.03,
  NM: 1.0, ND: 1.0, MI: 0.99, MO: 0.97, NE: 0.97, OH: 0.95, IN: 0.95,
  KY: 0.95, AL: 0.95, OK: 0.93, IA: 0.93, KS: 0.93, LA: 0.9, WV: 0.82,
  AR: 0.78, MS: 0.68,
};

export interface RenovationScopeItem {
  categoryKey: string;
  quantity: number;
}

export interface RenovationScopeLine {
  category: RenovationCategoryDef;
  quantity: number;
  costLow: number;
  costHigh: number;
}

export type RenovationFitStatus = "comfortable" | "tight" | "short";

export interface RenovationEstimate {
  state: string;
  stateIndex: number;
  homeAge: HomeAge;
  contingencyPercent: number;
  budget: number;
  lines: RenovationScopeLine[];
  subtotalLow: number;
  subtotalHigh: number;
  totalLow: number;
  totalHigh: number;
  status: RenovationFitStatus;
  statusLabel: string;
  likelihood: number;
  gap: number;
}

export function computeRenovationEstimate(
  budget: number,
  state: string,
  homeAge: HomeAge,
  scope: RenovationScopeItem[],
): RenovationEstimate {
  const stateIndex = STATE_RENOVATION_COST_INDEX[state] ?? 1.0;
  const ageDef = HOME_AGE_OPTIONS.find((a) => a.value === homeAge) ?? HOME_AGE_OPTIONS[1];
  const contingencyPercent = ageDef.contingencyPercent;

  const lines: RenovationScopeLine[] = scope
    .filter((s) => s.quantity > 0)
    .map((s) => {
      const category = RENOVATION_CATEGORIES.find((c) => c.key === s.categoryKey)!;
      const costLow = category.rateLow * s.quantity * stateIndex;
      const costHigh = category.rateHigh * s.quantity * stateIndex;
      return { category, quantity: s.quantity, costLow, costHigh };
    });

  const subtotalLow = lines.reduce((sum, l) => sum + l.costLow, 0);
  const subtotalHigh = lines.reduce((sum, l) => sum + l.costHigh, 0);
  const totalLow = subtotalLow * (1 + contingencyPercent / 100);
  const totalHigh = subtotalHigh * (1 + contingencyPercent / 100);

  let status: RenovationFitStatus;
  let statusLabel: string;
  if (budget >= totalHigh) {
    status = "comfortable";
    statusLabel = "Comfortably Within Budget";
  } else if (budget >= totalLow) {
    status = "tight";
    statusLabel = "Tight — Within Range, Little Cushion";
  } else {
    status = "short";
    statusLabel = "Likely Short of Budget";
  }

  let likelihood: number;
  if (totalHigh === totalLow) {
    likelihood = budget >= totalHigh ? 90 : 10;
  } else {
    const t = (budget - totalLow) / (totalHigh - totalLow);
    likelihood = 10 + t * 80;
  }
  likelihood = Math.round(Math.max(3, Math.min(97, likelihood)));

  const gap = budget - totalHigh;

  return {
    state,
    stateIndex,
    homeAge,
    contingencyPercent,
    budget,
    lines,
    subtotalLow,
    subtotalHigh,
    totalLow,
    totalHigh,
    status,
    statusLabel,
    likelihood,
    gap,
  };
}
