import { useState } from "react";
import { GARAGE_OPTIONS } from "../lib/homeSpec";

export interface HouseConceptSpec {
  bedrooms: string;
  bathrooms: string;
  stories: string;
  garage: string;
  style: string;
  notes: string;
}

function garageLabel(value: string) {
  return GARAGE_OPTIONS.find((g) => g.value === value)?.label ?? value;
}

export default function HouseConceptPlaceholder({ spec }: { spec: HouseConceptSpec }) {
  const [requested, setRequested] = useState(false);

  const hasSpec = spec.bedrooms || spec.bathrooms || spec.style;
  if (!hasSpec) return null;

  return (
    <div className="mt-8 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8 print:hidden">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Concept Preview
      </p>
      <h2 className="mt-1 font-serif text-xl text-ink">
        See what this could look like
      </h2>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-sand px-3 py-1 text-ink-soft">
          {spec.bedrooms} bed
        </span>
        <span className="rounded-full bg-sand px-3 py-1 text-ink-soft">
          {spec.bathrooms} bath
        </span>
        <span className="rounded-full bg-sand px-3 py-1 text-ink-soft">
          {spec.stories} {spec.stories === "1" ? "story" : "stories"}
        </span>
        <span className="rounded-full bg-sand px-3 py-1 text-ink-soft">
          {garageLabel(spec.garage)} garage
        </span>
        <span className="rounded-full bg-sand px-3 py-1 text-ink-soft">{spec.style}</span>
      </div>
      {spec.notes && (
        <p className="mt-3 text-sm italic text-ink-soft">"{spec.notes}"</p>
      )}

      <div className="mt-6 rounded-xl border-2 border-dashed border-line bg-sand/40 p-8 text-center">
        {!requested ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest/10">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 10l4.55-2.5A1 1 0 0121 8.37v7.26a1 1 0 01-1.45.87L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  stroke="#1f4a37"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mt-3 font-semibold text-ink">Generate a concept video</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              In a production build, this button would send your specs to an
              AI video generation service to render a walkthrough concept.
            </p>
            <button
              onClick={() => setRequested(true)}
              className="mt-4 rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
            >
              Generate concept video
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-caution-bg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 8v5m0 3h.01M10.29 3.86l-8.18 14.18A1.5 1.5 0 003.5 20.5h17a1.5 1.5 0 001.39-2.46L13.71 3.86a1.5 1.5 0 00-2.42 0z"
                  stroke="#b3781f"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mt-3 font-semibold text-ink">Not available in this demo</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              This is a placeholder — there's no AI video generation wired up
              here. In a real deployment, this is where a service like
              Runway or Sora would render a short concept walkthrough of a{" "}
              {spec.stories}-story, {spec.style.toLowerCase()} home with{" "}
              {spec.bedrooms} bedrooms based on the specs above.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
