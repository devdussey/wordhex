import { useMemo, useState, type ComponentType } from "react";
import { Play, BarChart3, Settings, ShoppingBag, Trophy, LogOut, UserCircle2, Sparkles, X, Check } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type MainMenuDestination = "play" | "statistics" | "leaderboard" | "options" | "practice";

interface MainMenuProps {
  onNavigate: (page: MainMenuDestination) => void;
}

type MenuItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  gradient: string;
  hoverGradient: string;
} & (
  | { type: "navigate"; target: MainMenuDestination }
  | { type: "profile" }
  | { type: "comingSoon" }
);

const AVATAR_CHOICES = [
  { id: "amethyst", label: "Amethyst", gradient: "from-purple-500 to-pink-500" },
  { id: "ember", label: "Ember", gradient: "from-orange-500 to-rose-500" },
  { id: "aurora", label: "Aurora", gradient: "from-blue-500 to-cyan-500" },
  { id: "garnet", label: "Garnet", gradient: "from-red-500 to-fuchsia-500" },
  { id: "jade", label: "Jade", gradient: "from-emerald-500 to-teal-500" },
  { id: "solar", label: "Solar", gradient: "from-yellow-400 to-orange-500" },
] as const;

export function MainMenu({ onNavigate }: MainMenuProps) {
  const { getUsername, signOut } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    if (typeof window === "undefined") {
      return AVATAR_CHOICES[0].id;
    }
    try {
      return window.localStorage.getItem("wordhex_avatar_choice") ?? AVATAR_CHOICES[0].id;
    } catch {
      return AVATAR_CHOICES[0].id;
    }
  });

  const activeAvatar = useMemo(
    () => AVATAR_CHOICES.find((choice) => choice.id === selectedAvatar) ?? AVATAR_CHOICES[0],
    [selectedAvatar]
  );

  const menuItems: MenuItem[] = [
    {
      id: "play",
      label: "Play",
      icon: Play,
      gradient: "from-green-600 to-emerald-600",
      hoverGradient: "hover:from-green-700 hover:to-emerald-700",
      type: "navigate",
      target: "play",
    },
    {
      id: "practice",
      label: "Solo Practice",
      icon: Sparkles,
      gradient: "from-purple-500 to-pink-500",
      hoverGradient: "hover:from-purple-600 hover:to-pink-600",
      type: "navigate",
      target: "practice",
    },
    {
      id: "leaderboard",
      label: "Leaderboard",
      icon: Trophy,
      gradient: "from-yellow-500 to-orange-600",
      hoverGradient: "hover:from-yellow-600 hover:to-orange-700",
      type: "navigate",
      target: "leaderboard",
    },
    {
      id: "profile",
      label: "Profile",
      icon: UserCircle2,
      gradient: "from-indigo-500 to-violet-600",
      hoverGradient: "hover:from-indigo-600 hover:to-violet-700",
      type: "profile",
    },
    {
      id: "statistics",
      label: "Statistics",
      icon: BarChart3,
      gradient: "from-teal-600 to-blue-600",
      hoverGradient: "hover:from-teal-700 hover:to-blue-700",
      type: "navigate",
      target: "statistics",
    },
    {
      id: "options",
      label: "Options",
      icon: Settings,
      gradient: "from-slate-600 to-slate-700",
      hoverGradient: "hover:from-slate-700 hover:to-slate-800",
      type: "navigate",
      target: "options",
    },
    {
      id: "shop",
      label: "Shop",
      icon: ShoppingBag,
      gradient: "from-pink-600 to-rose-600",
      hoverGradient: "hover:from-pink-700 hover:to-rose-700",
      type: "comingSoon",
    },
  ];

  const handleMenuSelect = (item: MenuItem) => {
    if (item.type === "navigate") {
      onNavigate(item.target);
    } else if (item.type === "profile") {
      setShowProfileModal(true);
    } else if (item.type === "comingSoon") {
      setShowComingSoon(true);
    }
  };

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("wordhex_avatar_choice", avatarId);
      } catch {
        // ignore storage errors
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="relative max-w-2xl w-full mx-auto">
        <div className="text-center mb-10 sm:mb-12 animate-fadeIn">
          <div className="flex items-center justify-center mb-6">
            <img src="/Dorion_zIkK0aVc6b.png" alt="WordHex" className="w-36 h-36 sm:w-48 sm:h-48 lg:w-64 lg:h-64" />
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4 tracking-wider">
            WORDHEX
          </h1>
          <p className="text-purple-300 text-base sm:text-lg">
            Connect letters, create words, dominate the hexagon!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isComingSoon = item.type === "comingSoon";
            return (
              <button
                key={item.id}
                onClick={() => handleMenuSelect(item)}
                className={`relative bg-gradient-to-br ${item.gradient} ${item.hoverGradient} rounded-2xl p-5 sm:p-6 shadow-2xl border-4 border-white/10 transform transition-all duration-200 hover:scale-[1.02] hover:shadow-3xl active:scale-95 group focus:outline-none focus:ring-2 focus:ring-white/60`}
                aria-label={`Open ${item.label}`}
              >
                {isComingSoon && (
                  <span className="absolute top-3 right-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white bg-white/20 px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                )}
                <div className="flex flex-col items-center gap-3 text-white">
                  <Icon className="w-10 h-10 sm:w-12 sm:h-12 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  <span className="text-xl sm:text-2xl font-bold">{item.label}</span>
                  {item.type === "profile" && (
                    <span className="text-xs sm:text-sm text-white/80">Update your avatar</span>
                  )}
                  {isComingSoon && (
                    <span className="text-xs sm:text-sm text-white/80">Feature in development</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* User Profile Section */}
        <div className="mt-8 sm:mt-10">
          <div className="bg-purple-900/30 rounded-xl p-4 sm:p-5 shadow-lg border-2 border-purple-700/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br ${activeAvatar.gradient} border-2 border-white/40 shadow-lg`}
                  aria-hidden="true"
                />
                <div className="text-center sm:text-left">
                  <span className="text-white font-semibold text-base sm:text-lg block">{getUsername()}</span>
                  <span className="text-purple-300 text-xs sm:text-sm">Player Profile</span>
                </div>
              </div>
              <button
                onClick={signOut}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base font-medium shadow-md hover:shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 text-center">
          <div className="bg-purple-900/30 rounded-xl p-4 sm:p-6 shadow-lg border-2 border-purple-700/50 space-y-2">
            <p className="text-purple-200 text-xs sm:text-sm font-semibold">
              Wordhex - A Multiplayer puzzle game inspired by Spellcast.
            </p>
            <p className="text-purple-300 text-xs sm:text-sm">Version 1.0.0</p>
            <p className="text-purple-300 text-xs sm:text-sm">Written in React, and TypeScript</p>
            <p className="text-purple-300 text-xs sm:text-sm">Developed by DevDussey</p>
            <p className="text-purple-300 text-xs sm:text-sm">Designed by Lily</p>
          </div>
        </div>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900/95 border border-purple-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Player Profile</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200"
                aria-label="Close profile modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-300 text-sm sm:text-base mb-6">
              Signed in as <span className="font-semibold text-white">{getUsername()}</span>
            </p>
            <p className="text-slate-400 text-xs sm:text-sm mb-4">
              Choose one of the launch avatars below. We&apos;ll roll out custom cosmetics right after launch.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {AVATAR_CHOICES.map((choice) => {
                const isActive = choice.id === selectedAvatar;
                return (
                  <button
                    key={choice.id}
                    onClick={() => handleAvatarSelect(choice.id)}
                    className={`group flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-colors ${
                      isActive ? "border-purple-400 bg-purple-900/50" : "border-transparent bg-slate-800/40 hover:border-purple-300"
                    }`}
                  >
                    <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${choice.gradient} border-2 border-white/30 flex items-center justify-center`}>
                      {isActive && <Check className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" />}
                    </div>
                    <span className="text-xs sm:text-sm text-slate-200 font-medium">{choice.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-right">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showComingSoon && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900/95 border border-purple-500/40 rounded-2xl p-5 sm:p-6 text-center space-y-4 shadow-2xl">
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-purple-300 mx-auto" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">Coming Soon</h2>
            <p className="text-slate-300 text-sm sm:text-base">
              This feature is coming soon! We&apos;re focusing on the core Wordhex experience first.
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
