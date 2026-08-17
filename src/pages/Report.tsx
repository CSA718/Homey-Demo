import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { generateLotCheckReport, type LotCheckReport } from "../lib/lotCheck";
import { computeBudgetFit, type BuildTier } from "../lib/budgetFit";
import ReportView from "../components/ReportView";
import ConnectWithBuilders from "../components/ConnectWithBuilders";
import FloorPlanPreview from "../components/FloorPlanPreview";
import ReportBids from "../components/ReportBids";
import { useConsumerAuth } from "../context/ConsumerAuthContext";
import { saveLotCheck } from "../lib/lotCheckHistory";

const SCAN_STEPS = [
  { label: "Geocoding address (US Census Bureau)", live: true },
  { label: "Querying FEMA flood hazard layer", live: true },
  { label: "Wetlands & hydrography model", live: false },
  { label: "Watershed & wastewater sensitivity model", live: false },
  { label: "USDA NRCS soil survey model", live: false },
  { label: "Local zoning & setback model", live: false },
  { label: "State priority habitat model", live: false },
  { label: "Wellhead protection model", live: false },
];

export default function Report() {
  const [params] = useSearchParams();
  const address = params.get("address") ?? "";
  const city = params.get("city") ?? "";
  const state = params.get("state") ?? "";
  const email = params.get("email") ?? "";
  const budgetParam = params.get("budget");
  const sqftParam = params.get("sqft");
  const conceptSpec = {
    bedrooms: params.get("bedrooms") ?? "",
    bathrooms: params.get("bathrooms") ?? "",
    stories: params.get("stories") ?? "",
    garage: params.get("garage") ?? "",
    style: params.get("style") ?? "",
    notes: params.get("notes") ?? "",
    sqft: sqftParam ?? "",
  };
  const tierParam = params.get("tier") as BuildTier | null;

  const { account } = useConsumerAuth();
  const [report, setReport] = useState<LotCheckReport | null>(null);

  const budgetFit = useMemo(() => {
    if (!report || !budgetParam || !sqftParam || !tierParam) return null;
    const budget = Number(budgetParam);
    const sqft = Number(sqftParam);
    if (!Number.isFinite(budget) || !Number.isFinite(sqft) || budget <= 0 || sqft <= 0) {
      return null;
    }
    return computeBudgetFit(
      budget,
      sqft,
      tierParam,
      report.costRangeLow,
      report.costRangeHigh,
      report.landCostLow,
      report.landCostHigh,
    );
  }, [report, budgetParam, sqftParam, tierParam]);

  useEffect(() => {
    if (!account || !report) return;
    saveLotCheck(account.id, {
      reportParams: params.toString(),
      report,
      budgetFit,
    }).catch(() => {});
  }, [account, report, budgetFit, params]);

  const [scanned, setScanned] = useState(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!address.trim() || !city.trim() || !state) return;
    let cancelled = false;
    setReport(null);
    setScanned(0);

    tickRef.current = window.setInterval(() => {
      setScanned((s) => (s < SCAN_STEPS.length - 1 ? s + 1 : s));
    }, 450);

    generateLotCheckReport(address, city, state).then((result) => {
      if (cancelled) return;
      if (tickRef.current) window.clearInterval(tickRef.current);
      setScanned(SCAN_STEPS.length);
      window.setTimeout(() => {
        if (!cancelled) setReport(result);
      }, 400);
    });

    return () => {
      cancelled = true;
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [address, city, state]);

  if (!address.trim() || !city.trim() || !state) {
    return <Navigate to="/lot-check" replace />;
  }

  if (!report) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">
          Screening {address}…
        </h1>
        <p className="mt-2 text-ink-soft">
          Geocoding and querying public data sources for {city}, {state}{" "}
          parcel data.
        </p>
        <div className="mt-10 w-full space-y-3 text-left">
          {SCAN_STEPS.map((step, i) => {
            const done = i < scanned;
            const active = i === scanned;
            return (
              <div
                key={step.label}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  done
                    ? "border-clear/30 bg-clear-bg text-ink"
                    : active
                      ? "border-forest/40 bg-paper-raised text-ink"
                      : "border-line bg-paper-raised text-ink-soft/50"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {done ? (
                    <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6.5 L4.8 9 L10 3"
                        stroke="#2f7d4f"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : active ? (
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-forest" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-line" />
                  )}
                </span>
                <span className="flex-1">{step.label}</span>
                {step.live && (
                  <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest">
                    Live
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <div className="print:hidden">
        <Link to="/lot-check" className="text-sm font-medium text-forest hover:underline">
          ← Check another lot
        </Link>
      </div>

      <div className="mt-6">
        <ReportView report={report} budgetFit={budgetFit} />
      </div>

      <FloorPlanPreview spec={conceptSpec} />

      {account ? (
        <ConnectWithBuilders report={report} budgetFit={budgetFit} email={email} buyerAccountId={account.id} />
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-paper-raised p-6 text-center print:hidden">
          <p className="text-ink-soft">
            <Link to="/account/login" className="font-semibold text-forest hover:underline">
              Log in
            </Link>{" "}
            to connect with a member builder in {report.state}.
          </p>
        </div>
      )}

      <ReportBids reportId={report.id} />

      <div className="mt-10 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <p className="font-serif text-lg text-ink">Ready for the real thing?</p>
          <p className="text-sm text-ink-soft">
            This report used a live FEMA flood-zone lookup where available and
            modeled data elsewhere. A real Lot Check adds a signed
            professional review on top of all seven layers.
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
