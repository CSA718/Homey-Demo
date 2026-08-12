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
import VerdictBadge from "../components/VerdictBadge";

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

  useEffect(() => {
    if (account) setLeads(getLeadsForAccount(account.id));
  }, [account]);

  if (!account) return null;

  function handleStatusChange(leadId: string, status: LeadStatus) {
    if (!account) return;
    setLeads(updateLeadStatus(account.id, leadId, status));
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
            {account.tier === "founding" ? "Founding member" : "Standard member"}
          </span>
          <h1 className="mt-3 font-serif text-3xl text-ink">{account.businessName}</h1>
          <p className="mt-1 text-ink-soft">
            Referred leads routed to you through Homey.
          </p>
        </div>
        <button
          onClick={logOut}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
        >
          Log out
        </button>
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

      <div className="mt-10 overflow-x-auto rounded-xl border border-line bg-paper-raised">
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
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-line last:border-0">
                <td className="px-5 py-4">
                  <Link
                    to={`/dashboard/leads/${lead.id}`}
                    className="font-semibold text-ink hover:text-forest hover:underline"
                  >
                    {lead.buyerName}
                  </Link>
                  <p className="text-xs text-ink-soft">{lead.email}</p>
                </td>
                <td className="px-5 py-4 text-ink-soft">
                  {lead.report.address}
                  <p className="text-xs">{lead.report.town}, MA</p>
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
            ))}
          </tbody>
        </table>
      </div>

      {leads.length === 0 && (
        <p className="mt-8 text-center text-ink-soft">
          No leads yet — they'll appear here as buyers come back from Homey
          with a verified lot.
        </p>
      )}
    </div>
  );
}
