import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, realtime } from '../services/api';
import type { DiscordIdentity } from '../types/discord';

interface UserProfile {
  id: string;
  username: string;
  discordId?: string | null;
  email?: string | null;
  authType: 'discord' | 'guest' | 'email';
  coins: number;
  gems: number;
  cosmetics: string[];
  createdAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  signOut: () => Promise<void>;
  getUsername: () => string;
  loginWithDiscord: () => Promise<void>;
}

const STORAGE_KEY = 'wordhex_profile';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredProfile(): UserProfile | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function persistProfile(profile: UserProfile | null) {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  if (profile) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function resolveError(error: unknown, fallback: string): Error {
  if (error instanceof Error && error.message) {
    return error;
  }
  return new Error(fallback);
}

function decodeProfilePayload(encoded: string | null): UserProfile | null {
  if (!encoded) {
    return null;
  }

  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized);
    const profile = JSON.parse(json) as UserProfile;
    if (!profile || typeof profile !== 'object') {
      return null;
    }
    return profile;
  } catch (error) {
    console.error('[auth] Failed to decode profile payload', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const storedProfile = getStoredProfile();
  const [user, setUser] = useState<UserProfile | null>(storedProfile);
  const [loading, setLoading] = useState<boolean>(() => {
    if (storedProfile) {
      return false;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    const context = window.__WORDHEX_DISCORD_CONTEXT__;
    const identity = window.__WORDHEX_DISCORD_USER__ as DiscordIdentity | undefined;
    return Boolean(identity?.id && (context?.frameId || window.__WORDHEX_DISCORD_SDK__));
  });
  const [error, setError] = useState<string | null>(null);
  const attemptedDiscordIdentitiesRef = useRef<Set<string>>(new Set());

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (user) {
      realtime.connect(user.id, user.username);
    } else {
      realtime.disconnect();
    }
  }, [user]);

  const completeLogin = useCallback((profile: UserProfile) => {
    setUser(profile);
    persistProfile(profile);
    realtime.connect(profile.id, profile.username);
  }, []);

  const loginWithDiscord = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }
    setError(null);
    setLoading(true);
    api.auth.clearToken();
    persistProfile(null);

    try {
      // Check if running in Discord embedded activity
      const discordSdk = window.__WORDHEX_DISCORD_SDK__;
      if (discordSdk) {
        // Use Discord SDK's authorize command for embedded activities
        try {
          const response = await discordSdk.commands.authorize({
            client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
            response_type: 'code',
            state: '',
            prompt: 'consent', // Show consent screen
            scope: ['identify', 'guilds'],
          });

          console.log('[auth] Discord authorization response:', response);

          // The authorize() method returns the authorization code
          if (response?.code) {
            // Redirect to callback endpoint with the code
            const callbackUrl = `${window.location.origin}/api/auth/discord/callback?code=${response.code}`;
            window.location.href = callbackUrl;
          } else {
            setError('Discord authorization did not return an authorization code');
            setLoading(false);
          }
        } catch (sdkError) {
          console.error('[auth] Discord SDK authorization failed', sdkError);
          setError('Discord authorization was denied or failed');
          setLoading(false);
        }
      } else {
        // Not in Discord, try fallback OAuth
        const returnTo = window.location.href;
        const url = await api.auth.getDiscordAuthUrl(returnTo);
        window.location.href = url; // Use location.href instead of window.open
        setLoading(false);
      }
    } catch (error) {
      const resolved = resolveError(error, 'Failed to start Discord login');
      console.error('[auth] Discord login failed', resolved);
      setError(resolved.message);
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    api.auth.clearToken();
    persistProfile(null);
    setUser(null);
    setError(null);
    setLoading(false);
    realtime.disconnect();
  }, []);


  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const identity = window.__WORDHEX_DISCORD_USER__ as DiscordIdentity | undefined;
    const context = window.__WORDHEX_DISCORD_CONTEXT__;
    const isDiscordActivity = Boolean(context?.frameId || window.__WORDHEX_DISCORD_SDK__);

    if (!shouldAttemptDiscordLogin(identity, isDiscordActivity, user)) {
      return;
    }

    if (identity?.id && attemptedDiscordIdentitiesRef.current.has(identity.id)) {
      return;
    }

    if (identity?.id) {
      attemptedDiscordIdentitiesRef.current.add(identity.id);
    }

    let isCancelled = false;

    const attemptDiscordLogin = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.auth.identityLogin({
          discordId: identity?.id,
          username: identity?.username,
        });

        if (isCancelled) {
          return;
        }

        completeLogin(response.user as UserProfile);
        setError(null);
      } catch (loginError) {
        if (isCancelled) {
          return;
        }

        console.error('[auth] Discord identity login failed', loginError);

        const friendlyMessage =
          loginError instanceof Error && loginError.message
            ? loginError.message
            : 'We could not authenticate with Discord. Please reload the activity.';

        setError(friendlyMessage);
        api.auth.clearToken();
        persistProfile(null);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    attemptDiscordLogin().catch((error) => {
      console.error('[auth] Unexpected Discord login error', error);
    });

    return () => {
      isCancelled = true;
    };
  }, [completeLogin, user]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const profileParam = url.searchParams.get('profile');
    const errorParam = url.searchParams.get('error');

    if (!token && !profileParam && !errorParam) {
      return;
    }

    let loadingHandledByComplete = false;

    if (token && profileParam) {
      const profile = decodeProfilePayload(profileParam);
      if (profile) {
        api.auth.setToken(token);
        completeLogin(profile);
        loadingHandledByComplete = true;
      } else {
        setError('We were unable to verify your Discord login. Please try again.');
        api.auth.clearToken();
        persistProfile(null);
      }
    } else if (errorParam) {
      setError(errorParam);
      api.auth.clearToken();
      persistProfile(null);
    }

    if (!loadingHandledByComplete) {
      setLoading(false);
    }

    url.searchParams.delete('token');
    url.searchParams.delete('profile');
    url.searchParams.delete('error');
    const newUrl = `${url.pathname}${url.search}${url.hash}` || '/';
    window.history.replaceState({}, document.title, newUrl);
  }, [completeLogin]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      error,
      signOut,
      loginWithDiscord,
      getUsername: () => user?.username || 'Player',
      clearError,
    }),
    [user, loading, error, signOut, loginWithDiscord, clearError]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

function shouldAttemptDiscordLogin(
  identity: DiscordIdentity | undefined,
  isDiscordActivity: boolean,
  currentUser: UserProfile | null
) {
  if (!isDiscordActivity || !identity?.id) {
    return false;
  }

  if (currentUser?.authType === 'discord' && currentUser.discordId === identity.id) {
    return false;
  }

  return true;
}


// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
