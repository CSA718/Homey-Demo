import { Link } from "react-router-dom";
import { RENOVATION_CATEGORIES } from "../lib/renovation";

const TRIAL_DAYS = 7;
const RENO_PRICE = 25;

export default function Renovate() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-16 sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
          Renovation Check · New
        </span>
        <h1 className="mt-6 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Already own a home? Check your renovation budget before you call a contractor.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-soft">
          Tell us your budget and the scope of work — kitchen, roof, HVAC,
          whatever's on the list — for any home, new or old, anywhere in the
          U.S. We'll tell you the likelihood it fits, adjusted for what
          things actually cost in your state.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/checkout?type=consumer-trial"
            className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
          >
            Start your {TRIAL_DAYS}-day free trial
          </Link>
          <Link
            to="/account/login"
            className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
          >
            Log in
          </Link>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          ${RENO_PRICE}/mo after your free trial. Cancel anytime.
        </p>
      </section>

      {/* Related tool */}
      <section className="border-y border-line bg-sand/60">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="max-w-3xl text-ink-soft">
            Buying raw land instead? <Link to="/lot-check" className="font-semibold text-forest hover:underline">Lot Check</Link> screens
            a parcel's buildability — completely free, no account needed.
            Renovation Check is for a home you already own or are buying
            as-is, brand new or decades old, and any scope of work on it —
            that's the $25/mo Homey Membership below.
          </p>
        </div>
      </section>

      {/* Scope categories */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl">
          Check off everything you're planning.
        </h2>
        <p className="mt-3 max-w-2xl text-ink-soft">
          One check, one budget, the whole project — not just a single line
          item.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RENOVATION_CATEGORIES.map((cat) => (
            <div key={cat.key} className="rounded-xl border border-line bg-paper-raised p-4">
              <p className="font-semibold text-ink">{cat.label}</p>
              <p className="mt-1 text-xs text-ink-soft">{cat.helpText}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Accuracy */}
      <section className="border-t border-line bg-forest-dark">
        <div className="mx-auto max-w-6xl px-6 py-16 text-paper">
          <h2 className="font-serif text-2xl sm:text-3xl">
            Renovation costs vary a lot by state. We adjust for that.
          </h2>
          <p className="mt-4 max-w-2xl text-paper/75">
            A kitchen remodel that costs $30,000 in Mississippi can run
            $60,000+ for the same scope in Hawaii or California. Every
            estimate is scaled by a state renovation cost index built from
            2026 contractor-cost industry data, plus a contingency for your
            home's age — older homes turn up more hidden costs once work
            starts.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-paper/15 bg-paper/5 p-5">
              <p className="font-serif text-2xl text-paper">50 states</p>
              <p className="mt-1 text-sm text-paper/60">plus DC, each with its own cost index</p>
            </div>
            <div className="rounded-xl border border-paper/15 bg-paper/5 p-5">
              <p className="font-serif text-2xl text-paper">14 categories</p>
              <p className="mt-1 text-sm text-paper/60">covering the full scope of a renovation</p>
            </div>
            <div className="rounded-xl border border-paper/15 bg-paper/5 p-5">
              <p className="font-serif text-2xl text-paper">Any home age</p>
              <p className="mt-1 text-sm text-paper/60">new construction to a century-old rebuild</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl">Homey Membership</h2>
        <div className="mx-auto mt-8 max-w-md rounded-2xl border-2 border-clay bg-paper-raised p-8">
          <p className="text-sm font-semibold text-clay">{TRIAL_DAYS}-day free trial</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-serif text-4xl text-ink">${RENO_PRICE}</span>
            <span className="text-sm text-ink-soft">/mo after trial</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm text-ink-soft">
            <li>· Unlimited Renovation Checks</li>
            <li>· State-adjusted, category-by-category cost breakdown</li>
            <li>· Saved history of every check you run, including Lot Checks</li>
            <li>· Works for any home — new or used, any age</li>
            <li>· Cancel anytime, no questions asked</li>
          </ul>
          <Link
            to="/checkout?type=consumer-trial"
            className="mt-6 block rounded-full bg-clay px-6 py-3 text-center text-sm font-semibold text-paper transition-colors hover:bg-clay-dark"
          >
            Start your free trial
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-ink-soft">
          Already a member?{" "}
          <Link to="/account/login" className="font-semibold text-forest hover:underline">
            Log in
          </Link>
        </p>
      </section>
    </div>
  );
}
