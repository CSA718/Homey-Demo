// Lot Check engine.
//
// Wetlands, nitrogen-sensitive area, soils, zoning, priority habitat, and
// wellhead protection don't have a single reliable statewide public API, so
// those categories run on a deterministic mock (hashed seed -> seeded PRNG —
// same address always produces the same findings). Flood zone is real: the
// address is geocoded via the US Census Bureau's public geocoder and queried
// live against FEMA's National Flood Hazard Layer. If either call fails
// (network, timeout, or the service being unreachable), it falls back to the
// same modeled approach as the other categories — the report never breaks.

import { geocodeAddress } from "./geocode";
import { queryFemaFloodZone, classifyFemaZone } from "./gis/femaFlood";

export type RiskStatus = "clear" | "caution" | "flag";

export interface RiskCategory {
  key: string;
  label: string;
  source: string;
  status: RiskStatus;
  finding: string;
  costImpact: string | null;
  live: boolean;
}

export interface LotCheckReport {
  id: string;
  address: string;
  town: string;
  submittedAt: string;
  parcelAcreage: string;
  categories: RiskCategory[];
  verdict: "buildable" | "conditional" | "high-risk";
  verdictLabel: string;
  costRangeLow: number;
  costRangeHigh: number;
  geocodedAddress: string | null;
  coordinates: { lat: number; lon: number } | null;
  landCostLow: number;
  landCostHigh: number;
}

// Modeled land value per acre by town — illustrative only (no free public
// source for real land valuations, unlike the regulatory GIS layers above).
// Roughly reflects relative land costs across Southeastern MA: coastal
// Buzzards Bay towns run well above inland towns.
const TOWN_LAND_RATE_PER_ACRE: Record<string, { low: number; high: number }> = {
  Marion: { low: 300000, high: 380000 },
  Mattapoisett: { low: 280000, high: 350000 },
  Westport: { low: 240000, high: 300000 },
  Dartmouth: { low: 220000, high: 280000 },
  Fairhaven: { low: 200000, high: 260000 },
  Plymouth: { low: 190000, high: 240000 },
  Wareham: { low: 170000, high: 220000 },
  Somerset: { low: 180000, high: 220000 },
  Seekonk: { low: 170000, high: 210000 },
  Swansea: { low: 170000, high: 210000 },
  Acushnet: { low: 150000, high: 190000 },
  Lakeville: { low: 150000, high: 190000 },
  Rochester: { low: 130000, high: 170000 },
  Middleborough: { low: 120000, high: 160000 },
  Carver: { low: 120000, high: 160000 },
  Rehoboth: { low: 120000, high: 150000 },
  Freetown: { low: 110000, high: 140000 },
  Berkley: { low: 110000, high: 140000 },
};

// Coastal / wetland-heavy towns get skewed odds — matches the real geography
// of Southeastern MA (Buzzards Bay watershed towns run wetter and closer to
// nitrogen-sensitive embayments).
const COASTAL_TOWNS = new Set([
  "Wareham",
  "Marion",
  "Mattapoisett",
  "Fairhaven",
  "Westport",
  "Dartmouth",
  "Swansea",
]);

export const SOUTHEASTERN_MA_TOWNS = [
  "Plymouth",
  "Middleborough",
  "Wareham",
  "Carver",
  "Rochester",
  "Marion",
  "Mattapoisett",
  "Freetown",
  "Berkley",
  "Dartmouth",
  "Westport",
  "Fairhaven",
  "Acushnet",
  "Lakeville",
  "Rehoboth",
  "Seekonk",
  "Swansea",
  "Somerset",
];

function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

