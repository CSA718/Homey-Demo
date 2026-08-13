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

type Stage = "idle" | "generating" | "shown";

export default function HouseConceptPlaceholder({ spec }: { spec: HouseConceptSpec }) {
  const [stage, setStage] = useState<Stage>("idle");

  const hasSpec = spec.bedrooms || spec.bathrooms || spec.style;
  if (!hasSpec) return null;

  function handleGenerate() {
    setStage("generating");
    window.setTimeout(() => setStage("shown"), 1200);
  }

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

      {stage === "idle" && (
        <div className="mt-6 rounded-xl border-2 border-dashed border-line bg-sand/40 p-8 text-center">
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
            See an example of the kind of concept video Homey could generate
            from your specs.
          </p>
          <button
            onClick={handleGenerate}
            className="mt-4 rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
          >
            Generate concept video
          </button>
        </div>
      )}

      {stage === "generating" && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-sand/40 p-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-forest" />
          <p className="mt-4 text-sm text-ink-soft">Loading example…</p>
        </div>
      )}

      {stage === "shown" && (
        <div className="mt-6">
          <div className="relative overflow-hidden rounded-xl border border-line">
            <span className="absolute left-3 top-3 z-10 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-paper backdrop-blur-sm">
              Example — not personalized
            </span>
            <video
              autoPlay
              loop
              muted
              playsInline
              className="block w-full bg-ink"
            >
              <source src="/concept-example.webm" type="video/webm" />
              <source src="/concept-example.mp4" type="video/mp4" />
            </video>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            This is a generic sample animation, not generated from your
            address or the specs above — there's no AI image or video model
            wired into this demo. In production, Homey would send your
            actual inputs to an AI video service (e.g. Runway, Sora) to
            render a real concept walkthrough.
          </p>
        </div>
      )}
    </div>
  );
}
