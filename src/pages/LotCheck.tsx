import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SOUTHEASTERN_MA_TOWNS } from "../lib/lotCheck";

export default function LotCheck() {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [town, setTown] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || !town) return;
    const params = new URLSearchParams({
      type: "lotcheck",
      address,
      town,
      email,
    });
    navigate(`/checkout?${params.toString()}`);
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
        Enter the parcel address and town. We'll geocode it, check it live
        against FEMA's flood hazard data, and screen it against wetlands,
        soil, zoning, priority habitat, and wellhead protection data.
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

        <button
          type="submit"
          className="w-full rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark disabled:opacity-50"
        >
          Continue to payment — $149
        </button>
        <p className="text-center text-xs text-ink-soft">
          This demo uses a mocked checkout — no real payment is processed.
        </p>
      </form>
    </div>
  );
}
