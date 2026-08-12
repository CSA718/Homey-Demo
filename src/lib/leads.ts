// Mock "referred leads" for the builder dashboard — buyers who ran a Lot
// Check and came back to a member builder with a verified lot and a real
// budget. Seeded once per account into localStorage so the dashboard has
// data immediately after signup, without waiting on live network calls.

import { generateModeledReport, type LotCheckReport } from "./lotCheck";

export type LeadStatus = "new" | "contacted" | "bid_sent" | "won" | "lost";

export interface Lead {
  id: string;
  buyerName: string;
  email: string;
  phone: string;
  budget: string;
  status: LeadStatus;
  createdAt: string;
  report: LotCheckReport;
}

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "bid_sent", label: "Bid Sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

interface SampleBuyer {
  name: string;
  email: string;
  phone: string;
  address: string;
  town: string;
  budget: string;
  daysAgo: number;
  status: LeadStatus;
}

const SAMPLE_BUYERS: SampleBuyer[] = [
  { name: "Jordan Silva", email: "jordan.silva@example.com", phone: "(508) 555-0142", address: "18 Cranberry Way", town: "Wareham", budget: "$620,000–$680,000", daysAgo: 2, status: "new" },
  { name: "Priya Nair", email: "priya.nair@example.com", phone: "(774) 555-0118", address: "204 Rounseville Rd", town: "Rochester", budget: "$550,000–$600,000", daysAgo: 4, status: "new" },
  { name: "Marcus Bell", email: "marcus.bell@example.com", phone: "(508) 555-0173", address: "9 Point Rd", town: "Marion", budget: "$900,000–$1,050,000", daysAgo: 6, status: "contacted" },
  { name: "Erin Kowalski", email: "erin.kowalski@example.com", phone: "(774) 555-0186", address: "56 Long Plain Rd", town: "Freetown", budget: "$480,000–$530,000", daysAgo: 9, status: "contacted" },
  { name: "David Chu", email: "david.chu@example.com", phone: "(508) 555-0159", address: "112 Horseneck Rd", town: "Westport", budget: "$700,000–$780,000", daysAgo: 12, status: "bid_sent" },
  { name: "Alicia Ferreira", email: "alicia.ferreira@example.com", phone: "(508) 555-0127", address: "33 Rock O'Dundee Rd", town: "Dartmouth", budget: "$610,000–$660,000", daysAgo: 15, status: "bid_sent" },
  { name: "Tom Whitfield", email: "tom.whitfield@example.com", phone: "(774) 555-0164", address: "77 Precinct St", town: "Lakeville", budget: "$540,000–$590,000", daysAgo: 22, status: "won" },
  { name: "Nina Alves", email: "nina.alves@example.com", phone: "(508) 555-0193", address: "14 Sconticut Neck Rd", town: "Fairhaven", budget: "$650,000–$710,000", daysAgo: 27, status: "lost" },
];

const LEADS_KEY_PREFIX = "homey_demo_leads_";

function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function seedLeadsForAccount(accountId: string): Lead[] {
  const rngSeed = hashString(accountId);
  const count = 5 + (rngSeed % 4); // 5–8 leads, varies per account
  const buyers = [...SAMPLE_BUYERS]
    .sort((a, b) => hashString(accountId + a.email) - hashString(accountId + b.email))
    .slice(0, count);

  return buyers.map((buyer) => {
    const report = generateModeledReport(buyer.address, buyer.town);
    const createdAt = new Date(
      Date.now() - buyer.daysAgo * 24 * 60 * 60 * 1000,
    ).toISOString();
    return {
      id: `${accountId}-${report.id}`,
      buyerName: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
      budget: buyer.budget,
      status: buyer.status,
      createdAt,
      report,
    };
  });
}

function storageKey(accountId: string) {
  return `${LEADS_KEY_PREFIX}${accountId}`;
}

export function getLeadsForAccount(accountId: string): Lead[] {
  try {
    const raw = localStorage.getItem(storageKey(accountId));
    if (raw) return JSON.parse(raw) as Lead[];
  } catch {
    // fall through to reseed
  }
  const seeded = seedLeadsForAccount(accountId);
  localStorage.setItem(storageKey(accountId), JSON.stringify(seeded));
  return seeded;
}

export function updateLeadStatus(
  accountId: string,
  leadId: string,
  status: LeadStatus,
): Lead[] {
  const leads = getLeadsForAccount(accountId).map((lead) =>
    lead.id === leadId ? { ...lead, status } : lead,
  );
  localStorage.setItem(storageKey(accountId), JSON.stringify(leads));
  return leads;
}
