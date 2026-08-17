import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useRenoAuth } from "../context/RenoAuthContext";
import { getListing } from "../lib/renovationListings";
import { getBidsFor, getAcceptedBidId, acceptBid } from "../lib/bids";
import RenovationEstimateCard from "../components/RenovationEstimateCard";
import BidList from "../components/BidList";

export default function RenovateListingDetail() {
  const { listingId } = useParams();
  const { account } = useRenoAuth();
  const [, forceRerender] = useState(0);
  if (!account) return null;

  const listing = listingId ? getListing(listingId) : null;
  if (!listing || listing.consumerAccountId !== account.id) {
    return <Navigate to="/renovate/dashboard" replace />;
  }

  const bids = getBidsFor("renovation", listing.id);
  const acceptedBidId = getAcceptedBidId("renovation", listing.id);

  function handleAccept(bidId: string) {
    acceptBid("renovation", listing!.id, bidId);
    forceRerender((n) => n + 1);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <Link to="/renovate/dashboard" className="text-sm font-medium text-forest hover:underline">
        ← Back to your dashboard
      </Link>

      <div className="mt-6 rounded-2xl border border-line bg-paper-raised p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Posted listing
        </p>
        <h1 className="mt-1 font-serif text-2xl text-ink">
          Renovation project in {listing.state}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Posted {new Date(listing.createdAt).toLocaleDateString()} ·{" "}
          {bids.length} bid{bids.length === 1 ? "" : "s"} received
        </p>
      </div>

      <div className="mt-6">
        <RenovationEstimateCard estimate={listing.estimate} />
      </div>

      <h2 className="mt-8 font-serif text-xl text-ink">Bids</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Contractors serving {listing.state} can see this listing and respond
        with a price and timeline.
      </p>
      <div className="mt-4">
        <BidList bids={bids} acceptedBidId={acceptedBidId} onAccept={handleAccept} />
      </div>
    </div>
  );
}
