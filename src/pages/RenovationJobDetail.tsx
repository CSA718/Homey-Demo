import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getListing } from "../lib/renovationListings";
import { getBidsFor, getAcceptedBidId } from "../lib/bids";
import RenovationEstimateCard from "../components/RenovationEstimateCard";
import BidForm from "../components/BidForm";
import BidList from "../components/BidList";

export default function RenovationJobDetail() {
  const { listingId } = useParams();
  const { account } = useAuth();
  const [, forceRerender] = useState(0);
  if (!account) return null;

  const listing = listingId ? getListing(listingId) : null;
  if (!listing) return <Navigate to="/dashboard" replace />;

  const bids = getBidsFor("renovation", listing.id);
  const acceptedBidId = getAcceptedBidId("renovation", listing.id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <Link to="/dashboard" className="text-sm font-medium text-forest hover:underline">
        ← Back to dashboard
      </Link>

      <div className="mt-6 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Renovation job
        </p>
        <h1 className="mt-1 font-serif text-2xl text-ink">{listing.consumerName}</h1>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Email</p>
            <p className="text-ink">{listing.consumerEmail}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Phone</p>
            <p className="text-ink">{listing.consumerPhone}</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <BidForm
          targetType="renovation"
          targetId={listing.id}
          builderAccountId={account.id}
          builderName={account.businessName}
          onSubmitted={() => forceRerender((n) => n + 1)}
        />
      </div>

      <h2 className="mt-8 font-serif text-xl text-ink">All bids on this job</h2>
      <div className="mt-4">
        <BidList bids={bids} acceptedBidId={acceptedBidId} viewerBuilderAccountId={account.id} />
      </div>

      <div className="mt-8">
        <RenovationEstimateCard estimate={listing.estimate} />
      </div>
    </div>
  );
}
