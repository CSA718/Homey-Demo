import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SOUTHEASTERN_MA_TOWNS } from "../lib/lotCheck";

const SCAN_LAYERS = [
  "MassGIS parcel geometry",
  "MassDEP wetlands & hydrography",
  "Nitrogen-sensitive watersheds",
  "FEMA flood hazard layer",
  "USDA NRCS soil survey",
  "Town zoning & setbacks",
  "NHESP priority habitat",
  "MassDEP wellhead protection",
];

export default function LotCheck() {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [town, setTown] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanned, setScanned] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || !town) return;
    setSubmitting(true);
    setScanned(0);
    runScan(0);
  }

  function runScan(step: number) {
    if (step >= SCAN_LAYERS.length) {
      timeoutRef.current = window.setTimeout(() => {
        navigate(
          `/report?address=${encodeURIComponent(address)}&town=${encodeURIComponent(town)}`,
        );
      }, 500);
      return;
    }
    timeoutRef.current = window.setTimeout(() => {
      setScanned(step + 1);
      runScan(step + 1);
    }, 260);
  }

  if (submitting) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">
          Screening {address || "your parcel"}…
        </h1>
        <p className="mt-2 text-ink-soft">
          Querying public GIS layers for {town} parcel data.
        </p>
        <div className="mt-10 w-full space-y-3 text-left">
          {SCAN_LAYERS.map((layer, i) => {
            const done = i < scanned;
            const active = i === scanned;
            return (
              <div
                key={layer}
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
                {layer}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16 sm:py-24">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
        Lot Check · $149
      </span>
      <h1 className="mt-6 font-serif text-3xl text-ink sm:text-4xl">
        Find out if a lot is buildable.
      </h1>
      <p className="mt-4 text-ink-soft">
        Enter the parcel address and town. We'll screen it against wetlands,
        flood zone, soil, zoning, priority habitat, and wellhead protection
        data, and deliver a two-page report within 48 hours.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-10 space-y-5 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8"
      >
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-ink">
            Parcel address
          </label>
          <input
            id="address"
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 42 Fearing Hill Rd"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <div>
          <label htmlFor="town" className="block text-sm font-medium text-ink">
            Town
          </label>
          <select
            id="town"
            required
            value={town}
            onChange={(e) => setTown(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          >
            <option value="" disabled>
              Select a town
            </option>
            {SOUTHEASTERN_MA_TOWNS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email <span className="text-ink-soft">(optional, for the demo)</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark disabled:opacity-50"
        >
          Run Lot Check
        </button>
        <p className="text-center text-xs text-ink-soft">
          This demo generates a sample report instantly — no payment, no real
          GIS lookup, no data stored.
        </p>
      </form>
    </div>
  );
}
