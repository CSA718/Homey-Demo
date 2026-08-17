import { useEffect, useState } from "react";
import { listAllProfiles, type Profile } from "../lib/profile";
import { listAllLotChecks, type SavedLotCheck } from "../lib/lotCheckHistory";
import { listAllRenovationChecks, type SavedRenovationCheck } from "../lib/renoChecks";
import { listAllListings } from "../lib/renovationListings";
import type { RenovationListing } from "../lib/renovationListings";
import { listAllBids, type Bid } from "../lib/bids";
import { listAllConnectionLeads, type Lead } from "../lib/leads";
import VerdictBadge from "../components/VerdictBadge";

type Tab = "accounts" | "lot-checks" | "renovation-checks" | "listings" | "bids" | "connections";

const TABS: { value: Tab; label: string }[] = [
  { value: "accounts", label: "Accounts" },
  { value: "lot-checks", label: "Lot Checks" },
  { value: "renovation-checks", label: "Renovation Checks" },
  { value: "listings", label: "Renovation Listings" },
  { value: "bids", label: "Bids" },
  { value: "connections", label: "Connection Leads" },
];

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function formatDate(s: string) {
  return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [lotChecks, setLotChecks] = useState<SavedLotCheck[]>([]);
  const [renoChecks, setRenoChecks] = useState<SavedRenovationCheck[]>([]);
  const [listings, setListings] = useState<RenovationListing[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [connections, setConnections] = useState<Lead[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      listAllProfiles(),
      listAllLotChecks(),
      listAllRenovationChecks(),
      listAllListings(),
      listAllBids(),
      listAllConnectionLeads(),
    ]).then(([p, lc, rc, l, b, c]) => {
      if (!active) return;
      setProfiles(p);
      setLotChecks(lc);
      setRenoChecks(rc);
      setListings(l);
      setBids(b);
      setConnections(c);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const consumerCount = profiles.filter((p) => p.role === "consumer").length;
  const builderCount = profiles.filter((p) => p.role === "builder").length;
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
        Master Account
      </span>
      <h1 className="mt-3 font-serif text-3xl text-ink">Admin overview</h1>
      <p className="mt-2 text-ink-soft">
        Every real account and every piece of activity across Homey, on any
        device — this view bypasses the per-account visibility rules
        everyone else sees.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Consumers</p>
          <p className="mt-1 font-serif text-2xl text-ink">{consumerCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Builders</p>
          <p className="mt-1 font-serif text-2xl text-ink">{builderCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Lot Checks</p>
          <p className="mt-1 font-serif text-2xl text-ink">{lotChecks.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Reno Checks</p>
          <p className="mt-1 font-serif text-2xl text-ink">{renoChecks.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Listings</p>
          <p className="mt-1 font-serif text-2xl text-ink">{listings.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Bids</p>
          <p className="mt-1 font-serif text-2xl text-ink">{bids.length}</p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value ? "bg-forest text-paper" : "bg-sand text-ink-soft hover:bg-sand/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-ink-soft">Loading…</p>
      ) : (
        <div className="mt-4">
          {tab === "accounts" && (
            <div className="overflow-x-auto rounded-xl border border-line bg-paper-raised">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">State</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-4 font-semibold text-ink">
                        {p.name}
                        {p.isAdmin && (
                          <span className="ml-2 rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">{p.email}</td>
                      <td className="px-5 py-4 text-ink-soft capitalize">{p.role}</td>
                      <td className="px-5 py-4 text-ink-soft">{p.state ?? "—"}</td>
                      <td className="px-5 py-4 text-ink-soft">
                        {p.canceledAt ? "Canceled" : p.trialEndsAt ? "Member" : "—"}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {profiles.length === 0 && <p className="p-8 text-center text-ink-soft">No accounts yet.</p>}
            </div>
          )}

          {tab === "lot-checks" && (
            <div className="overflow-x-auto rounded-xl border border-line bg-paper-raised">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-3 font-semibold">Account</th>
                    <th className="px-5 py-3 font-semibold">Lot</th>
                    <th className="px-5 py-3 font-semibold">Verdict</th>
                    <th className="px-5 py-3 font-semibold">Budget</th>
                    <th className="px-5 py-3 font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {lotChecks.map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-4 text-ink">{profileById.get(c.accountId)?.name ?? c.accountId}</td>
                      <td className="px-5 py-4 text-ink-soft">
                        {c.report.address}
                        <p className="text-xs">{c.report.city}, {c.report.state}</p>
                      </td>
                      <td className="px-5 py-4">
                        <VerdictBadge verdict={c.report.verdict} label={c.report.verdictLabel} />
                      </td>
                      <td className="px-5 py-4 text-ink-soft">{c.budgetFit ? formatMoney(c.budgetFit.budget) : "—"}</td>
                      <td className="px-5 py-4 text-ink-soft">{formatDate(c.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lotChecks.length === 0 && <p className="p-8 text-center text-ink-soft">No lot checks yet.</p>}
            </div>
          )}

          {tab === "renovation-checks" && (
            <div className="overflow-x-auto rounded-xl border border-line bg-paper-raised">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-3 font-semibold">Account</th>
                    <th className="px-5 py-3 font-semibold">State</th>
                    <th className="px-5 py-3 font-semibold">Scope</th>
                    <th className="px-5 py-3 font-semibold">Budget</th>
                    <th className="px-5 py-3 font-semibold">Result</th>
                    <th className="px-5 py-3 font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {renoChecks.map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-4 text-ink">{profileById.get(c.accountId)?.name ?? c.accountId}</td>
                      <td className="px-5 py-4 text-ink-soft">{c.state}</td>
                      <td className="px-5 py-4 text-ink-soft">{c.scope.length} item{c.scope.length === 1 ? "" : "s"}</td>
                      <td className="px-5 py-4 text-ink-soft">{formatMoney(c.budget)}</td>
                      <td className="px-5 py-4 text-ink-soft">{c.estimate.likelihood}%</td>
                      <td className="px-5 py-4 text-ink-soft">{formatDate(c.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {renoChecks.length === 0 && <p className="p-8 text-center text-ink-soft">No renovation checks yet.</p>}
            </div>
          )}

          {tab === "listings" && (
            <div className="overflow-x-auto rounded-xl border border-line bg-paper-raised">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-3 font-semibold">Homeowner</th>
                    <th className="px-5 py-3 font-semibold">State</th>
                    <th className="px-5 py-3 font-semibold">Scope</th>
                    <th className="px-5 py-3 font-semibold">Budget</th>
                    <th className="px-5 py-3 font-semibold">Posted</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-4 text-ink">
                        {l.consumerName}
                        <p className="text-xs text-ink-soft">{l.consumerEmail}</p>
                      </td>
                      <td className="px-5 py-4 text-ink-soft">{l.state}</td>
                      <td className="px-5 py-4 text-ink-soft">{l.scope.length} item{l.scope.length === 1 ? "" : "s"}</td>
                      <td className="px-5 py-4 text-ink-soft">{formatMoney(l.budget)}</td>
                      <td className="px-5 py-4 text-ink-soft">{formatDate(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {listings.length === 0 && <p className="p-8 text-center text-ink-soft">No listings yet.</p>}
            </div>
          )}

          {tab === "bids" && (
            <div className="overflow-x-auto rounded-xl border border-line bg-paper-raised">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-3 font-semibold">Builder</th>
                    <th className="px-5 py-3 font-semibold">Target</th>
                    <th className="px-5 py-3 font-semibold">Price</th>
                    <th className="px-5 py-3 font-semibold">Timeline</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((b) => (
                    <tr key={b.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-4 text-ink">{b.builderName}</td>
                      <td className="px-5 py-4 text-ink-soft capitalize">{b.targetType.replace("-", " ")}</td>
                      <td className="px-5 py-4 text-ink-soft">{formatMoney(b.priceLow)}–{formatMoney(b.priceHigh)}</td>
                      <td className="px-5 py-4 text-ink-soft">~{b.estimatedWeeks}w</td>
                      <td className="px-5 py-4">
                        {b.accepted ? (
                          <span className="rounded-full bg-clear-bg px-2.5 py-1 text-xs font-semibold text-clear">Accepted</span>
                        ) : (
                          <span className="rounded-full bg-sand px-2.5 py-1 text-xs font-semibold text-ink-soft">Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">{formatDate(b.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bids.length === 0 && <p className="p-8 text-center text-ink-soft">No bids yet.</p>}
            </div>
          )}

          {tab === "connections" && (
            <div className="overflow-x-auto rounded-xl border border-line bg-paper-raised">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-3 font-semibold">Buyer</th>
                    <th className="px-5 py-3 font-semibold">Lot</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Connected</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-4 text-ink">
                        {c.buyerName}
                        <p className="text-xs text-ink-soft">{c.email}</p>
                      </td>
                      <td className="px-5 py-4 text-ink-soft">
                        {c.report.address}
                        <p className="text-xs">{c.report.city}, {c.report.state}</p>
                      </td>
                      <td className="px-5 py-4 text-ink-soft capitalize">{c.status.replace("_", " ")}</td>
                      <td className="px-5 py-4 text-ink-soft">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {connections.length === 0 && <p className="p-8 text-center text-ink-soft">No connections yet.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
