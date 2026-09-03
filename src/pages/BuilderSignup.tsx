import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { US_STATES } from "../lib/lotCheck";

export default function BuilderSignup() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [serviceState, setServiceState] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!businessName.trim() || !serviceState || !email.trim() || password.length < 4) {
      setError("Fill in your business name, service area, email, and a password (4+ characters).");
      return;
    }
    setSubmitting(true);
    const result = await signUp(businessName, email, password, serviceState);
    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    if ("pendingConfirmation" in result) {
      setError("Check your email to confirm your account, then log in.");
      return;
    }
    refresh();
    navigate("/dashboard");
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
        Free during launch
      </span>
      <h1 className="mt-6 font-serif text-3xl text-ink">Join as a builder.</h1>
      <p className="mt-3 text-ink-soft">
        Free, no card, no catch. Get listed to buyers who run a Lot Check in
        your state, and a dashboard for the leads, bids, and direct quotes
        that come back.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8"
      >
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-ink">
            Business name
          </label>
          <input
            id="businessName"
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Fearing Hill Builders"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>
        <div>
          <label htmlFor="serviceState" className="block text-sm font-medium text-ink">
            Primary service area (state)
          </label>
          <select
            id="serviceState"
            required
            value={serviceState}
            onChange={(e) => setServiceState(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          >
            <option value="" disabled>
              Select a state
            </option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-soft">
            Buyers running a Lot Check in this state can connect with you
            directly.
          </p>
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
            placeholder="you@builder.com"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 4 characters"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-flag-bg px-4 py-3 text-sm text-flag">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Create free builder account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Already a member?{" "}
        <Link to="/builder-login" className="font-semibold text-forest hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
