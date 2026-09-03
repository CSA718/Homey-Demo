import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { US_STATES } from "../lib/lotCheck";
import { BUILD_TIERS, type BuildTier } from "../lib/budgetFit";
import { STORY_OPTIONS, GARAGE_OPTIONS, STYLE_OPTIONS, DEFAULT_HOME_SPEC } from "../lib/homeSpec";
import { useConsumerAuth } from "../context/ConsumerAuthContext";

export default function LotCheck() {
  const navigate = useNavigate();
  const { account } = useConsumerAuth();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [email, setEmail] = useState("");
  const [budget, setBudget] = useState("");
  const [sqft, setSqft] = useState("2400");
  const [tier, setTier] = useState<BuildTier>("custom");
  const [bedrooms, setBedrooms] = useState(DEFAULT_HOME_SPEC.bedrooms);
  const [bathrooms, setBathrooms] = useState(DEFAULT_HOME_SPEC.bathrooms);
  const [stories, setStories] = useState(DEFAULT_HOME_SPEC.stories);
  const [garage, setGarage] = useState(DEFAULT_HOME_SPEC.garage);
  const [style, setStyle] = useState(DEFAULT_HOME_SPEC.style);
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || !city.trim() || !state || !budget || !sqft) return;
    const fields = {
      address,
      city,
      state,
      email,
      budget,
      sqft,
      tier,
      bedrooms: String(bedrooms),
      bathrooms: String(bathrooms),
      stories,
      garage,
      style,
      notes: notes.slice(0, 300),
    };
    navigate(`/report?${new URLSearchParams(fields).toString()}`);
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16 sm:py-24">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
        Lot Check · Free, no account needed
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
        {!account &&
          " No signup, no card, no catch — the report is yours instantly. Want to save your history or connect with a builder? You can create a free account from the report page."}
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

        <div className="border-t border-line pt-5">
          <p className="text-sm font-semibold text-ink">Home specifications</p>
          <p className="mt-1 text-xs text-ink-soft">
            Optional, but it sharpens the concept preview on your report.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="bedrooms" className="block text-sm font-medium text-ink">
                Bedrooms
              </label>
              <input
                id="bedrooms"
                type="number"
                min={1}
                max={10}
                value={bedrooms}
                onChange={(e) => setBedrooms(Number(e.target.value) || 1)}
                className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div>
              <label htmlFor="bathrooms" className="block text-sm font-medium text-ink">
                Bathrooms
              </label>
              <input
                id="bathrooms"
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={bathrooms}
                onChange={(e) => setBathrooms(Number(e.target.value) || 1)}
                className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div>
              <label htmlFor="stories" className="block text-sm font-medium text-ink">
                Stories
              </label>
              <select
                id="stories"
                value={stories}
                onChange={(e) => setStories(e.target.value)}
                className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              >
                {STORY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="garage" className="block text-sm font-medium text-ink">
                Garage
              </label>
              <select
                id="garage"
                value={garage}
                onChange={(e) => setGarage(e.target.value)}
                className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              >
                {GARAGE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="style" className="block text-sm font-medium text-ink">
              Architectural style
            </label>
            <select
              id="style"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            >
              {STYLE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="notes" className="block text-sm font-medium text-ink">
              Anything else you have in mind{" "}
              <span className="text-ink-soft">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="e.g. open-concept kitchen, wraparound porch, home office"
              className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark disabled:opacity-50"
        >
          Run this Lot Check — free
        </button>
        <p className="text-center text-xs text-ink-soft">
          No account, no payment, no obligation.
        </p>
      </form>
    </div>
  );
}
