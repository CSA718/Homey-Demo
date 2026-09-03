import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../lib/consumerAuth";
import { useConsumerAuth } from "../context/ConsumerAuthContext";

export default function AccountSignup() {
  const navigate = useNavigate();
  const { refresh } = useConsumerAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || password.length < 4) {
      setError("Fill in your name, email, and a password (4+ characters).");
      return;
    }
    setSubmitting(true);
    const result = await signUp(name, email, password);
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
    navigate("/account");
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
        Free Homey account
      </span>
      <h1 className="mt-6 font-serif text-3xl text-ink">Create your account.</h1>
      <p className="mt-3 text-ink-soft">
        Free, no card, no catch. Saves your Lot Check and Renovation Check
        history, and unlocks connecting with member builders and posting
        jobs for contractor bids.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-ink">
            Your name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Silva"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
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
          {submitting ? "Creating account…" : "Create free account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link to="/account/login" className="font-semibold text-forest hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
