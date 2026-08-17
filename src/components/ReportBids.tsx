import { useState } from "react";
import { getBidsFor, getAcceptedBidId, acceptBid } from "../lib/bids";

export default function ReportBids({ reportId }: { reportId: string }) {
  const [, forceRerender] = useState(0);
  const bids = getBidsFor("lot-check", reportId);
  const acceptedBidId = getAcceptedBidId("lot-check", reportId);

  if (bids.length === 0) return null;

  function handleAccept(bidId: string) {
    acceptBid("lot-check", reportId, bidId);
    forceRerender((n) => n + 1);
  }

  return (
    <div className="mt-8 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8 print:hidden">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Bids from builders
      </p>
      <h2 className="mt-1 font-serif text-xl text-ink">
        {bids.length} builder{bids.length === 1 ? " has" : "s have"} responded
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Bookmark this report link to check back — bids can arrive after
        builders review your budget and screening results.
      </p>
      <div className="mt-4 space-y-3">
        {bids.map((bid) => (
          <div key={bid.id} className="rounded-xl border border-line bg-paper p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{bid.builderName}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Submitted {new Date(bid.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-serif text-lg text-ink">
                  ${bid.priceLow.toLocaleString("en-US")}–${bid.priceHigh.toLocaleString("en-US")}
                </p>
                <p className="text-xs text-ink-soft">
                  ~{bid.estimatedWeeks} week{bid.estimatedWeeks === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            {bid.message && <p className="mt-3 text-sm text-ink-soft">"{bid.message}"</p>}
            <div className="mt-4">
              {acceptedBidId === bid.id ? (
                <span className="rounded-full bg-clear-bg px-3 py-1 text-xs font-semibold text-clear">
                  Accepted
                </span>
              ) : (
                <button
                  onClick={() => handleAccept(bid.id)}
                  className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
                >
                  Accept this bid
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
