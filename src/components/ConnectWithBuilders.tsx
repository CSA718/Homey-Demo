import { useEffect, useState } from "react";
import type { LotCheckReport } from "../lib/lotCheck";
import type { BudgetFit } from "../lib/budgetFit";
import { getMatchedBuilders, type DirectoryBuilder } from "../lib/builderDirectory";
import { addConnectionLead } from "../lib/leads";

export default function ConnectWithBuilders({
  report,
  budgetFit,
  email,
  buyerAccountId,
}: {
  report: LotCheckReport;
  budgetFit: BudgetFit | null;
  email: string;
  buyerAccountId: string;
}) {
  const [builders, setBuilders] = useState<DirectoryBuilder[]>([]);

  useEffect(() => {
    let active = true;
    getMatchedBuilders(report.state).then((b) => active && setBuilders(b));
    return () => {
      active = false;
    };
  }, [report.state]);

  const hasInState = builders.some((b) => b.state === report.state);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  if (builders.length === 0) return null;

  async function handleConnect(builder: DirectoryBuilder) {
    if (!name.trim() || phone.trim().length < 7) {
      setError("Enter your name and phone number first, so the builder can reach you.");
      return;
    }
    setError(null);

    if (builder.isRealAccount && budgetFit) {
      await addConnectionLead(builder.id, buyerAccountId, {
        name: name.trim(),
        email,
        phone: phone.trim(),
        report,
        budgetFit,
      });
    }
    setConnectedIds((prev) => new Set(prev).add(builder.id));
  }

  return (
    <div className="mt-8 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8 print:hidden">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Next step
      </p>
      <h2 className="mt-1 font-serif text-2xl text-ink">
        Connect with a builder in {report.state}
      </h2>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Member builders can see this exact Lot Check report and your budget
        fit before they even call you back — no re-explaining the lot, no
        cold pitch.
      </p>
      {!hasInState && (
        <p className="mt-2 text-sm text-caution">
          No Homey member builders in {report.state} yet — here are members
          in other states who take out-of-area referrals.
        </p>
      )}

      <div className="mt-6 grid gap-4 rounded-xl bg-sand/60 p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="connectName" className="block text-sm font-medium text-ink">
            Your name
          </label>
          <input
            id="connectName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Silva"
            className="mt-2 w-full rounded-lg border border-line bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>
        <div>
          <label htmlFor="connectPhone" className="block text-sm font-medium text-ink">
            Your phone
          </label>
          <input
            id="connectPhone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="mt-2 w-full rounded-lg border border-line bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-flag-bg px-4 py-3 text-sm text-flag">{error}</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {builders.map((builder) => {
          const connected = connectedIds.has(builder.id);
          return (
            <div
              key={builder.id}
              className="flex flex-col justify-between rounded-xl border border-line bg-paper p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink">{builder.businessName}</p>
                  <span className="shrink-0 rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest">
                    Homey Member
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  {builder.state === report.state
                    ? `Serving ${report.state}`
                    : `Based in ${builder.state} · takes out-of-area referrals`}
                </p>
                <p className="mt-2 text-sm text-ink-soft">{builder.tagline}</p>
              </div>
              <button
                onClick={() => handleConnect(builder)}
                disabled={connected}
                className={`mt-4 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  connected
                    ? "bg-clear-bg text-clear"
                    : "bg-forest text-paper hover:bg-forest-dark"
                }`}
              >
                {connected ? "Request sent ✓" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
