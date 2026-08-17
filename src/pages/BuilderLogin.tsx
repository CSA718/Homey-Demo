import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logIn } from "../lib/auth";
import { useAuth } from "../context/AuthContext";

export default function BuilderLogin() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await logIn(email, password);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    refresh();
    navigate("/dashboard");
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
        Builder Login
      </span>
      <h1 className="mt-6 font-serif text-3xl text-ink">Welcome back.</h1>
      <p className="mt-3 text-ink-soft">
        Log in to see your referred leads and lot check reports.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8"
      >
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
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
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
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-flag-bg px-4 py-3 text-sm text-flag">{error}</p>
        )}
        <button
          type="submit"
          className="w-full rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
        >
          Log in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Not a member yet?{" "}
        <Link to="/builders" className="font-semibold text-forest hover:underline">
          See membership plans
        </Link>
      </p>
    </div>
  );
}
