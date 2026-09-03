import { Link } from "react-router-dom";

const RISK_LAYERS = [
  "Wetlands & buffers",
  "Nitrogen-sensitive / septic",
  "FEMA flood zone",
  "Soil drainage class",
  "Zoning & setbacks",
  "Priority habitat",
  "Wellhead protection",
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
              Now nationwide — all 50 states
            </span>
            <h1 className="mt-6 font-serif text-4xl leading-tight text-ink sm:text-5xl lg:text-6xl">
              Home building, made easy.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft">
              Find out if a lot is buildable — and what the surprises will
              cost — before you spend months and thousands of dollars finding
              out the hard way.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                to="/lot-check"
                className="rounded-full bg-forest px-7 py-3.5 text-center text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
              >
                Get a free Lot Check
              </Link>
              <Link
                to="/builders"
                className="rounded-full border border-line px-7 py-3.5 text-center text-sm font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
              >
                I'm a builder →
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-soft">
              No account needed. Every report reviewed and signed by a
              credentialed human.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              What Lot Check screens
            </p>
            <ul className="mt-4 space-y-3">
              {RISK_LAYERS.map((layer) => (
                <li key={layer} className="flex items-center gap-3 text-sm text-ink">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-clear-bg text-clear">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6.5 L4.8 9 L10 3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {layer}
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-lg bg-sand px-4 py-3 text-xs text-ink-soft">
              Preliminary screening that identifies risks requiring
              professional verification — never a buildability determination.
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-line bg-sand/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-serif text-2xl text-ink sm:text-3xl">
            Everyone's guessing until it's too expensive not to know.
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-paper-raised p-6">
              <p className="text-sm font-semibold text-clay">Builders</p>
              <p className="mt-2 text-ink-soft">
                A typical semi-custom builder fields ~150 inquiries a year,
                produces ~40 real bids at 6–12 hours each, and closes about
                12. That's roughly{" "}
                <span className="font-semibold text-ink">
                  $19,000 of estimator time
                </span>{" "}
                burned annually on leads that were never going to build — no
                lot, an unbuildable lot, or a budget 30–40% short.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-paper-raised p-6">
              <p className="text-sm font-semibold text-forest">Buyers</p>
              <p className="mt-2 text-ink-soft">
                There's no way to find out if a lot is buildable, or what a
                house will actually cost, without spending{" "}
                <span className="font-semibold text-ink">
                  months and thousands of dollars
                </span>{" "}
                on surveys, perc tests, and engineering — money you lose if
                the lot turns out not to work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three audiences */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl">
          Three ways to use ClearLot.
        </h2>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Lot Check and Renovation Check are both completely free, no
          account needed. A free account saves your history and unlocks
          connecting with member builders.
        </p>
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-line bg-paper-raised p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-forest">
              For buyers, before you build
            </p>
            <h3 className="mt-2 font-serif text-2xl text-ink">Lot Check</h3>
            <p className="mt-3 flex-1 text-ink-soft">
              A buildability screening on a specific parcel: wetlands and
              buffers, nitrogen-sensitive area (I/A septic trigger), flood
              zone, soil drainage class, zoning and setbacks, priority
              habitat, and wellhead protection.
            </p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-serif text-3xl text-ink">Free</span>
              <span className="text-sm text-ink-soft">no account needed</span>
            </div>
            <Link
              to="/lot-check"
              className="mt-6 rounded-full bg-forest px-6 py-3 text-center text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
            >
              Check a lot
            </Link>
          </div>

          <div className="flex flex-col rounded-2xl border border-clay/40 bg-clay/5 p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-clay">
              For homeowners, after you build
            </p>
            <h3 className="mt-2 font-serif text-2xl text-ink">Renovation Check</h3>
            <p className="mt-3 flex-1 text-ink-soft">
              Set a budget and check off the scope of work — kitchen, roof,
              HVAC, whatever's on the list — for any home, new or old. Get
              the likelihood it fits, adjusted for your state.
            </p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-serif text-3xl text-ink">Free</span>
              <span className="text-sm text-ink-soft">no account needed</span>
            </div>
            <Link
              to="/renovate"
              className="mt-6 rounded-full border border-clay px-6 py-3 text-center text-sm font-semibold text-clay transition-colors hover:bg-clay hover:text-paper"
            >
              Check a renovation
            </Link>
          </div>

          <div className="flex flex-col rounded-2xl border border-line bg-paper-raised p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              For builders
            </p>
            <h3 className="mt-2 font-serif text-2xl text-ink">Membership</h3>
            <p className="mt-3 flex-1 text-ink-soft">
              Route your unqualified inquiries to ClearLot instead of burning
              estimator hours on them. Whoever comes back has a verified lot
              and a real budget.
            </p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-serif text-3xl text-ink">Free</span>
              <span className="text-sm text-ink-soft">during launch, every builder</span>
            </div>
            <Link
              to="/builders"
              className="mt-6 rounded-full border border-line px-6 py-3 text-center text-sm font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
            >
              See builder membership
            </Link>
          </div>
        </div>
      </section>

      {/* How it works teaser */}
      <section className="border-t border-line bg-forest-dark">
        <div className="mx-auto max-w-6xl px-6 py-20 text-paper">
          <div className="grid gap-10 lg:grid-cols-3">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl">
                Built on public data. Backed by a human.
              </h2>
              <p className="mt-4 text-paper/80">
                Free public data — US Census, FEMA, USDA soils, state and
                local records — queried by deterministic code, not AI. AI
                writes the narrative and flags risk combinations. A
                credentialed human signs every report.
              </p>
              <Link
                to="/how-it-works"
                className="mt-6 inline-block text-sm font-semibold text-paper underline underline-offset-4 hover:text-clay-light"
              >
                See how it works →
              </Link>
            </div>
            <div className="rounded-xl border border-paper/15 bg-paper/5 p-6">
              <p className="font-serif text-xl">01 — Automated pull</p>
              <p className="mt-2 text-sm text-paper/70">
                Parcel geometry checked against seven public risk layers in
                seconds.
              </p>
            </div>
            <div className="rounded-xl border border-paper/15 bg-paper/5 p-6">
              <p className="font-serif text-xl">02 — Human review & sign-off</p>
              <p className="mt-2 text-sm text-paper/70">
                A credentialed reviewer checks the findings and signs the
                report — the legal defense, and the moat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl">
          Know before you spend the down payment on finding out.
        </h2>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to="/lot-check"
            className="rounded-full bg-forest px-8 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
          >
            Get a free Lot Check
          </Link>
          <Link
            to="/builders"
            className="rounded-full border border-line px-8 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
          >
            Explore builder membership
          </Link>
        </div>
      </section>
    </div>
  );
}