// mulberry32 seeded PRNG — small, deterministic, good enough for demo data.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CategoryDef {
  key: string;
  label: string;
  source: string;
  weights: { clear: number; caution: number; flag: number };
  coastalBoost?: number; // shifts weight from clear -> caution/flag for coastal towns
  findings: Record<RiskStatus, string[]>;
  cost: Record<RiskStatus, string | null>;
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    key: "wetlands",
    label: "Wetlands & Buffer Zones",
    source: "MassDEP Wetlands / MassGIS Hydrography",
    weights: { clear: 0.55, caution: 0.3, flag: 0.15 },
    coastalBoost: 0.2,
    findings: {
      clear: [
        "No mapped wetlands within 200 ft of the parcel boundary.",
        "Parcel sits outside all delineated wetland resource areas and buffer zones.",
      ],
      caution: [
        "A bordering vegetated wetland runs along the rear property line — the 100-ft buffer zone overlaps roughly 15–20% of the lot.",
        "Isolated wetland pocket mapped near the northeast corner; buildable envelope is reduced but not eliminated.",
      ],
      flag: [
        "Bordering vegetated wetland and its 100-ft buffer cover over half the parcel, requiring a Notice of Intent and likely a variance to site a house.",
        "Parcel intersects a mapped wetland resource area directly — Conservation Commission filing required before any design work.",
      ],
    },
    cost: {
      clear: null,
      caution: "$3,000–$8,000 (wetland delineation + Conservation Commission filing)",
      flag: "$15,000–$40,000+ (delineation, NOI, engineered siting, possible variance)",
    },
  },
  {
    key: "nitrogen",
    label: "Nitrogen-Sensitive Area / Septic Trigger",
    source: "MassDEP Nitrogen Sensitive Areas, Title 5",
    weights: { clear: 0.6, caution: 0.28, flag: 0.12 },
    coastalBoost: 0.25,
    findings: {
      clear: [
        "Parcel is outside all mapped nitrogen-sensitive watersheds — standard Title 5 septic system applies.",
      ],
      caution: [
        "Parcel falls within a nitrogen-sensitive watershed (Buzzards Bay embayment). Innovative/Alternative (I/A) septic technology will likely be required at permitting.",
      ],
      flag: [
        "Parcel is within a designated nitrogen-sensitive area with confirmed I/A septic requirement — Board of Health has flagged this watershed for enhanced nitrogen removal on all new construction.",
      ],
    },
    cost: {
      clear: null,
      caution: "$8,000–$15,000 above a standard Title 5 system",
      flag: "$18,000–$35,000 above a standard Title 5 system (I/A system + monitoring)",
    },
  },
  {
    key: "flood",
    label: "FEMA Flood Zone",
    source: "FEMA National Flood Hazard Layer",
    weights: { clear: 0.72, caution: 0.18, flag: 0.1 },
    coastalBoost: 0.22,
    findings: {
      clear: [
        "Parcel is entirely within Zone X (minimal flood hazard) — no flood insurance requirement, no elevation constraints.",
      ],
      caution: [
        "A portion of the rear yard falls within Zone AE — the buildable envelope is unaffected, but any accessory structures in that area would need elevation review.",
      ],
      flag: [
        "Primary buildable area overlaps Zone AE (1% annual chance flood). A house here requires base flood elevation certification and elevated foundation design — flood insurance would be mandatory.",
      ],
    },
    cost: {
      clear: null,
      caution: "$1,500–$4,000 (elevation certificate)",
      flag: "$25,000–$60,000+ (elevated/pile foundation, elevation certification, ongoing flood insurance)",
    },
  },
  {
    key: "soils",
    label: "Soil Drainage Class",
    source: "USDA NRCS Soil Survey",
    weights: { clear: 0.5, caution: 0.35, flag: 0.15 },
    findings: {
      clear: [
        "Mapped soil unit is well-drained sandy loam — favorable for standard Title 5 percolation and conventional foundation work.",
      ],
      caution: [
        "Mapped soil unit is moderately well-drained with a seasonal high water table around 24–36 inches. A licensed soil evaluator should confirm percolation before design.",
      ],
      flag: [
        "Mapped soil unit is poorly drained (hydric inclusions present) with a seasonal high water table under 18 inches — standard septic siting is unlikely without significant fill or an engineered system.",
      ],
    },
    cost: {
      clear: null,
      caution: "$1,200–$2,500 (perc test + soil evaluator report)",
      flag: "$20,000–$45,000 (engineered fill system or raised leach field)",
    },
  },
  {
    key: "zoning",
    label: "Zoning District & Setbacks",
    source: "Town GIS / Zoning Bylaw",
    weights: { clear: 0.68, caution: 0.24, flag: 0.08 },
    findings: {
      clear: [
        "Parcel meets minimum lot size, frontage, and setback requirements for its zoning district as-of-right.",
      ],
      caution: [
        "Parcel meets minimum lot area but frontage is 6 ft short of the district requirement — a frontage variance or ANR review may be needed at the Planning Board.",
      ],
      flag: [
        "Parcel is undersized for its zoning district (roughly 20% below minimum lot area) — a dimensional variance from the Zoning Board of Appeals is required before a building permit can issue.",
      ],
    },
    cost: {
      clear: null,
      caution: "$1,500–$4,000 (variance application + legal/engineering support)",
      flag: "$5,000–$12,000 (ZBA variance process, plus schedule risk of denial)",
    },
  },
  {
    key: "habitat",
    label: "Priority Habitat (Rare Species)",
    source: "NHESP / MassWildlife",
    weights: { clear: 0.78, caution: 0.15, flag: 0.07 },
    findings: {
      clear: [
        "Parcel is outside all mapped Priority Habitat and Estimated Habitat boundaries.",
      ],
      caution: [
        "Parcel edge touches a mapped Priority Habitat boundary — a Natural Heritage review (Massachusetts Endangered Species Act filing) will likely be required, though impact is typically resolvable.",
      ],
      flag: [
        "Parcel is substantially within Priority Habitat for a state-listed species. A full MESA filing and possible conservation and management permit are required, with real risk of a redesigned building envelope.",
      ],
    },
    cost: {
      clear: null,
      caution: "$2,500–$6,000 (MESA review filing)",
      flag: "$10,000–$25,000+ (full MESA review, possible site redesign, schedule risk of 6+ months)",
    },
  },
  {
    key: "wellhead",
    label: "Wellhead Protection / Zone II",
    source: "MassDEP Drinking Water Source Protection",
    weights: { clear: 0.8, caution: 0.14, flag: 0.06 },
    findings: {
      clear: [
        "Parcel is outside all mapped Zone I and Zone II wellhead protection areas.",
      ],
      caution: [
        "Parcel is within a Zone II wellhead protection area — this restricts on-site fuel storage and may limit septic system siting relative to the well.",
      ],
      flag: [
        "Parcel is within a Zone I (400-ft) wellhead protection radius of a public water supply well — significant restrictions apply to septic siting, impervious surface, and hazardous material storage.",
      ],
    },
    cost: {
      clear: null,
      caution: "$500–$2,000 (additional local Board of Health review)",
      flag: "$4,000–$10,000 (site plan restrictions, possible septic redesign)",
    },
  },
];

