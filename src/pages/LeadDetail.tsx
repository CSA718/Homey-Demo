import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLeadsForAccount, type Lead } from "../lib/leads";
import { getBidsFor, type Bid } from "../lib/bids";
import ReportView from "../components/ReportView";
import BuilderEstimateTool from "../components/BuilderEstimateTool";
import BidForm from "../components/BidForm";
import BidList from "../components/BidList";

export default function LeadDetail() {
  const { account } = useAuth();
  const { leadId } = useParams();
  const [lead, setLead] = useState<Lead | null | undefined>(undefined);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidsVersion, setBidsVersion] = useState(0);

  useEffect(() => {
    if (!account) return;
    let active = true;
    getLeadsForAccount(account.id).then((leads) => {
      if (active) setLead(leads.find((l) => l.id === leadId) ?? null);
    });
    return () => {
      active = false;
    };
  }, [account, leadId]);

  useEffect(() => {
    if (!lead) return;
    let active = true;
    getBidsFor("lot-check", lead.report.id).then((b) => active && setBids(b));
    return () => {
      active = false;
    };
  }, [lead, bidsVersion]);

  if (!account) return null;
  if (lead === null) return <Navigate to="/dashboard" replace />;
  if (lead === undefined) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <Link to="/dashboard" className="text-sm font-medium text-forest hover:underline">
        ← Back to dashboard
      </Link>

      <div className="mt-6 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Referred buyer
        </p>
        <h1 className="mt-1 font-serif text-2xl text-ink">{lead.buyerName}</h1>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Email</p>
            <p className="text-ink">{lead.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Phone</p>
            <p className="text-ink">{lead.phone}</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <BuilderEstimateTool
          accountId={account.id}
          lead={lead}
          onSave={(builderEstimate) =>
            setLead((prev) => (prev ? { ...prev, builderEstimate } : prev))
          }
        />
      </div>

      <div className="mt-6">
        <BidForm
          targetType="lot-check"
          targetId={lead.report.id}
          builderAccountId={account.id}
          builderName={account.businessName}
          onSubmitted={() => setBidsVersion((n) => n + 1)}
        />
      </div>

      <h2 className="mt-8 font-serif text-xl text-ink">All bids on this lot</h2>
      <div className="mt-4">
        <BidList bids={bids} viewerBuilderAccountId={account.id} />
      </div>

      <div className="mt-6">
        <ReportView report={lead.report} budgetFit={lead.budgetFit} />
      </div>
    </div>
  );
}
