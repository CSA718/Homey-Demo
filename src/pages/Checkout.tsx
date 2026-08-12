import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { signUp, type MembershipTier } from "../lib/auth";
import { useAuth } from "../context/AuthContext";

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function Checkout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const type = params.get("type") === "membership" ? "membership" : "lotcheck";

  // Lot Check params
  const address = params.get("address") ?? "";
  const town = params.get("town") ?? "";
  const lotCheckEmail = params.get("email") ?? "";
  const budget = params.get("budget") ?? "";
  const sqft = params.get("sqft") ?? "";
  const buildTier = params.get("tier") ?? "";

  // Membership params
  const tier: MembershipTier = params.get("tier") === "standard" ? "standard" : "founding";
  const tierPrice = tier === "founding" ? 550 : 1000;

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState(lotCheckEmail);
  const [password, setPassword] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [status, setStatus] = useState<"form" | "processing" | "error">("form");
  const [error, setError] = useState<string | null>(null);

  const amount = type === "lotcheck" ? 149 : tierPrice;
  const title = type === "lotcheck" ? "Lot Check" : `Homey Membership — ${tier === "founding" ? "Founding rate" : "Standard rate"}`;
  const subtitle =
    type === "lotcheck"
      ? `${address}, ${town}, MA`
      : `${tier === "founding" ? "$550–600" : "$1,000"}/mo, billed monthly`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (type === "membership") {
      if (!businessName.trim() || !email.trim() || password.length < 4) {
        setError("Fill in your business name, email, and a password (4+ characters).");
        return;
      }
    }

    setStatus("processing");

    window.setTimeout(() => {
      if (type === "membership") {
        const result = signUp(businessName, email, password, tier);
        if ("error" in result) {
          setStatus("form");
          setError(result.error);
          return;
        }
        refresh();
        navigate("/dashboard");
        return;
      }
      const reportParams = new URLSearchParams({
        address,
        town,
        budget,
        sqft,
        tier: buildTier,
      });
      navigate(`/report?${reportParams.toString()}`);
    }, 1600);
  }

  if (type === "lotcheck" && (!address.trim() || !town)) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-ink-soft">Missing lot details.</p>
        <Link to="/lot-check" className="mt-4 inline-block font-semibold text-forest hover:underline">
          Start a Lot Check →
        </Link>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-32 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-forest" />
        <p className="mt-6 font-serif text-xl text-ink">Processing payment…</p>
        <p className="mt-2 text-sm text-ink-soft">
          This is a demo — no real card is charged.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
        Demo checkout · no real charge
      </span>
      <h1 className="mt-6 font-serif text-3xl text-ink">Checkout</h1>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-line bg-paper-raised p-5">
        <div>
          <p className="font-semibold text-ink">{title}</p>
          <p className="text-sm text-ink-soft">{subtitle}</p>
        </div>
        <p className="font-serif text-2xl text-ink">
          ${amount.toLocaleString("en-US")}
          {type === "membership" && <span className="text-sm text-ink-soft">/mo</span>}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {type === "membership" && (
          <>
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
                className="mt-2 w-full rounded-lg border border-line bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
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
                  className="mt-2 w-full rounded-lg border border-line bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
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
                  className="mt-2 w-full rounded-lg border border-line bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>
            </div>
          </>
        )}

        <div className="border-t border-line pt-5">
          <p className="text-sm font-semibold text-ink">Card details</p>
          <div className="mt-3 space-y-4">
            <input
              type="text"
              required
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Name on card"
              className="w-full rounded-lg border border-line bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
            <input
              type="text"
              required
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4242 4242 4242 4242"
              className="w-full rounded-lg border border-line bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                required
                inputMode="numeric"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                className="w-full rounded-lg border border-line bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
              <input
                type="text"
                required
                inputMode="numeric"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="CVC"
                className="w-full rounded-lg border border-line bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-flag-bg px-4 py-3 text-sm text-flag">{error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
        >
          Pay ${amount.toLocaleString("en-US")}
          {type === "membership" ? "/mo" : ""}
        </button>
        <p className="text-center text-xs text-ink-soft">
          Demo checkout. No card is validated or charged, and nothing is sent
          anywhere.
        </p>
      </form>
    </div>
  );
}
