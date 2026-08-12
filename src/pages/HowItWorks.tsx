const DATA_SOURCES = [
  { name: "MassGIS", detail: "Parcel geometry, land use, statewide layers" },
  { name: "MassDEP", detail: "Wetlands, nitrogen-sensitive areas, wellhead protection" },
  { name: "FEMA", detail: "National Flood Hazard Layer" },
  { name: "USDA NRCS", detail: "Soil survey & drainage classification" },
  { name: "Town GIS & bylaws", detail: "Zoning districts, setbacks, frontage" },
  { name: "NHESP", detail: "Priority & estimated habitat for state-listed species" },
];

const STEPS = [
  {
    n: "01",
    title: "Automated data pull",
    body: "Deterministic code — not AI — queries the parcel against seven public GIS layers. Same input, same output, every time. This is what makes a $149 report possible at all.",
  },
  {
    n: "02",
    title: "AI writes the narrative",
    body: "AI turns raw layer intersections into plain-language findings and flags risk combinations a human reviewer should look at closely — a wetland buffer plus a nitrogen-sensitive watershed, for instance.",
  },
  {
    n: "03",
    title: "A credentialed human signs off",
    body: "Every report is reviewed and signed before delivery. That review is both the legal defense and the moat — an automated report with no professional behind it is copyable in a weekend.",
  },
  {
    n: "04",
    title: "Two-page report, 48 hours",
    body: "Delivered as a clear verdict, category-by-category findings, and an estimated cost range for whatever surprises turned up.",
  },
];

export default function HowItWorks() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-16 sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
          How It Works
        </span>
        <h1 className="mt-6 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Built on public data. Backed by a human.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-soft">
          Every Lot Check pulls from the same free public data anyone could
          look up — the difference is doing it systematically, in minutes,
          and having someone credentialed put their name on the findings.
        </p>
      </section>

      {/* Pipeline */}
      <section className="border-y border-line bg-sand/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-2">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="rounded-xl border border-line bg-paper-raised p-6"
              >
                <p className="font-serif text-3xl text-forest/40">{step.n}</p>
                <h3 className="mt-2 font-serif text-xl text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-ink-soft">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl">
          Every screening checks the same public sources
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DATA_SOURCES.map((s) => (
            <div key={s.name} className="rounded-xl border border-line bg-paper-raised p-5">
              <p className="font-semibold text-ink">{s.name}</p>
              <p className="mt-1 text-sm text-ink-soft">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Automation economics */}
      <section className="border-t border-line bg-forest-dark">
        <div className="mx-auto max-w-6xl px-6 py-16 text-paper">
          <h2 className="font-serif text-2xl sm:text-3xl">
            Automation is the real unlock
          </h2>
          <p className="mt-3 max-w-2xl text-paper/75">
            The screening itself doesn't get more valuable with speed — but
            the business does. Review time per check is what determines how
            many builders one person can support.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-paper/15 bg-paper/5 p-6">
              <p className="text-xs uppercase tracking-wide text-paper/60">
                At 2 hours per check
              </p>
              <p className="mt-2 font-serif text-3xl">~25 / month</p>
              <p className="mt-1 text-sm text-paper/70">
                Caps out supporting 5–8 builder members.
              </p>
            </div>
            <div className="rounded-xl border border-clay/40 bg-clay/10 p-6">
              <p className="text-xs uppercase tracking-wide text-clay-light">
                At 25 minutes per check
              </p>
              <p className="mt-2 font-serif text-3xl">60–80 / month</p>
              <p className="mt-1 text-sm text-paper/70">
                Supports 15–20 builder members — where membership becomes the
                high-margin recurring line.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer + what's next */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-sand/60 p-6">
            <h3 className="font-serif text-xl text-ink">What Lot Check is not</h3>
            <p className="mt-3 text-ink-soft">
              Lot Check is explicitly a preliminary screening that identifies
              risks requiring professional verification — never a
              buildability determination. Flagged items still need a
              licensed surveyor, soil evaluator, or engineer before you act
              on them.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-paper-raised p-6">
            <h3 className="font-serif text-xl text-ink">What's next</h3>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li>
                <span className="font-semibold text-ink">
                  Full feasibility study (~$2,500)
                </span>{" "}
                — deeper site-specific analysis once a lot clears initial
                screening.
              </li>
              <li>
                <span className="font-semibold text-ink">
                  Land buyer's representation
                </span>{" "}
                — once licensed, representing buyers through the purchase
                itself.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
