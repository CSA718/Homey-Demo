import type { Bid } from "../lib/bids";

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export default function BidList({
  bids,
  acceptedBidId,
  onAccept,
  viewerBuilderAccountId,
}: {
  bids: Bid[];
  acceptedBidId?: string | null;
  onAccept?: (bidId: string) => void;
  viewerBuilderAccountId?: string;
}) {
  if (bids.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-paper-raised p-8 text-center">
        <p className="text-ink-soft">No bids yet — check back as contractors respond.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bids.map((bid) => {
        const isMine = viewerBuilderAccountId && bid.builderAccountId === viewerBuilderAccountId;
        const isAccepted = acceptedBidId === bid.id;
        return (
          <div
            key={bid.id}
            className={`rounded-xl border p-5 ${
              isAccepted ? "border-clear/40 bg-clear-bg" : "border-line bg-paper-raised"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">
                  {bid.builderName}
                  {isMine && <span className="ml-2 text-xs font-normal text-ink-soft">(you)</span>}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  Submitted {new Date(bid.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-serif text-lg text-ink">
                  {formatMoney(bid.priceLow)}–{formatMoney(bid.priceHigh)}
                </p>
                <p className="text-xs text-ink-soft">
                  ~{bid.estimatedWeeks} week{bid.estimatedWeeks === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            {bid.message && <p className="mt-3 text-sm text-ink-soft">"{bid.message}"</p>}
            <div className="mt-4 flex items-center gap-3">
              {isAccepted && (
                <span className="rounded-full bg-clear-bg px-3 py-1 text-xs font-semibold text-clear">
                  Accepted
                </span>
              )}
              {onAccept && !isAccepted && (
                <button
                  onClick={() => onAccept(bid.id)}
                  className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
                >
                  Accept this bid
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
