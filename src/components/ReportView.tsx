import type { LotCheckReport } from "../lib/lotCheck";
import type { BudgetFit } from "../lib/budgetFit";
import StatusBadge from "./StatusBadge";
import VerdictBadge from "./VerdictBadge";
import BudgetFitCard from "./BudgetFitCard";

function formatMoney(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

export default function ReportView({
  report,
  budgetFit,
}: {
  report: LotCheckReport;
  budgetFit?: BudgetFit | null;
}) {
  const submitted = new Date(report.submittedAt);
  const flagCount = report.categories.filter((c) => c.status === "flag").length;
  const cautionCount = report.categories.filter(
    (c) => c.status === "caution",
  ).length;
  const hasLiveData = report.categories.some((c) => c.live);

  return (
    <div>
      <div className="flex flex-col gap-6 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Lot Check Report · #{report.id.toUpperCase()}
            </p>
            <h1 className="mt-1 font-serif text-2xl text-ink sm:text-3xl">
              {report.address}
            </h1>
            <p className="mt-1 text-ink-soft">
              {report.city}, {report.state} · {report.parcelAcreage} acres · Screened{" "}
              {submitted.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {report.geocodedAddress && (
              <p className="mt-1 text-xs text-ink-soft">
                Located via US Census geocoder as {report.geocodedAddress}
              </p>
            )}
          </div>
          <VerdictBadge verdict={report.verdict} label={report.verdictLabel} />
        </div>

        <div className="grid gap-4 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Flags
            </p>
            <p className="mt-1 font-serif text-2xl text-flag">{flagCount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Cautions
            </p>
            <p className="mt-1 font-serif text-2xl text-caution">{cautionCount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Estimated added cost
            </p>
            <p className="mt-1 font-serif text-2xl text-ink">
              {report.costRangeHigh === 0
                ? "None identified"
                : `${formatMoney(report.costRangeLow)}–${formatMoney(report.costRangeHigh)}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Estimated land value
            </p>
            <p className="mt-1 font-serif text-2xl text-ink">
              {formatMoney(report.landCostLow)}–{formatMoney(report.landCostHigh)}
            </p>
          </div>
        </div>

        <p className="border-t border-line pt-4 text-xs text-ink-soft">
          {hasLiveData
            ? "Flood zone confirmed via a live FEMA query. Remaining categories use Homey's modeled public-data engine."
            : "This report uses Homey's modeled public-data engine for all categories."}
        </p>
      </div>

      {budgetFit && (
        <div className="mt-8">
          <BudgetFitCard fit={budgetFit} />
        </div>
      )}

      <div className="mt-8 space-y-4">
        {report.categories.map((cat) => (
          <div
            key={cat.key}
            className="rounded-xl border border-line bg-paper-raised p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg text-ink">{cat.label}</h3>
                <p className="text-xs text-ink-soft">
                  {cat.source}
                  {cat.live && (
                    <span className="ml-2 rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest">
                      Live
                    </span>
                  )}
                </p>
              </div>
              <StatusBadge status={cat.status} />
            </div>
            <p className="mt-3 text-ink-soft">{cat.finding}</p>
            {cat.costImpact && (
              <p className="mt-3 rounded-lg bg-sand px-4 py-2.5 text-sm text-ink">
                <span className="font-semibold">Estimated cost impact:</span>{" "}
                {cat.costImpact}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-sand/60 p-6 text-sm text-ink-soft">
        <p className="font-semibold text-ink">
          This is a preliminary screening, not a buildability determination.
        </p>
        <p className="mt-2">
          Findings are generated from public GIS data (US Census, FEMA, USDA
          NRCS, state and local records) and reviewed by a credentialed
          professional before delivery. Flagged and cautioned items identify
          risks that require site-specific verification — a wetland
          delineation, perc test, or survey — before you rely on them for a
          purchase or design decision.
        </p>
      </div>
    </div>
  );
}
