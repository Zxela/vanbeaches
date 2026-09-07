import { BEACHES } from '@van-beaches/shared';
import { ArrowLeft, ChevronDown, Waves } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FavoriteButton } from './FavoriteButton';
import { OfflineBanner } from './OfflineBanner';
import { ShareButton } from './ShareButton';

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const beach = BEACHES.find((item) => location.pathname === `/beach/${item.id}`);

  return (
    <div className="app-canvas min-h-screen text-primary">
      <OfflineBanner />
      <header className="border-b border-divider bg-surface safe-area-inset-top">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3"
        >
          <Link
            to="/discover"
            aria-label="Browse beaches"
            className="flex min-h-11 items-center gap-2 font-semibold"
          >
            {beach ? <ArrowLeft className="h-5 w-5" /> : <Waves className="h-5 w-5 text-accent" />}
            <span>{beach ? 'Beaches' : 'Van Beaches'}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 lg:order-last">
            {beach && <FavoriteButton beachId={beach.id} beachName={beach.name} size="lg" />}
            {beach && <ShareButton beachName={beach.name} beachId={beach.id} />}
          </div>
          {beach && (
            <label className="relative w-full lg:ml-6 lg:w-72">
              <span className="sr-only">Select beach</span>
              <select
                aria-label="Select beach"
                value={beach?.id ?? ''}
                onChange={(event) => navigate(`/beach/${event.target.value}`)}
                className="header-control beach-selector w-full appearance-none cursor-pointer pl-4 pr-11"
              >
                <option value="" disabled>
                  Select Beach
                </option>
                {BEACHES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </label>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
