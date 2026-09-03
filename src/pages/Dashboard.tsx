import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getLeadsForAccount,
  updateLeadStatus,
  LEAD_STATUSES,
  type Lead,
  type LeadStatus,
} from "../lib/leads";
import { getListingsForState, type RenovationListing } from "../lib/renovationListings";
import { getBidsForTargets } from "../lib/bids";
import { getQuotesSentByBuilder, type DirectQuote } from "../lib/directQuotes";
import VerdictBadge from "../components/VerdictBadge";
import DirectQuoteForm from "../components/DirectQuoteForm";

const HOURS_PER_BID = 8;
const ESTIMATOR_RATE = 65;

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-forest/10 text-forest",
  contacted: "bg-caution-bg text-caution",
  bid_sent: "bg-clay/10 text-clay",
  won: "bg-clear-bg text-clear",
  lost: "bg-sand text-ink-soft",
};

const BUDGET_FIT_DOT: Record<Lead["budgetFit"]["status"], string> = {
  comfortable: "bg-clear",
  tight: "bg-caution",
  short: "bg-flag",
};

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export default function Dashboard() {
  const { account, logOut } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [listings, setListings] = useState<RenovationListing[]>([]);
  const [myLotCheckBidIds, setMyLotCheckBidIds] = useState<Set<string>>(new Set());
  const [myRenovationBidIds, setMyRenovationBidIds] = useState<Set<string>>(new Set());
  const [renovationBidCounts, setRenovationBidCounts] = useState<Record<string, number>>({});
  const [quotes, setQuotes] = useState<DirectQuote[]>([]);
  const [quotesVersion, setQuotesVersion] = useState(0);
  const [tab, setTab] = useState<"leads" | "renovation" | "quotes">("leads");

  useEffect(() => {
    if (!account) return;
    let active = true;
    getLeadsForAccount(account.id).then((l) => active && setLeads(l));
    getListingsForState(account.state).then((l) => active && setListings(l));
    return () => {
      active = false;
    };
  }, [account]);

  useEffect(() => {
    if (!account) return;
    let active = true;
    getQuotesSentByBuilder(account.id).then((q) => active && setQuotes(q));
    return () => {
      active = false;
    };
  }, [account, quotesVersion]);

  useEffect(() => {
    if (!account || leads.length === 0) {
      setMyLotCheckBidIds(new Set());
      return;
    }
    let active = true;
    getBidsForTargets(
      "lot-check",
      leads.map((l) => l.report.id),
    ).then((bids) => {
      if (!active) return;
      setMyLotCheckBidIds(new Set(bids.filter((b) => b.builderAccountId === account.id).map((b) => b.targetId)));
    });
    return () => {
      active = false;
    };
  }, [account, leads]);

  useEffect(() => {
    if (!account || listings.length === 0) {
      setMyRenovationBidIds(new Set());
      setRenovationBidCounts({});
      return;
    }
    let active = true;
    getBidsForTargets(
      "renovation",
      listings.map((l) => l.id),
    ).then((bids) => {
      if (!active) return;
      setMyRenovationBidIds(new Set(bids.filter((b) => b.builderAccountId === account.id).map((b) => b.targetId)));
      const counts: Record<string, number> = {};
      for (const b of bids) counts[b.targetId] = (counts[b.targetId] ?? 0) + 1;
      setRenovationBidCounts(counts);
    });
    return () => {
      active = false;
    };
  }, [account, listings]);

  if (!account) return null;

  async function handleStatusChange(leadId: string, status: LeadStatus) {
    if (!account) return;
    setLeads(await updateLeadStatus(account.id, leadId, status));
  }

  const wonCount = leads.filter((l) => l.status === "won").length;
  const newCount = leads.filter((l) => l.status === "new").length;
  const hoursSaved = leads.length * HOURS_PER_BID;
  const dollarsSaved = hoursSaved * ESTIMATOR_RATE;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
            ClearParcel Member
          </span>
          <h1 className="mt-3 font-serif text-3xl text-ink">{account.businessName}</h1>
          <p className="mt-1 text-ink-soft">
            Referred leads routed to you through ClearParcel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {account.isAdmin && (
            <Link
              to="/admin"
              className="rounded-full border border-forest px-4 py-2 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-paper"
            >
              Admin
            </Link>
          )}
          <button
            onClick={logOut}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-paper-raised p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Total leads</p>
          <p className="mt-1 font-serif text-2xl text-ink">{leads.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft">New</p>
          <p className="mt-1 font-serif text-2xl text-forest">{newCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Won</p>
          <p className="mt-1 font-serif text-2xl text-clear">{wonCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Estimator time saved
          </p>
          <p className="mt-1 font-serif text-2xl text-ink">
            {hoursSaved} hrs
          </p>
          <p className="text-xs text-ink-soft">
            ≈ ${dollarsSaved.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      <div className="mt-10 flex gap-2">
        <button
          onClick={() => setTab("leads")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "leads" ? "bg-forest text-paper" : "bg-sand text-ink-soft hover:bg-sand/70"
          }`}
        >
          Lot Check Leads
        </button>
        <button
          onClick={() => setTab("renovation")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "renovation" ? "bg-forest text-paper" : "bg-sand text-ink-soft hover:bg-sand/70"
          }`}
        >
          Renovation Jobs{listings.length > 0 ? ` (${listings.length})` : ""}
        </button>
        <button
          onClick={() => setTab("quotes")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "quotes" ? "bg-forest text-paper" : "bg-sand text-ink-soft hover:bg-sand/70"
          }`}
        >
          Direct Quotes{quotes.length > 0 ? ` (${quotes.length})` : ""}
        </button>
      </div>

      {tab === "leads" && (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-paper-raised">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3 font-semibold">Buyer</th>
                  <th className="px-5 py-3 font-semibold">Lot</th>
                  <th className="px-5 py-3 font-semibold">Verdict</th>
                  <th className="px-5 py-3 font-semibold">Budget</th>
                  <th className="px-5 py-3 font-semibold">Referred</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const myBid = myLotCheckBidIds.has(lead.report.id);
                  return (
                    <tr key={lead.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-4">
                        <Link
                          to={`/dashboard/leads/${lead.id}`}
                          className="font-semibold text-ink hover:text-forest hover:underline"
                        >
                          {lead.buyerName}
                        </Link>
                        <p className="text-xs text-ink-soft">{lead.email}</p>
                        {myBid && (
                          <p className="mt-0.5 text-xs text-clear">Bid submitted</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">
                        {lead.report.address}
                        <p className="text-xs">{lead.report.city}, {lead.report.state}</p>
                      </td>
                      <td className="px-5 py-4">
                        <VerdictBadge verdict={lead.report.verdict} label={lead.report.verdictLabel} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-ink-soft">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${BUDGET_FIT_DOT[lead.budgetFit.status]}`}
                            title={lead.budgetFit.statusLabel}
                          />
                          {formatMoney(lead.budgetFit.budget)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-ink-soft">
                        {new Date(lead.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            handleStatusChange(lead.id, e.target.value as LeadStatus)
                          }
                          className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-forest/30 ${STATUS_STYLE[lead.status]}`}
                        >
                          {LEAD_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {leads.length === 0 && (
            <p className="mt-8 text-center text-ink-soft">
              No leads yet — they'll appear here as buyers come back from
              ClearParcel with a verified lot.
            </p>
          )}
        </>
      )}

      {tab === "renovation" && (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-paper-raised">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3 font-semibold">Homeowner</th>
                  <th className="px-5 py-3 font-semibold">State</th>
                  <th className="px-5 py-3 font-semibold">Scope</th>
                  <th className="px-5 py-3 font-semibold">Budget</th>
                  <th className="px-5 py-3 font-semibold">Posted</th>
                  <th className="px-5 py-3 font-semibold">Bids</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => {
                  const bidCount = renovationBidCounts[listing.id] ?? 0;
                  const myBid = myRenovationBidIds.has(listing.id);
                  return (
                    <tr key={listing.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-4">
                        <Link
                          to={`/dashboard/renovation-jobs/${listing.id}`}
                          className="font-semibold text-ink hover:text-forest hover:underline"
                        >
                          {listing.consumerName}
                        </Link>
                        {myBid && <p className="mt-0.5 text-xs text-clear">Bid submitted</p>}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">{listing.state}</td>
                      <td className="px-5 py-4 text-ink-soft">
                        {listing.scope.length} item{listing.scope.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">{formatMoney(listing.budget)}</td>
                      <td className="px-5 py-4 text-ink-soft">
                        {new Date(listing.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">{bidCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {listings.length === 0 && (
            <p className="mt-8 text-center text-ink-soft">
              No open renovation jobs in {account.state} yet — they'll
              appear here as homeowners post projects for bids.
            </p>
          )}
        </>
      )}

      {tab === "quotes" && (
        <div className="mt-6 space-y-8">
          <DirectQuoteForm
            builderAccountId={account.id}
            builderName={account.businessName}
            onSent={() => setQuotesVersion((n) => n + 1)}
          />

          <div>
            <h2 className="font-serif text-xl text-ink">Quotes you've sent</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-paper-raised">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-3 font-semibold">Consumer</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Note</th>
                    <th className="px-5 py-3 font-semibold">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink">{q.consumerName}</p>
                        <p className="text-xs text-ink-soft">{q.consumerEmail}</p>
                      </td>
                      <td className="px-5 py-4 text-ink-soft">{formatMoney(q.amount)}</td>
                      <td className="px-5 py-4 text-ink-soft">{q.message || "—"}</td>
                      <td className="px-5 py-4 text-ink-soft">
                        {new Date(q.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quotes.length === 0 && (
                <p className="p-8 text-center text-ink-soft">
                  No quotes sent yet — use the form above to quote a lead directly.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
