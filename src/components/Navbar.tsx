import { NavLink } from '../lib';
import type { Session } from '@supabase/supabase-js';

type NavbarProps = {
  user: Session['user'];
  onSignOut: () => void;
};

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
    isActive ? 'bg-purple-600 text-white' : 'text-purple-200 hover:bg-purple-800/50 hover:text-white'
  }`;

export function Navbar({ user, onSignOut }: NavbarProps) {
  const displayName = user.user_metadata?.name || user.user_metadata?.full_name || user.email || user.id;

  return (
    <nav className="bg-purple-950/80 backdrop-blur border-b border-purple-900/60 text-purple-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-widest text-white">WORDHEX</span>
          <div className="flex items-center gap-2">
            <NavLink to="/" className={linkClasses} end>
              Dashboard
            </NavLink>
            <NavLink to="/leaderboard" className={linkClasses}>
              Leaderboard
            </NavLink>
            <NavLink to="/game" className={linkClasses}>
              Game
            </NavLink>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-purple-200">{displayName}</span>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out of WordHex"
            className="rounded-md border border-purple-700 px-3 py-2 text-sm font-medium text-purple-200 transition hover:bg-purple-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
