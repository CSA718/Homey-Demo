import { useState } from "react";
import type { Lead } from "../lib/leads";
import { updateBuilderEstimate } from "../lib/leads";
import {
  buildDefaultEstimate,
  computeEstimateSummary,
  suggestTurnaroundWeeks,
  type BuilderEstimate,
} from "../lib/costEstimate";

const STATUS_STYLE: Record<
  ReturnType<typeof computeEstimateSummary>["status"],
  { bg: string; text: string; border: string }
> = {
  fits: { bg: "bg-clear-bg", text: "text-clear", border: "border-clear/30" },
  tight: { bg: "bg-caution-bg", text: "text-caution", border: "border-caution/30" },
  exceeds: { bg: "bg-flag-bg", text: "text-flag", border: "border-flag/30" },
};

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export default function BuilderEstimateTool({
  accountId,
  lead,
  onSave,
}: {
  accountId: string;
  lead: Lead;
  onSave: (estimate: BuilderEstimate) => void;
}) {
  const [estimate, setEstimate] = useState<BuilderEstimate>(
    () => lead.builderEstimate ?? buildDefaultEstimate(lead.budgetFit),
  );
  const [saved, setSaved] = useState(!!lead.builderEstimate);

  const flagCount = lead.report.categories.filter((c) => c.status === "flag").length;
  const cautionCount = lead.report.categories.filter((c) => c.status === "caution").length;

  const summary = computeEstimateSummary(
    estimate,
    lead.budgetFit,
    lead.report.costRangeLow,
    lead.report.costRangeHigh,
  );
  const style = STATUS_STYLE[summary.status];

  function updateAmount(key: string, amount: number) {
    setSaved(false);
    setEstimate((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.key === key ? { ...item, amount } : item,
      ),
    }));
  }

  async function handleSave() {
    const toSave: BuilderEstimate = { ...estimate, updatedAt: new Date().toISOString() };
    await updateBuilderEstimate(accountId, lead.id, toSave);
    setEstimate(toSave);
    setSaved(true);
    onSave(toSave);
  }

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Builder Estimate
      </p>
      <h2 className="mt-1 font-serif text-xl text-ink">
        Your cost breakdown for this build
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Fill in your own line-item numbers. ClearLot checks the total against
        what the buyer said they can spend and shows the markup you can
        realistically charge.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {estimate.lineItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3">
            <label htmlFor={`li-${item.key}`} className="text-sm text-ink-soft">
              {item.label}
            </label>
            <div className="relative w-36">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
                $
              </span>
              <input
                id={`li-${item.key}`}
                type="number"
                min={0}
                step={100}
                value={item.amount}
                onChange={(e) => updateAmount(item.key, Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-line bg-paper py-1.5 pl-6 pr-2 text-right text-sm text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
        <div>
          <label htmlFor="targetMargin" className="block text-sm font-medium text-ink">
            Target margin (%)
          </label>
          <input
            id="targetMargin"
            type="number"
            min={0}
            max={100}
            step={1}
            value={estimate.targetMarginPercent}
            onChange={(e) => {
              setSaved(false);
              setEstimate((prev) => ({
                ...prev,
                targetMarginPercent: Number(e.target.value) || 0,
              }));
            }}
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>
        <div>
          <label htmlFor="turnaround" className="block text-sm font-medium text-ink">
            Estimated turnaround (weeks)
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="turnaround"
              type="number"
              min={1}
              step={1}
              value={estimate.turnaroundWeeks}
              onChange={(e) => {
                setSaved(false);
                setEstimate((prev) => ({
                  ...prev,
                  turnaroundWeeks: Number(e.target.value) || 0,
                }));
              }}
              className="w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
            <button
              type="button"
              onClick={() => {
                setSaved(false);
                setEstimate((prev) => ({
                  ...prev,
                  turnaroundWeeks: suggestTurnaroundWeeks(
                    lead.budgetFit,
                    flagCount,
                    cautionCount,
                  ),
                }));
              }}
              className="shrink-0 rounded-lg border border-line px-3 text-xs font-semibold text-ink-soft transition-colors hover:border-forest hover:text-forest"
            >
              Suggest
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            Based on size, tier, and {flagCount + cautionCount} permitting
            flag(s)/caution(s) from the screening.
          </p>
        </div>
      </div>

      <div className={`mt-6 rounded-xl border p-5 ${style.bg} ${style.border}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`font-semibold ${style.text}`}>{summary.statusLabel}</p>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${style.bg} ${style.text} ${style.border}`}>
            {summary.breakEvenMarginPercent >= 0
              ? `Break-even margin: ${summary.breakEvenMarginPercent.toFixed(1)}%`
              : `Over cost by ${formatMoney(Math.abs(summary.impliedConstructionBudget - summary.totalCost))}`}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Your total cost</p>
            <p className="mt-1 font-serif text-xl text-ink">{formatMoney(summary.totalCost)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              Buyer's construction budget
            </p>
            <p className="mt-1 font-serif text-xl text-ink">
              {formatMoney(summary.impliedConstructionBudget)}
            </p>
            <p className="text-xs text-ink-soft">after land + site costs</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              Price at {estimate.targetMarginPercent}% margin
            </p>
            <p className="mt-1 font-serif text-xl text-ink">{formatMoney(summary.requiredPrice)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Gap to buyer budget</p>
            <p className={`mt-1 font-serif text-xl ${summary.gap >= 0 ? "text-clear" : "text-flag"}`}>
              {summary.gap >= 0 ? "+" : "−"}
              {formatMoney(Math.abs(summary.gap))}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          className="rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
        >
          Save estimate
        </button>
        {saved && <span className="text-sm text-clear">Saved ✓</span>}
      </div>
    </div>
  );
}
