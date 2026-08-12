import type { BudgetFit } from "../lib/budgetFit";
import { BUILD_TIERS } from "../lib/budgetFit";

const STATUS_STYLE: Record<
  BudgetFit["status"],
  { bg: string; text: string; border: string; bar: string }
> = {
  comfortable: {
    bg: "bg-clear-bg",
    text: "text-clear",
    border: "border-clear/30",
    bar: "bg-clear",
  },
  tight: {
    bg: "bg-caution-bg",
    text: "text-caution",
    border: "border-caution/30",
    bar: "bg-caution",
  },
  short: {
    bg: "bg-flag-bg",
    text: "text-flag",
    border: "border-flag/30",
    bar: "bg-flag",
  },
};

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export default function BudgetFitCard({ fit }: { fit: BudgetFit }) {
  const style = STATUS_STYLE[fit.status];
  const tierDef = BUILD_TIERS.find((t) => t.value === fit.tier);
  const markerPct = Math.max(2, Math.min(98, fit.likelihood));

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Budget Fit
          </p>
          <h2 className="mt-1 font-serif text-xl text-ink">
            Your budget: {formatMoney(fit.budget)}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {fit.sqft.toLocaleString("en-US")} sq ft · {tierDef?.label ?? "Semi-Custom"} tier
          </p>
        </div>
        <span
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${style.bg} ${style.text} ${style.border}`}
        >
          {fit.statusLabel}
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-ink-soft">
          <span>Likely short</span>
          <span>Estimated cost range</span>
          <span>Comfortable</span>
        </div>
        <div className="relative mt-2 h-3 rounded-full bg-sand">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${style.bar}`}
            style={{ width: `${markerPct}%` }}
          />
          <div
            className="absolute top-1/2 h-5 w-5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-paper-raised bg-ink shadow"
            style={{ left: `${markerPct}%` }}
            title={`${fit.likelihood}% likelihood`}
          />
        </div>
        <p className="mt-2 text-center text-sm text-ink-soft">
          <span className="font-semibold text-ink">{fit.likelihood}%</span> likelihood your budget
          covers this build
        </p>
      </div>

      <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Estimated land value
          </p>
          <p className="mt-1 text-ink">
            {formatMoney(fit.landCostLow)}–{formatMoney(fit.landCostHigh)}
          </p>
          <p className="text-xs text-ink-soft">Modeled from town + parcel acreage</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Base construction estimate
          </p>
          <p className="mt-1 text-ink">
            {formatMoney(fit.baseCostLow)}–{formatMoney(fit.baseCostHigh)}
          </p>
          <p className="text-xs text-ink-soft">
            {fit.sqft.toLocaleString("en-US")} sq ft × ${tierDef?.rateLow}–{tierDef?.rateHigh}/sq ft
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Total estimated cost
          </p>
          <p className="mt-1 text-ink">
            {formatMoney(fit.totalCostLow)}–{formatMoney(fit.totalCostHigh)}
          </p>
          <p className="text-xs text-ink-soft">
            {fit.gap >= 0
              ? `${formatMoney(fit.gap)} of cushion above the high end`
              : `${formatMoney(Math.abs(fit.gap))} short of the high end`}
          </p>
        </div>
      </div>

      <p className="mt-6 rounded-lg bg-sand px-4 py-3 text-xs text-ink-soft">
        Estimate only — land value is modeled from this town's typical
        per-acre range and the parcel's acreage (not a lookup of this
        specific lot's asking or sale price), construction cost is a
        regional per-square-foot range for the selected build tier, and site
        costs come from the screening above. Not a substitute for an
        appraisal or a contractor's quote.
      </p>
    </div>
  );
}
