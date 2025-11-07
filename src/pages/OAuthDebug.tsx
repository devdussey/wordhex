import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { discordSdk } from '../lib/discordSdk';
import type { Session } from '@supabase/supabase-js';

type DebugInfo = {
  environment: {
    supabaseUrl: string | undefined;
    supabaseKeyExists: boolean;
    discordClientId: string | undefined;
    discordWebhook: boolean;
    environment: string | undefined;
  };
  session: {
    isAuthenticated: boolean;
    user: any | null;
    expiresAt: string | null;
  };
  oauth: {
    callbackUrl: string;
    expectedRedirect: string;
    discordOAuthUrl: string;
  };
  discord: {
    isEmbedded: boolean;
    sdkReady: boolean;
    user: any | null;
  };
  errors: string[];
};

export function OAuthDebug() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingOAuth, setTestingOAuth] = useState(false);

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    setLoading(true);
    const errors: string[] = [];

    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        errors.push(`Session error: ${sessionError.message}`);
      }

      // Get environment info
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const discordClientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
      const discordWebhook = import.meta.env.VITE_DISCORD_WEBHOOK_URL;
      const environment = import.meta.env.VITE_ENVIRONMENT;

      // Validate environment
      if (!supabaseUrl) errors.push('VITE_SUPABASE_URL not set');
      if (!supabaseKey) errors.push('VITE_SUPABASE_ANON_KEY not set');
      if (!discordClientId) errors.push('VITE_DISCORD_CLIENT_ID not set (optional for OAuth)');

      // Check Discord SDK
      const discordUser = discordSdk.getUser();
      const isEmbedded = discordSdk.isRunningInDiscord();
      const sdkReady = discordSdk.isSDKReady();

      // Build OAuth URLs
      const currentUrl = window.location.origin;
      const callbackUrl = `${currentUrl}/callback`;
      const supabaseProject = supabaseUrl?.split('//')[1]?.split('.')[0] || 'YOUR_PROJECT';
      const expectedRedirect = `https://${supabaseProject}.supabase.co/auth/v1/callback`;

      const discordOAuthUrl = discordClientId
        ? `https://discord.com/oauth2/authorize?client_id=${discordClientId}&response_type=code&redirect_uri=${encodeURIComponent(expectedRedirect)}&scope=identify+email`
        : 'Discord Client ID not configured';

      setDebugInfo({
        environment: {
          supabaseUrl,
          supabaseKeyExists: !!supabaseKey,
          discordClientId,
          discordWebhook: !!discordWebhook,
          environment,
        },
        session: {
          isAuthenticated: !!session,
          user: session?.user ? {
            id: session.user.id,
            email: session.user.email,
            metadata: session.user.user_metadata,
          } : null,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        },
        oauth: {
          callbackUrl,
          expectedRedirect,
          discordOAuthUrl,
        },
        discord: {
          isEmbedded,
          sdkReady,
          user: discordUser,
        },
        errors,
      });
    } catch (error) {
      errors.push(`Failed to load debug info: ${error}`);
      setDebugInfo({
        environment: { supabaseUrl: undefined, supabaseKeyExists: false, discordClientId: undefined, discordWebhook: false, environment: undefined },
        session: { isAuthenticated: false, user: null, expiresAt: null },
        oauth: { callbackUrl: '', expectedRedirect: '', discordOAuthUrl: '' },
        discord: { isEmbedded: false, sdkReady: false, user: null },
        errors,
      });
    } finally {
      setLoading(false);
    }
  };

  const testDiscordOAuth = async () => {
    setTestingOAuth(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      });

      if (error) {
        alert(`OAuth Error: ${error.message}`);
      } else {
        // Will redirect automatically
        console.log('OAuth initiated:', data);
      }
    } catch (error) {
      alert(`OAuth Test Failed: ${error}`);
    } finally {
      setTestingOAuth(false);
    }
  };

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.from('player_stats').select('count');
      if (error) {
        alert(`Supabase Connection Error: ${error.message}`);
      } else {
        alert('Supabase connection successful!');
      }
    } catch (error) {
      alert(`Connection test failed: ${error}`);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await loadDebugInfo();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950 p-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">OAuth Debug Tool</h1>
          <p className="text-purple-300">Diagnose authentication and configuration issues</p>
        </header>

        {/* Errors Section */}
        {debugInfo?.errors && debugInfo.errors.length > 0 && (
          <section className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
            <h2 className="text-xl font-semibold text-red-300 mb-4">⚠️ Issues Found</h2>
            <ul className="space-y-2">
              {debugInfo.errors.map((error, i) => (
                <li key={i} className="text-red-200 font-mono text-sm">• {error}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Environment Section */}
        <section className="mb-6 rounded-2xl border border-purple-800/70 bg-purple-950/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">🔧 Environment Variables</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-purple-300">VITE_SUPABASE_URL:</span>
              <span className={debugInfo?.environment.supabaseUrl ? 'text-green-400' : 'text-red-400'}>
                {debugInfo?.environment.supabaseUrl || '❌ Not Set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-300">VITE_SUPABASE_ANON_KEY:</span>
              <span className={debugInfo?.environment.supabaseKeyExists ? 'text-green-400' : 'text-red-400'}>
                {debugInfo?.environment.supabaseKeyExists ? '✓ Set' : '❌ Not Set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-300">VITE_DISCORD_CLIENT_ID:</span>
              <span className={debugInfo?.environment.discordClientId ? 'text-green-400' : 'text-yellow-400'}>
                {debugInfo?.environment.discordClientId || '⚠️ Not Set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-300">VITE_DISCORD_WEBHOOK_URL:</span>
              <span className={debugInfo?.environment.discordWebhook ? 'text-green-400' : 'text-gray-400'}>
                {debugInfo?.environment.discordWebhook ? '✓ Set' : 'Not Set (optional)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-300">VITE_ENVIRONMENT:</span>
              <span className="text-purple-200">{debugInfo?.environment.environment || 'Not Set'}</span>
            </div>
          </div>
        </section>

        {/* Session Section */}
        <section className="mb-6 rounded-2xl border border-purple-800/70 bg-purple-950/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">👤 Current Session</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-purple-300">Status:</span>
              {debugInfo?.session.isAuthenticated ? (
                <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-semibold">✓ Authenticated</span>
              ) : (
                <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-semibold">✗ Not Authenticated</span>
              )}
            </div>
            {debugInfo?.session.user && (
              <div className="mt-4 p-4 bg-purple-900/40 rounded-lg font-mono text-xs overflow-auto">
                <pre className="text-purple-200">{JSON.stringify(debugInfo.session.user, null, 2)}</pre>
              </div>
            )}
            {debugInfo?.session.expiresAt && (
              <div className="text-sm text-purple-300">
                Expires: {debugInfo.session.expiresAt}
              </div>
            )}
          </div>
        </section>

        {/* OAuth Configuration */}
        <section className="mb-6 rounded-2xl border border-purple-800/70 bg-purple-950/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">🔐 OAuth Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="text-purple-300 text-sm block mb-1">Your App Callback URL:</label>
              <code className="block p-2 bg-purple-900/40 rounded text-purple-200 text-sm break-all">
                {debugInfo?.oauth.callbackUrl}
              </code>
            </div>
            <div>
              <label className="text-purple-300 text-sm block mb-1">Expected Supabase Redirect:</label>
              <code className="block p-2 bg-purple-900/40 rounded text-purple-200 text-sm break-all">
                {debugInfo?.oauth.expectedRedirect}
              </code>
              <p className="text-xs text-purple-400 mt-1">
                ↑ Add this to Discord Developer Portal → OAuth2 → Redirects
              </p>
            </div>
            <div>
              <label className="text-purple-300 text-sm block mb-1">Discord OAuth URL:</label>
              <code className="block p-2 bg-purple-900/40 rounded text-purple-200 text-sm break-all">
                {debugInfo?.oauth.discordOAuthUrl}
              </code>
            </div>
          </div>
        </section>

        {/* Discord SDK Section */}
        <section className="mb-6 rounded-2xl border border-purple-800/70 bg-purple-950/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">🎮 Discord Embedded SDK</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-purple-300">Running in Discord:</span>
              <span className={debugInfo?.discord.isEmbedded ? 'text-green-400' : 'text-gray-400'}>
                {debugInfo?.discord.isEmbedded ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-300">SDK Ready:</span>
              <span className={debugInfo?.discord.sdkReady ? 'text-green-400' : 'text-gray-400'}>
                {debugInfo?.discord.sdkReady ? '✓ Ready' : '✗ Not Ready'}
              </span>
            </div>
            {debugInfo?.discord.user && (
              <div className="mt-4 p-4 bg-purple-900/40 rounded-lg">
                <pre className="text-purple-200 text-xs">{JSON.stringify(debugInfo.discord.user, null, 2)}</pre>
              </div>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        <section className="mb-6 rounded-2xl border border-purple-800/70 bg-purple-950/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">🧪 Test Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={testDiscordOAuth}
              disabled={testingOAuth}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
            >
              {testingOAuth ? 'Testing...' : 'Test Discord OAuth'}
            </button>
            <button
              onClick={testSupabaseConnection}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              Test Supabase Connection
            </button>
            <button
              onClick={loadDebugInfo}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Refresh Debug Info
            </button>
            {debugInfo?.session.isAuthenticated && (
              <button
                onClick={signOut}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </section>

        {/* Quick Fixes */}
        <section className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
          <h2 className="text-xl font-semibold text-amber-300 mb-4">💡 Quick Fixes</h2>
          <ul className="space-y-3 text-amber-100 text-sm">
            <li>
              <strong className="text-amber-200">OAuth not working?</strong>
              <br />
              Make sure <code className="px-2 py-1 bg-amber-900/40 rounded">https://YOUR_PROJECT.supabase.co/auth/v1/callback</code> is added to Discord Developer Portal redirects.
            </li>
            <li>
              <strong className="text-amber-200">Session not persisting?</strong>
              <br />
              Check browser cookies and ensure Site URL is set correctly in Supabase → Authentication → URL Configuration.
            </li>
            <li>
              <strong className="text-amber-200">Environment variables not loaded?</strong>
              <br />
              Make sure you've redeployed after adding variables in Vercel dashboard.
            </li>
          </ul>
        </section>

        {/* Back to App */}
        <div className="text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            ← Back to App
          </a>
        </div>
      </div>
    </main>
  );
}
