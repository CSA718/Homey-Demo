import { useState } from "react";
import { submitBid, getBidByBuilder, type BidTargetType } from "../lib/bids";

export default function BidForm({
  targetType,
  targetId,
  builderAccountId,
  builderName,
  onSubmitted,
}: {
  targetType: BidTargetType;
  targetId: string;
  builderAccountId: string;
  builderName: string;
  onSubmitted: () => void;
}) {
  const existing = getBidByBuilder(targetType, targetId, builderAccountId);
  const [priceLow, setPriceLow] = useState(existing ? String(existing.priceLow) : "");
  const [priceHigh, setPriceHigh] = useState(existing ? String(existing.priceHigh) : "");
  const [estimatedWeeks, setEstimatedWeeks] = useState(
    existing ? String(existing.estimatedWeeks) : "",
  );
  const [message, setMessage] = useState(existing?.message ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const low = Number(priceLow);
    const high = Number(priceHigh);
    const weeks = Number(estimatedWeeks);
    if (!low || !high || high < low || !weeks) {
      setError("Enter a valid price range (low ≤ high) and estimated timeline.");
      return;
    }
    setError(null);
    submitBid({
      targetType,
      targetId,
      builderAccountId,
      builderName,
      priceLow: low,
      priceHigh: high,
      estimatedWeeks: weeks,
      message: message.trim(),
    });
    setSaved(true);
    onSubmitted();
  }

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {existing ? "Your bid" : "Submit a bid"}
      </p>
      <h2 className="mt-1 font-serif text-xl text-ink">
        {existing ? "Update your estimate" : "Give this client a price and timeline"}
      </h2>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="priceLow" className="block text-sm font-medium text-ink">
              Price — low
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
                $
              </span>
              <input
                id="priceLow"
                type="number"
                min={0}
                step={500}
                value={priceLow}
                onChange={(e) => setPriceLow(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper py-2.5 pl-8 pr-3 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>
          <div>
            <label htmlFor="priceHigh" className="block text-sm font-medium text-ink">
              Price — high
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
                $
              </span>
              <input
                id="priceHigh"
                type="number"
                min={0}
                step={500}
                value={priceHigh}
                onChange={(e) => setPriceHigh(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper py-2.5 pl-8 pr-3 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>
          <div>
            <label htmlFor="estimatedWeeks" className="block text-sm font-medium text-ink">
              Timeline (weeks)
            </label>
            <input
              id="estimatedWeeks"
              type="number"
              min={1}
              value={estimatedWeeks}
              onChange={(e) => setEstimatedWeeks(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>
        <div>
          <label htmlFor="bidMessage" className="block text-sm font-medium text-ink">
            Note to the client <span className="text-ink-soft">(optional)</span>
          </label>
          <textarea
            id="bidMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="e.g. availability, what's included, why your bid looks the way it does"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>
        {error && <p className="rounded-lg bg-flag-bg px-4 py-3 text-sm text-flag">{error}</p>}
        <button
          type="submit"
          className="rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
        >
          {existing ? "Update bid" : "Submit bid"}
        </button>
        {saved && (
          <span className="ml-3 text-sm text-clear">Saved ✓</span>
        )}
      </form>
    </div>
  );
}
