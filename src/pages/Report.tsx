import { useMemo } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { generateLotCheckReport } from "../lib/lotCheck";
import StatusBadge from "../components/StatusBadge";

const VERDICT_STYLE: Record<
  ReturnType<typeof generateLotCheckReport>["verdict"],
  { bg: string; text: string; border: string }
> = {
  buildable: { bg: "bg-clear-bg", text: "text-clear", border: "border-clear/30" },
  conditional: {
    bg: "bg-caution-bg",
    text: "text-caution",
    border: "border-caution/30",
  },
  "high-risk": { bg: "bg-flag-bg", text: "text-flag", border: "border-flag/30" },
};

function formatMoney(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

export default function Report() {
  const [params] = useSearchParams();
  const address = params.get("address") ?? "";
  const town = params.get("town") ?? "";

  const report = useMemo(() => {
    if (!address.trim() || !town) return null;
    return generateLotCheckReport(address, town);
  }, [address, town]);

  if (!report) {
    return <Navigate to="/lot-check" replace />;
  }

  const style = VERDICT_STYLE[report.verdict];
  const submitted = new Date(report.submittedAt);
  const flagCount = report.categories.filter((c) => c.status === "flag").length;
  const cautionCount = report.categories.filter(
    (c) => c.status === "caution",
  ).length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <div className="print:hidden">
        <Link to="/lot-check" className="text-sm font-medium text-forest hover:underline">
          ← Check another lot
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-6 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Lot Check Report · #{report.id.toUpperCase()}
            </p>
            <h1 className="mt-1 font-serif text-2xl text-ink sm:text-3xl">
              {report.address}
            </h1>
            <p className="mt-1 text-ink-soft">
              {report.town}, MA · {report.parcelAcreage} acres · Screened{" "}
              {submitted.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${style.bg} ${style.text} ${style.border}`}
          >
            {report.verdictLabel}
          </span>
        </div>

        <div className="grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
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
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {report.categories.map((cat) => (
          <div
            key={cat.key}
            className="rounded-xl border border-line bg-paper-raised p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg text-ink">{cat.label}</h3>
                <p className="text-xs text-ink-soft">{cat.source}</p>
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
          Findings are generated from public GIS data (MassGIS, MassDEP,
          FEMA, USDA NRCS, town records) and reviewed by a credentialed
          professional before delivery. Flagged and cautioned items identify
          risks that require site-specific verification — a wetland
          delineation, perc test, or survey — before you rely on them for a
          purchase or design decision.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <p className="font-serif text-lg text-ink">Ready for the real thing?</p>
          <p className="text-sm text-ink-soft">
            This is a demo report generated instantly. A real Lot Check is
            $149 with a 48-hour turnaround and a signed professional review.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/lot-check"
            className="rounded-full bg-forest px-6 py-3 text-center text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
          >
            Check another lot
          </Link>
          <Link
            to="/builders"
            className="rounded-full border border-line px-6 py-3 text-center text-sm font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
          >
            I'm a builder
          </Link>
        </div>
      </div>
    </div>
  );
}
