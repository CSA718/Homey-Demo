import { useState } from "react";
import { Link } from "react-router-dom";

const ESTIMATOR_RATE = 65; // $/hr, blended cost of estimator time
const HOURS_PER_BID = 8; // midpoint of the 6–12 hour range
const MEMBERSHIP_PRICE = 499;

export default function Builders() {
  const [inquiries, setInquiries] = useState(6);

  const hoursSaved = inquiries * HOURS_PER_BID;
  const dollarsSaved = hoursSaved * ESTIMATOR_RATE;
  const net = dollarsSaved - MEMBERSHIP_PRICE;

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-16 sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
          For Builders
        </span>
        <h1 className="mt-6 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Stop bidding on people who were never going to build.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-soft">
          Route your unqualified inquiries to Homey instead of burning
          estimator hours on them. And buyers who run a Lot Check on their
          own can find and connect with you directly — with their report and
          budget already in hand.
        </p>
      </section>

      {/* Stats */}
      <section className="border-y border-line bg-sand/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 sm:grid-cols-4">
          {[
            { value: "150", label: "inquiries fielded per year" },
            { value: "40", label: "real bids produced, 6–12 hrs each" },
            { value: "12", label: "close" },
            { value: "$19k", label: "in estimator time spent on the rest" },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-serif text-3xl text-forest sm:text-4xl">
                {s.value}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">
              Flat membership, not per-lead fees.
            </h2>
            <p className="mt-4 text-ink-soft">
              You pay the same whether we send you ten referrals in a month
              or none. That's what lets Homey stay credibly on the buyer's
              side — we're not incentivized to pad your pipeline with soft
              leads, because our revenue doesn't depend on lead volume.
            </p>
          </div>
          <div>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">
              Builder-to-consumer, not the other way around.
            </h2>
            <p className="mt-4 text-ink-soft">
              You send us traffic because it saves you money — so our
              customer acquisition cost is close to zero. That's the whole
              unlock: the cold-start problem drops from needing 800
              individual customers to needing eight builder relationships.
            </p>
          </div>
        </div>
      </section>

      {/* Connect feature */}
      <section className="border-t border-line bg-sand/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-serif text-2xl text-ink sm:text-3xl">
            Two ways leads reach you — both are already qualified.
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            You don't have to wait for your own inquiries to go cold before
            Homey helps. Every buyer who runs a Lot Check sees member
            builders in their state right on their results page, with a
            "Connect" button that lands directly in your dashboard.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-paper-raised p-6">
              <p className="font-serif text-2xl text-forest/40">01</p>
              <p className="mt-2 font-semibold text-ink">Buyer runs a Lot Check</p>
              <p className="mt-2 text-sm text-ink-soft">
                They get their buildability verdict and see whether their
                budget actually covers the build.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-paper-raised p-6">
              <p className="font-serif text-2xl text-forest/40">02</p>
              <p className="mt-2 font-semibold text-ink">
                They see you, right there
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Member builders serving their state are listed on the same
                page — no separate directory to find.
              </p>
            </div>
            <div className="rounded-xl border border-clay/40 bg-clay/10 p-6">
              <p className="font-serif text-2xl text-clay/60">03</p>
              <p className="mt-2 font-semibold text-ink">You get a real lead</p>
              <p className="mt-2 text-sm text-ink-soft">
                One click sends their name, contact info, full report, and
                budget fit straight into your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI calculator */}
      <section className="border-t border-line bg-forest-dark">
        <div className="mx-auto max-w-6xl px-6 py-16 text-paper">
          <h2 className="font-serif text-2xl sm:text-3xl">
            What does routing unqualified inquiries actually save you?
          </h2>
          <p className="mt-3 max-w-2xl text-paper/75">
            Estimate at {HOURS_PER_BID} estimator hours per dead-end bid and a
            ${ESTIMATOR_RATE}/hr blended cost — adjust to your own volume.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-paper/15 bg-paper/5 p-6">
              <label htmlFor="inquiries" className="text-sm text-paper/80">
                Unqualified inquiries routed to Homey per month
              </label>
              <input
                id="inquiries"
                type="range"
                min={1}
                max={15}
                value={inquiries}
                onChange={(e) => setInquiries(Number(e.target.value))}
                className="mt-4 w-full accent-clay"
              />
              <div className="mt-2 flex items-center justify-between text-sm text-paper/60">
                <span>1</span>
                <span className="font-serif text-2xl text-paper">
                  {inquiries}
                </span>
                <span>15</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-paper/15 bg-paper/5 p-5">
                <p className="text-xs uppercase tracking-wide text-paper/60">
                  Estimator hours saved
                </p>
                <p className="mt-1 font-serif text-3xl">{hoursSaved}</p>
                <p className="text-xs text-paper/50">per month</p>
              </div>
              <div className="rounded-xl border border-paper/15 bg-paper/5 p-5">
                <p className="text-xs uppercase tracking-wide text-paper/60">
                  Value of time saved
                </p>
                <p className="mt-1 font-serif text-3xl">
                  ${dollarsSaved.toLocaleString("en-US")}
                </p>
                <p className="text-xs text-paper/50">per month</p>
              </div>
              <div className="col-span-2 rounded-xl border border-clay/40 bg-clay/10 p-5">
                <p className="text-xs uppercase tracking-wide text-clay-light">
                  Net after membership (${MEMBERSHIP_PRICE}/mo flat)
                </p>
                <p className="mt-1 font-serif text-3xl text-paper">
                  {net >= 0 ? "+" : "−"}$
                  {Math.abs(net).toLocaleString("en-US")}
                </p>
                <p className="text-xs text-paper/50">per month, before a single closed deal</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl">Membership</h2>
        <div className="mx-auto mt-8 max-w-md rounded-2xl border-2 border-clay bg-paper-raised p-8">
          <p className="text-sm font-semibold text-clay">Flat rate, every builder</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-serif text-4xl text-ink">${MEMBERSHIP_PRICE}</span>
            <span className="text-sm text-ink-soft">/mo</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm text-ink-soft">
            <li>· Unlimited unqualified-lead routing</li>
            <li>· Listed to every buyer who runs a Lot Check in your state</li>
            <li>· Verified lot + budget on every connection</li>
            <li>· Same price whether we send ten referrals or none</li>
            <li>· No tiers, no negotiation</li>
          </ul>
          <Link
            to="/checkout?type=membership"
            className="mt-6 block rounded-full bg-clay px-6 py-3 text-center text-sm font-semibold text-paper transition-colors hover:bg-clay-dark"
          >
            Join Homey
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-ink-soft">
          Already a member?{" "}
          <Link to="/builder-login" className="font-semibold text-forest hover:underline">
            Log in to your dashboard
          </Link>
        </p>
      </section>
    </div>
  );
}
