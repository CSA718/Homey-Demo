import { useState } from "react";
import { Link } from "react-router-dom";
import { US_STATES } from "../lib/lotCheck";
import {
  RENOVATION_CATEGORIES,
  HOME_AGE_OPTIONS,
  computeRenovationEstimate,
  type HomeAge,
  type RenovationScopeItem,
  type RenovationEstimate,
} from "../lib/renovation";
import { useRenoAuth } from "../context/RenoAuthContext";
import { saveCheck } from "../lib/renoChecks";
import RenovationEstimateCard from "../components/RenovationEstimateCard";
import PostRenovationListing from "../components/PostRenovationListing";

function defaultQuantity(unit: string) {
  if (unit === "sqft") return 200;
  return 1;
}

export default function RenovateCheck() {
  const { account } = useRenoAuth();
  const [state, setState] = useState("");
  const [homeAge, setHomeAge] = useState<HomeAge>("recent");
  const [budget, setBudget] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [stage, setStage] = useState<"form" | "computing" | "result">("form");
  const [estimate, setEstimate] = useState<RenovationEstimate | null>(null);
  const [submittedScope, setSubmittedScope] = useState<RenovationScopeItem[]>([]);

  const selectedKeys = Object.keys(quantities).filter((k) => quantities[k] > 0);

  function toggleCategory(key: string, unit: string) {
    setQuantities((prev) => {
      const next = { ...prev };
      if (next[key] > 0) {
        delete next[key];
      } else {
        next[key] = defaultQuantity(unit);
      }
      return next;
    });
  }

  function setQuantity(key: string, value: number) {
    setQuantities((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !state || !budget || selectedKeys.length === 0) return;

    setStage("computing");
    window.setTimeout(() => {
      const scope: RenovationScopeItem[] = selectedKeys.map((categoryKey) => ({
        categoryKey,
        quantity: quantities[categoryKey],
      }));
      const result = computeRenovationEstimate(Number(budget), state, homeAge, scope);
      setEstimate(result);
      setSubmittedScope(scope);
      saveCheck(account.id, { state, homeAge, budget: Number(budget), scope, estimate: result });
      setStage("result");
    }, 900);
  }

  function handleReset() {
    setEstimate(null);
    setQuantities({});
    setBudget("");
    setStage("form");
  }

  if (stage === "computing") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-forest" />
        <p className="mt-6 font-serif text-xl text-ink">
          Checking {state}-adjusted pricing…
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Applying the state renovation cost index and your home's age
          contingency to each scope item.
        </p>
      </div>
    );
  }

  if (stage === "result" && estimate && account) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <RenovationEstimateCard estimate={estimate} />
        <PostRenovationListing
          account={account}
          state={state}
          homeAge={homeAge}
          budget={Number(budget)}
          scope={submittedScope}
          estimate={estimate}
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={handleReset}
            className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
          >
            Run another check
          </button>
          <Link
            to="/renovate/dashboard"
            className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
          >
            View saved checks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
        Renovation Check
      </span>
      <h1 className="mt-6 font-serif text-3xl text-ink sm:text-4xl">
        Describe the work. We'll check it against your budget.
      </h1>
      <p className="mt-4 text-ink-soft">
        Pick a state and home age, set your budget, and check off everything
        you're planning — kitchen to roof to HVAC. Costs are scaled to your
        state's renovation cost index for a more realistic number.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-10 space-y-6 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-ink">
              State (property location)
            </label>
            <select
              id="state"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            >
              <option value="" disabled>
                Select
              </option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="homeAge" className="block text-sm font-medium text-ink">
              Home age
            </label>
            <select
              id="homeAge"
              value={homeAge}
              onChange={(e) => setHomeAge(e.target.value as HomeAge)}
              className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            >
              {HOME_AGE_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-soft">
              Older homes carry a higher contingency for hidden costs.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-ink">
            Renovation budget
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
              $
            </span>
            <input
              id="budget"
              type="number"
              required
              min={0}
              step={1000}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="60000"
              className="w-full rounded-lg border border-line bg-paper py-2.5 pl-8 pr-4 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div className="border-t border-line pt-5">
          <p className="text-sm font-semibold text-ink">Scope of work</p>
          <p className="mt-1 text-xs text-ink-soft">
            Check off everything you're planning and enter a rough quantity
            for each.
          </p>
          <div className="mt-4 space-y-3">
            {RENOVATION_CATEGORIES.map((cat) => {
              const checked = quantities[cat.key] > 0;
              return (
                <div
                  key={cat.key}
                  className={`rounded-xl border p-4 transition-colors ${
                    checked ? "border-forest/40 bg-forest/5" : "border-line bg-paper"
                  }`}
                >
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(cat.key, cat.unit)}
                      className="mt-1 h-4 w-4 rounded border-line text-forest focus:ring-forest/30"
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-ink">{cat.label}</span>
                      <span className="block text-xs text-ink-soft">{cat.helpText}</span>
                    </span>
                  </label>
                  {checked && (
                    <div className="mt-3 flex items-center gap-2 pl-7">
                      <input
                        type="number"
                        min={1}
                        value={quantities[cat.key]}
                        onChange={(e) => setQuantity(cat.key, Number(e.target.value) || 1)}
                        className="w-28 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                      />
                      <span className="text-xs text-ink-soft">{cat.unitLabel}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={selectedKeys.length === 0}
          className="w-full rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Check my budget
        </button>
      </form>
    </div>
  );
}
