// A builder's "referred leads" list — a handful of seeded sample buyers
// (deterministic per account, so a fresh dashboard is never empty) merged
// with real connection requests from actual buyers, stored in a real
// Postgres table (see supabase/schema.sql) so a connection a buyer makes
// is genuinely visible on that builder's dashboard, on any device.

import { generateModeledReport, type LotCheckReport } from "./lotCheck";
import { computeBudgetFit, type BudgetFit, type BuildTier } from "./budgetFit";
import type { BuilderEstimate } from "./costEstimate";
import { supabase } from "./supabaseClient";

export type LeadStatus = "new" | "contacted" | "bid_sent" | "won" | "lost";

export interface Lead {
  id: string;
  buyerName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
  report: LotCheckReport;
  budgetFit: BudgetFit;
  builderEstimate?: BuilderEstimate;
  isSample: boolean;
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
  city: string;
  state: string;
  budget: number;
  sqft: number;
  tier: BuildTier;
  daysAgo: number;
  status: LeadStatus;
}

const SAMPLE_BUYERS: SampleBuyer[] = [
  { name: "Jordan Silva", email: "jordan.silva@example.com", phone: "(508) 555-0142", address: "18 Cranberry Way", city: "Wareham", state: "MA", budget: 650000, sqft: 2400, tier: "custom", daysAgo: 2, status: "new" },
  { name: "Priya Nair", email: "priya.nair@example.com", phone: "(512) 555-0118", address: "512 Sunset Ridge Dr", city: "Austin", state: "TX", budget: 575000, sqft: 2200, tier: "standard", daysAgo: 4, status: "new" },
  { name: "Marcus Bell", email: "marcus.bell@example.com", phone: "(303) 555-0173", address: "88 Ridgecrest Ave", city: "Boulder", state: "CO", budget: 975000, sqft: 3200, tier: "high-end", daysAgo: 6, status: "contacted" },
  { name: "Erin Kowalski", email: "erin.kowalski@example.com", phone: "(828) 555-0186", address: "245 Magnolia Ln", city: "Asheville", state: "NC", budget: 500000, sqft: 2000, tier: "standard", daysAgo: 9, status: "contacted" },
  { name: "David Chu", email: "david.chu@example.com", phone: "(239) 555-0159", address: "1400 Cypress Point Dr", city: "Naples", state: "FL", budget: 740000, sqft: 2600, tier: "custom", daysAgo: 12, status: "bid_sent" },
  { name: "Alicia Ferreira", email: "alicia.ferreira@example.com", phone: "(707) 555-0127", address: "76 Meadowbrook Rd", city: "Petaluma", state: "CA", budget: 900000, sqft: 2300, tier: "custom", daysAgo: 15, status: "bid_sent" },
  { name: "Tom Whitfield", email: "tom.whitfield@example.com", phone: "(615) 555-0164", address: "310 Elm Creek Dr", city: "Franklin", state: "TN", budget: 560000, sqft: 2100, tier: "standard", daysAgo: 22, status: "won" },
  { name: "Nina Alves", email: "nina.alves@example.com", phone: "(508) 555-0193", address: "14 Sconticut Neck Rd", city: "Fairhaven", state: "MA", budget: 680000, sqft: 2400, tier: "custom", daysAgo: 27, status: "lost" },
];

function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

// Purely deterministic and client-side — clearly labeled isSample so the
// UI can distinguish it from real activity, and never written to the
// shared database.
function seedLeadsForAccount(accountId: string): Lead[] {
  const rngSeed = hashString(accountId);
  const count = 5 + (rngSeed % 4); // 5–8 leads, varies per account
  const buyers = [...SAMPLE_BUYERS]
    .sort((a, b) => hashString(accountId + a.email) - hashString(accountId + b.email))
    .slice(0, count);

  return buyers.map((buyer) => {
    const report = generateModeledReport(buyer.address, buyer.city, buyer.state);
    const budgetFit = computeBudgetFit(
      buyer.budget,
      buyer.sqft,
      buyer.tier,
      report.costRangeLow,
      report.costRangeHigh,
      report.landCostLow,
      report.landCostHigh,
    );
    const createdAt = new Date(
      Date.now() - buyer.daysAgo * 24 * 60 * 60 * 1000,
    ).toISOString();
    return {
      id: `seed-${accountId}-${report.id}`,
      buyerName: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
      status: buyer.status,
      createdAt,
      report,
      budgetFit,
      isSample: true,
    };
  });
}

interface ConnectionLeadRow {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  status: LeadStatus;
  report: LotCheckReport;
  budget_fit: BudgetFit;
  builder_estimate: BuilderEstimate | null;
  created_at: string;
}

function fromRow(row: ConnectionLeadRow): Lead {
  return {
    id: row.id,
    buyerName: row.buyer_name,
    email: row.buyer_email,
    phone: row.buyer_phone,
    status: row.status,
    createdAt: row.created_at,
    report: row.report,
    budgetFit: row.budget_fit,
    builderEstimate: row.builder_estimate ?? undefined,
    isSample: false,
  };
}

export async function getLeadsForAccount(accountId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("connection_leads")
    .select("*")
    .eq("builder_account_id", accountId)
    .order("created_at", { ascending: false });
  const real = !error && data ? (data as ConnectionLeadRow[]).map(fromRow) : [];
  return [...real, ...seedLeadsForAccount(accountId)];
}

export async function updateLeadStatus(
  accountId: string,
  leadId: string,
  status: LeadStatus,
): Promise<Lead[]> {
  if (!leadId.startsWith("seed-")) {
    await supabase.from("connection_leads").update({ status }).eq("id", leadId).eq("builder_account_id", accountId);
  }
  return getLeadsForAccount(accountId);
}

export async function updateBuilderEstimate(
  accountId: string,
  leadId: string,
  builderEstimate: BuilderEstimate,
): Promise<Lead[]> {
  if (!leadId.startsWith("seed-")) {
    await supabase
      .from("connection_leads")
      .update({ builder_estimate: builderEstimate })
      .eq("id", leadId)
      .eq("builder_account_id", accountId);
  }
  return getLeadsForAccount(accountId);
}

// Admin-only: every real connection lead across every builder (seeded
// sample leads are intentionally excluded — they're per-browser filler,
// not real activity).
export async function listAllConnectionLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("connection_leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ConnectionLeadRow[]).map(fromRow);
}

// A buyer requesting to connect with a real member builder from the Lot
// Check report — delivers an actual lead into that builder's dashboard.
export async function addConnectionLead(
  builderAccountId: string,
  buyerAccountId: string,
  buyer: {
    name: string;
    email: string;
    phone: string;
    report: LotCheckReport;
    budgetFit: BudgetFit;
  },
): Promise<Lead> {
  const { data, error } = await supabase
    .from("connection_leads")
    .upsert(
      {
        builder_account_id: builderAccountId,
        buyer_account_id: buyerAccountId,
        buyer_name: buyer.name,
        buyer_email: buyer.email,
        buyer_phone: buyer.phone,
        report_id: buyer.report.id,
        report: buyer.report,
        budget_fit: buyer.budgetFit,
      },
      { onConflict: "builder_account_id,report_id" },
    )
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to connect with builder");
  return fromRow(data as ConnectionLeadRow);
}
