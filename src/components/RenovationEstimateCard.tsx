import type { RenovationEstimate } from "../lib/renovation";
import { HOME_AGE_OPTIONS } from "../lib/renovation";

const STATUS_STYLE: Record<
  RenovationEstimate["status"],
  { bg: string; text: string; border: string; bar: string }
> = {
  comfortable: { bg: "bg-clear-bg", text: "text-clear", border: "border-clear/30", bar: "bg-clear" },
  tight: { bg: "bg-caution-bg", text: "text-caution", border: "border-caution/30", bar: "bg-caution" },
  short: { bg: "bg-flag-bg", text: "text-flag", border: "border-flag/30", bar: "bg-flag" },
};

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export default function RenovationEstimateCard({ estimate }: { estimate: RenovationEstimate }) {
  const style = STATUS_STYLE[estimate.status];
  const markerPct = Math.max(2, Math.min(98, estimate.likelihood));
  const ageDef = HOME_AGE_OPTIONS.find((a) => a.value === estimate.homeAge);

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Renovation Check
          </p>
          <h2 className="mt-1 font-serif text-xl text-ink">
            Your budget: {formatMoney(estimate.budget)}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {estimate.state} · state cost index ×{estimate.stateIndex.toFixed(2)} ·{" "}
            {ageDef?.label.toLowerCase()}
          </p>
        </div>
        <span
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${style.bg} ${style.text} ${style.border}`}
        >
          {estimate.statusLabel}
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
            title={`${estimate.likelihood}% likelihood`}
          />
        </div>
        <p className="mt-2 text-center text-sm text-ink-soft">
          <span className="font-semibold text-ink">{estimate.likelihood}%</span> likelihood your
          budget covers this scope of work
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-line bg-sand/50 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-2.5">Scope item</th>
              <th className="px-4 py-2.5">Quantity</th>
              <th className="px-4 py-2.5 text-right">Estimated cost</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lines.map((line) => (
              <tr key={line.category.key} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 text-ink">{line.category.label}</td>
                <td className="px-4 py-2.5 text-ink-soft">
                  {line.quantity} {line.category.unitLabel}
                </td>
                <td className="px-4 py-2.5 text-right text-ink">
                  {formatMoney(line.costLow)}–{formatMoney(line.costHigh)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-line bg-sand/30">
              <td className="px-4 py-2.5 font-medium text-ink" colSpan={2}>
                Subtotal
              </td>
              <td className="px-4 py-2.5 text-right font-medium text-ink">
                {formatMoney(estimate.subtotalLow)}–{formatMoney(estimate.subtotalHigh)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-ink-soft" colSpan={2}>
                + {estimate.contingencyPercent}% contingency ({ageDef?.label.toLowerCase()})
              </td>
              <td className="px-4 py-2.5 text-right text-ink-soft">
                {formatMoney(estimate.totalLow - estimate.subtotalLow)}–
                {formatMoney(estimate.totalHigh - estimate.subtotalHigh)}
              </td>
            </tr>
            <tr className="border-t border-line">
              <td className="px-4 py-3 font-serif text-base text-ink" colSpan={2}>
                Total estimated cost
              </td>
              <td className="px-4 py-3 text-right font-serif text-base text-ink">
                {formatMoney(estimate.totalLow)}–{formatMoney(estimate.totalHigh)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-ink-soft">
        {estimate.gap >= 0
          ? `${formatMoney(estimate.gap)} of cushion above the high end of the estimate.`
          : `${formatMoney(Math.abs(estimate.gap))} short of the high end of the estimate.`}
      </p>

      <p className="mt-6 rounded-lg bg-sand px-4 py-3 text-xs text-ink-soft">
        Estimate only. Per-category national cost ranges come from 2026
        contractor-cost industry surveys, scaled by {estimate.state}'s
        renovation cost index (×{estimate.stateIndex.toFixed(2)} vs. the
        national average) and a {estimate.contingencyPercent}% contingency
        for a home {ageDef?.label.toLowerCase()} — older homes more often
        turn up hidden costs once work is underway. Not a substitute for an
        in-person contractor quote, which will reflect your specific
        materials, labor market, and site conditions.
      </p>
    </div>
  );
}
