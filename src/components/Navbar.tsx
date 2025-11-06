import { useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { AuthSession } from "../types";

interface NavbarProps {
  session: AuthSession;
  onSignOut: () => Promise<void> | void;
}

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/game", label: "Play" },
];

function getDisplayName(session: AuthSession): string {
  if ("provider" in session) {
    return session.user.username;
  }

  const user = session.user;
  const metadata = user.user_metadata as Record<string, unknown> | null | undefined;
  if (metadata && typeof metadata === "object") {
    const fullName = metadata["full_name"];
    if (typeof fullName === "string" && fullName.trim()) {
      return fullName;
    }
    const userName = metadata["user_name"];
    if (typeof userName === "string" && userName.trim()) {
      return userName;
    }
  }

  return user.email ?? "Wordhex Explorer";
}

export default function Navbar({ session, onSignOut }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayName = useMemo(() => getDisplayName(session), [session]);
  const avatarUrl = useMemo(() => {
    if ("provider" in session && session.user.avatar_url) {
      return session.user.avatar_url;
    }

    if ("provider" in session) {
      return `https://avatar.vercel.sh/${encodeURIComponent(session.user.username)}`;
    }

    const metadata = session.user.user_metadata as Record<string, unknown> | null | undefined;
    const avatar = metadata && typeof metadata === "object" ? metadata["avatar_url"] : undefined;

    if (typeof avatar === "string" && avatar) {
      return avatar;
    }

    return `https://avatar.vercel.sh/${encodeURIComponent(displayName)}`;
  }, [displayName, session]);

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <NavLink to="/dashboard" className="navbar__brand" onClick={() => setIsOpen(false)}>
          Wordhex
        </NavLink>

        <button
          className="navbar__toggle"
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`navbar__links ${isOpen ? "navbar__links--open" : ""}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `navbar__link${isActive ? " navbar__link--active" : ""}`
              }
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__profile">
          <img className="navbar__avatar" src={avatarUrl} alt="Profile" />
          <span className="navbar__name">{displayName}</span>
          <button className="navbar__signout" type="button" onClick={() => onSignOut()}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
