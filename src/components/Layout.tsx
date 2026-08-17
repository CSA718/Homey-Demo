import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConsumerAuth } from "../context/ConsumerAuthContext";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-forest" : "text-ink-soft hover:text-forest"
  }`;

function HomeyMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#1f4a37" />
      <path d="M24 8 L40 22 V40 H29 V29 H19 V40 H8 V22 Z" fill="#faf8f2" />
      <path d="M24 8 L40 22 H35 L24 12.5 L13 22 H8 Z" fill="#b85c34" />
    </svg>
  );
}

export default function Layout() {
  const { account, logOut } = useAuth();
  const { account: consumerAccount } = useConsumerAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-svh flex-col bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <HomeyMark />
            <span className="font-serif text-xl text-ink">Homey</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <NavLink to="/lot-check" className={navLinkClass}>
              Lot Check
            </NavLink>
            <NavLink to="/renovate" className={navLinkClass}>
              Renovate
            </NavLink>
            <NavLink to="/builders" className={navLinkClass}>
              For Builders
            </NavLink>
            <NavLink to="/how-it-works" className={navLinkClass}>
              How It Works
            </NavLink>
            {account && (
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
            )}
            {consumerAccount && (
              <NavLink to="/account" className={navLinkClass}>
                My Account
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-3">
            {account ? (
              <button
                onClick={() => {
                  logOut();
                  navigate("/");
                }}
                className="hidden text-sm font-medium text-ink-soft hover:text-forest sm:inline"
              >
                Log out
              </button>
            ) : (
              <Link
                to="/builder-login"
                className="hidden text-sm font-medium text-ink-soft hover:text-forest sm:inline"
              >
                Builder Login
              </Link>
            )}
            <Link
              to="/lot-check"
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark"
            >
              Check a Lot
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-sand/60">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <HomeyMark />
                <span className="font-serif text-lg text-ink">Homey</span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-ink-soft">
                Home building made easy. Now serving all 50 states.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">For Homeowners</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                <li>
                  <Link to="/lot-check" className="hover:text-forest">
                    Lot Check
                  </Link>
                </li>
                <li>
                  <Link to="/renovate" className="hover:text-forest">
                    Renovation Check
                  </Link>
                </li>
                <li>
                  <Link to="/renovate" className="hover:text-forest">
                    Homey Membership — $25/mo, 7-day trial
                  </Link>
                </li>
                <li>
                  <Link to="/account/login" className="hover:text-forest">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">For Builders</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                <li>
                  <Link to="/builders" className="hover:text-forest">
                    Membership — $499/mo flat
                  </Link>
                </li>
                <li>
                  <Link to="/builder-login" className="hover:text-forest">
                    Builder login
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-soft/80 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Homey. Demo product — not a real service.</p>
            <p>
              Lot Check is a preliminary screening that identifies risks
              requiring professional verification — never a buildability
              determination.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