function pickWeighted(
  rng: () => number,
  weights: { clear: number; caution: number; flag: number },
): RiskStatus {
  const total = weights.clear + weights.caution + weights.flag;
  const r = rng() * total;
  if (r < weights.clear) return "clear";
  if (r < weights.clear + weights.caution) return "caution";
  return "flag";
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function parseCostRange(cost: string | null): [number, number] {
  if (!cost) return [0, 0];
  const matches = cost.match(/\$([\d,]+)/g);
  if (!matches || matches.length === 0) return [0, 0];
  const nums = matches.map((m) => parseInt(m.replace(/[$,]/g, ""), 10));
  if (nums.length === 1) return [nums[0], nums[0]];
  return [nums[0], nums[nums.length - 1]];
}

function computeSeed(address: string, town: string): number {
  return hashString(`${address.trim().toLowerCase()}|${town}`);
}

function buildModeledCategories(seed: number, town: string): RiskCategory[] {
  const rng = mulberry32(seed);
  const isCoastal = COASTAL_TOWNS.has(town);

  return CATEGORY_DEFS.map((def) => {
    const weights = { ...def.weights };
    if (isCoastal && def.coastalBoost) {
      const shift = def.coastalBoost * weights.clear;
      weights.clear -= shift;
      weights.caution += shift * 0.65;
      weights.flag += shift * 0.35;
    }
    const status = pickWeighted(rng, weights);
    const finding = pick(rng, def.findings[status]);
    const costImpact = def.cost[status];
    return {
      key: def.key,
      label: def.label,
      source: def.source,
      status,
      finding,
      costImpact,
      live: false,
    };
  });
}

function finalizeReport(
  seed: number,
  address: string,
  town: string,
  categories: RiskCategory[],
  geocodedAddress: string | null,
  coordinates: { lat: number; lon: number } | null,
): LotCheckReport {
  const flagCount = categories.filter((c) => c.status === "flag").length;
  const cautionCount = categories.filter((c) => c.status === "caution").length;

  let verdict: LotCheckReport["verdict"];
  let verdictLabel: string;
  if (flagCount >= 2) {
    verdict = "high-risk";
    verdictLabel = "Significant Risk — Professional Review Strongly Recommended";
  } else if (flagCount === 1 || cautionCount >= 3) {
    verdict = "conditional";
    verdictLabel = "Buildable With Conditions";
  } else {
    verdict = "buildable";
    verdictLabel = "Likely Buildable";
  }

  const costRanges = categories.map((c) => parseCostRange(c.costImpact));
  const costRangeLow = costRanges.reduce((sum, [low]) => sum + low, 0);
  const costRangeHigh = costRanges.reduce((sum, [, high]) => sum + high, 0);

  const acreageRng = mulberry32(seed ^ 0x9e3779b9);
  const acreage = 0.35 + acreageRng() * 2.4;
  const parcelAcreage = acreage.toFixed(2);

  const landRate = TOWN_LAND_RATE_PER_ACRE[town] ?? { low: 140000, high: 180000 };
  const landCostLow = Math.round((acreage * landRate.low) / 1000) * 1000;
  const landCostHigh = Math.round((acreage * landRate.high) / 1000) * 1000;

  return {
    id: seed.toString(36),
    address: address.trim(),
    town,
    submittedAt: new Date().toISOString(),
    parcelAcreage,
    categories,
    verdict,
    verdictLabel,
    costRangeLow,
    costRangeHigh,
    geocodedAddress,
    coordinates,
    landCostLow,
    landCostHigh,
  };
}

// Pure, synchronous, no network — used to seed instant demo data (e.g.
// builder dashboard leads) without waiting on live GIS calls.
export function generateModeledReport(
  address: string,
  town: string,
): LotCheckReport {
  const seed = computeSeed(address, town);
  const categories = buildModeledCategories(seed, town);
  return finalizeReport(seed, address, town, categories, null, null);
}

// Best-effort real data on top of the modeled engine: geocodes the address,
// then queries FEMA's live flood hazard layer. Either step can fail for
// reasons that have nothing to do with this app (network, timeout, the
// service being down) — in that case the modeled flood category stands as-is
// and the report still renders normally.
export async function generateLotCheckReport(
  address: string,
  town: string,
): Promise<LotCheckReport> {
  const seed = computeSeed(address, town);
  const categories = buildModeledCategories(seed, town);

  let geocodedAddress: string | null = null;
  let coordinates: { lat: number; lon: number } | null = null;
  try {
    const geo = await geocodeAddress(address, town);
    if (geo) {
      geocodedAddress = geo.matchedAddress;
      coordinates = { lat: geo.lat, lon: geo.lon };
      const fema = await queryFemaFloodZone(geo.lat, geo.lon);
      if (fema) {
        const { status, finding } = classifyFemaZone(fema);
        const floodIndex = categories.findIndex((c) => c.key === "flood");
        if (floodIndex !== -1) {
          const floodDef = CATEGORY_DEFS.find((d) => d.key === "flood")!;
          categories[floodIndex] = {
            key: "flood",
            label: floodDef.label,
            source: "FEMA National Flood Hazard Layer (live query)",
            status,
            finding,
            costImpact: floodDef.cost[status],
            live: true,
          };
        }
      }
    }
  } catch {
    // Fall through with modeled data — the report always renders.
  }

  return finalizeReport(seed, address, town, categories, geocodedAddress, coordinates);
}
