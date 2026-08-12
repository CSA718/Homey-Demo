import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { US_STATES } from "../lib/lotCheck";
import { BUILD_TIERS, type BuildTier } from "../lib/budgetFit";

export default function LotCheck() {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [email, setEmail] = useState("");
  const [budget, setBudget] = useState("");
  const [sqft, setSqft] = useState("2400");
  const [tier, setTier] = useState<BuildTier>("custom");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || !city.trim() || !state || !budget || !sqft) return;
    const params = new URLSearchParams({
      type: "lotcheck",
      address,
      city,
      state,
      email,
      budget,
      sqft,
      tier,
    });
    navigate(`/checkout?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16 sm:py-24">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
        Lot Check · $25
      </span>
      <h1 className="mt-6 font-serif text-3xl text-ink sm:text-4xl">
        Find out if a lot is buildable — and if your budget covers it.
      </h1>
      <p className="mt-4 text-ink-soft">
        Enter the parcel address, city, and state — anywhere in the U.S. —
        plus what you're planning to spend. We'll geocode it, check it live
        against FEMA's flood hazard data, screen it against wetlands, soil,
        zoning, priority habitat, and wellhead protection data — and compare
        your budget against a realistic estimated build cost for this lot.
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

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-ink">
              City
            </label>
            <input
              id="city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Wareham"
              className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-ink">
              State
            </label>
            <select
              id="state"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            >
              <option value="" disabled>
                Select
              </option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <div className="border-t border-line pt-5">
          <p className="text-sm font-semibold text-ink">Your budget</p>
          <p className="mt-1 text-xs text-ink-soft">
            Used to estimate whether your budget realistically covers this
            build — not shared with anyone.
          </p>

          <div className="mt-4">
            <label htmlFor="budget" className="block text-sm font-medium text-ink">
              Target budget
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
                $
              </span>
              <input
                id="budget"
                type="number"
                required
                min={0}
                step={5000}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="650000"
                className="w-full rounded-lg border border-line bg-paper py-2.5 pl-8 pr-4 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sqft" className="block text-sm font-medium text-ink">
                Desired size (sq ft)
              </label>
              <input
                id="sqft"
                type="number"
                required
                min={400}
                step={100}
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div>
              <label htmlFor="tier" className="block text-sm font-medium text-ink">
                Build tier
              </label>
              <select
                id="tier"
                value={tier}
                onChange={(e) => setTier(e.target.value as BuildTier)}
                className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              >
                {BUILD_TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} (${t.rateLow}–{t.rateHigh}/sq ft)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark disabled:opacity-50"
        >
          Continue to payment — $25
        </button>
        <p className="text-center text-xs text-ink-soft">
          This demo uses a mocked checkout — no real payment is processed.
        </p>
      </form>
    </div>
  );
}
