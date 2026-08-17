import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useConsumerAuth } from "../context/ConsumerAuthContext";
import {
  getSubscriptionState,
  trialDaysLeft,
  cancelMembership,
  resumeMembership,
} from "../lib/consumerAuth";
import { getLotChecksForAccount, type SavedLotCheck } from "../lib/lotCheckHistory";
import { getChecksForAccount, type SavedRenovationCheck } from "../lib/renoChecks";
import { getListingsForConsumer, type RenovationListing } from "../lib/renovationListings";
import { getBidsForTargets } from "../lib/bids";
import VerdictBadge from "../components/VerdictBadge";

const STATUS_BADGE: Record<string, string> = {
  trialing: "bg-caution-bg text-caution border-caution/30",
  active: "bg-clear-bg text-clear border-clear/30",
  canceled: "bg-sand text-ink-soft border-line",
};

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export default function Account() {
  const { account, refresh, logOut } = useConsumerAuth();
  const navigate = useNavigate();
  const [lotChecks, setLotChecks] = useState<SavedLotCheck[]>([]);
  const [renoChecks, setRenoChecks] = useState<SavedRenovationCheck[]>([]);
  const [listings, setListings] = useState<RenovationListing[]>([]);
  const [bidCounts, setBidCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!account) return;
    let active = true;
    getLotChecksForAccount(account.id).then((v) => active && setLotChecks(v));
    getChecksForAccount(account.id).then((v) => active && setRenoChecks(v));
    getListingsForConsumer(account.id).then((v) => active && setListings(v));
    return () => {
      active = false;
    };
  }, [account]);

  useEffect(() => {
    if (listings.length === 0) {
      setBidCounts({});
      return;
    }
    let active = true;
    getBidsForTargets(
      "renovation",
      listings.map((l) => l.id),
    ).then((bids) => {
      if (!active) return;
      const counts: Record<string, number> = {};
      for (const b of bids) counts[b.targetId] = (counts[b.targetId] ?? 0) + 1;
      setBidCounts(counts);
    });
    return () => {
      active = false;
    };
  }, [listings]);

  if (!account) return null;

  const subState = getSubscriptionState(account);
  const daysLeft = trialDaysLeft(account);

  async function handleCancel() {
    if (!account) return;
    await cancelMembership(account.id);
    refresh();
  }

  async function handleResume() {
    if (!account) return;
    await resumeMembership(account.id);
    refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Homey Membership
          </p>
          <h1 className="mt-1 font-serif text-2xl text-ink sm:text-3xl">
            Welcome back, {account.name.split(" ")[0]}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {account.isAdmin && (
            <Link
              to="/admin"
              className="rounded-full border border-forest px-4 py-2 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-paper"
            >
              Admin
            </Link>
          )}
          <button
            onClick={() => {
              logOut();
              navigate("/");
            }}
            className="text-sm font-medium text-ink-soft hover:text-forest"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-paper-raised p-6">
        <div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_BADGE[subState]}`}
          >
            {subState === "trialing" && `Free trial — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
            {subState === "active" && "Active member — $25/mo"}
            {subState === "canceled" && "Membership canceled"}
          </span>
          <p className="mt-2 text-sm text-ink-soft">
            {subState === "trialing" &&
              `Your card won't be charged until your trial ends on ${new Date(account.trialEndsAt).toLocaleDateString()}. Covers unlimited Lot Checks and Renovation Checks.`}
            {subState === "active" && "Billed $25/mo flat — unlimited Lot Checks and Renovation Checks. Cancel anytime."}
            {subState === "canceled" &&
              "You can keep running checks until the end of your current period. Resume anytime."}
          </p>
        </div>
        {subState === "canceled" ? (
          <button
            onClick={handleResume}
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
          >
            Resume membership
          </button>
        ) : (
          <button
            onClick={handleCancel}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-flag hover:text-flag"
          >
            Cancel membership
          </button>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-serif text-xl text-ink">Your Lot Checks</h2>
        <Link
          to="/lot-check"
          className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
        >
          New Lot Check
        </Link>
      </div>

      {lotChecks.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-paper-raised p-10 text-center">
          <p className="text-ink-soft">You haven't run a Lot Check yet.</p>
          <Link to="/lot-check" className="mt-3 inline-block font-semibold text-forest hover:underline">
            Start your first Lot Check →
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-sand/50 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Lot</th>
                <th className="px-4 py-3">Verdict</th>
                <th className="px-4 py-3">Budget</th>
              </tr>
            </thead>
            <tbody>
              {lotChecks.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-sand/30">
                  <td className="px-4 py-3">
                    <Link to={`/account/lot-checks/${c.id}`} className="block text-ink hover:text-forest">
                      {new Date(c.submittedAt).toLocaleDateString()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {c.report.address}
                    <p className="text-xs">
                      {c.report.city}, {c.report.state}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <VerdictBadge verdict={c.report.verdict} label={c.report.verdictLabel} />
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {c.budgetFit ? formatMoney(c.budgetFit.budget) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-serif text-xl text-ink">Your Renovation Checks</h2>
        <Link
          to="/renovate/check"
          className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
        >
          New renovation check
        </Link>
      </div>

      {renoChecks.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-paper-raised p-10 text-center">
          <p className="text-ink-soft">You haven't run a renovation check yet.</p>
          <Link
            to="/renovate/check"
            className="mt-3 inline-block font-semibold text-forest hover:underline"
          >
            Start your first check →
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-sand/50 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {renoChecks.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-sand/30">
                  <td className="px-4 py-3">
                    <Link
                      to={`/account/renovation-checks/${c.id}`}
                      className="block text-ink hover:text-forest"
                    >
                      {new Date(c.submittedAt).toLocaleDateString()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{c.state}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {c.scope.length} item{c.scope.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{formatMoney(c.budget)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        c.estimate.status === "comfortable"
                          ? "bg-clear-bg text-clear"
                          : c.estimate.status === "tight"
                            ? "bg-caution-bg text-caution"
                            : "bg-flag-bg text-flag"
                      }`}
                    >
                      {c.estimate.likelihood}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 font-serif text-xl text-ink">Your posted listings</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Projects you've posted for contractor bids.
      </p>

      {listings.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-paper-raised p-10 text-center">
          <p className="text-ink-soft">
            You haven't posted a project for bids yet — do that from the
            results of a renovation check.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-sand/50 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Posted</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Bids</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => {
                const bidCount = bidCounts[l.id] ?? 0;
                return (
                  <tr key={l.id} className="border-b border-line last:border-0 hover:bg-sand/30">
                    <td className="px-4 py-3">
                      <Link
                        to={`/account/listings/${l.id}`}
                        className="block text-ink hover:text-forest"
                      >
                        {new Date(l.createdAt).toLocaleDateString()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{l.state}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {l.scope.length} item{l.scope.length === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{formatMoney(l.budget)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          bidCount > 0 ? "bg-clear-bg text-clear" : "bg-sand text-ink-soft"
                        }`}
                      >
                        {bidCount}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
