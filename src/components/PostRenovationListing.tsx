import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMatchedBuilders } from "../lib/builderDirectory";
import { createListing } from "../lib/renovationListings";
import type { ConsumerAccount } from "../lib/consumerAuth";
import type { HomeAge, RenovationEstimate, RenovationScopeItem } from "../lib/renovation";

export default function PostRenovationListing({
  account,
  state,
  homeAge,
  budget,
  scope,
  estimate,
}: {
  account: ConsumerAccount;
  state: string;
  homeAge: HomeAge;
  budget: number;
  scope: RenovationScopeItem[];
  estimate: RenovationEstimate;
}) {
  const navigate = useNavigate();
  const contractors = useMemo(() => getMatchedBuilders(state), [state]);
  const hasInState = contractors.some((c) => c.state === state);

  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<string | null>(null);

  if (contractors.length === 0) return null;

  function handlePost() {
    if (phone.trim().length < 7) {
      setError("Enter a phone number so contractors can reach you.");
      return;
    }
    setError(null);
    const listing = createListing({
      consumerAccountId: account.id,
      consumerName: account.name,
      consumerEmail: account.email,
      consumerPhone: phone.trim(),
      state,
      homeAge,
      budget,
      scope,
      estimate,
    });
    setPosted(listing.id);
  }

  if (posted) {
    return (
      <div className="mt-6 rounded-2xl border border-clear/30 bg-clear-bg p-6 text-center">
        <p className="font-semibold text-ink">
          Posted — visible to {contractors.filter((c) => c.state === state).length || contractors.length}{" "}
          matched contractor{contractors.length === 1 ? "" : "s"} in {state}.
        </p>
        <button
          onClick={() => navigate(`/account/listings/${posted}`)}
          className="mt-3 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
        >
          View bids
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Next step
      </p>
      <h2 className="mt-1 font-serif text-xl text-ink">
        Post this project for contractor bids in {state}
      </h2>
      <p className="mt-2 text-ink-soft">
        Member contractors serving {state} can see this exact scope of work
        and budget, and submit a price and timeline directly — no
        re-explaining the job.
      </p>
      {!hasInState && (
        <p className="mt-2 text-sm text-caution">
          No Homey member contractors in {state} yet — here are members in
          other states who take out-of-area referrals.
        </p>
      )}

      <div className="mt-5 max-w-xs">
        <label htmlFor="listingPhone" className="block text-sm font-medium text-ink">
          Your phone
        </label>
        <input
          id="listingPhone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-flag-bg px-4 py-3 text-sm text-flag">{error}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {contractors.slice(0, 6).map((c) => (
          <span key={c.id} className="rounded-full bg-sand px-3 py-1 text-xs text-ink-soft">
            {c.businessName}
          </span>
        ))}
      </div>

      <button
        onClick={handlePost}
        className="mt-6 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
      >
        Post for contractor bids
      </button>
    </div>
  );
}
