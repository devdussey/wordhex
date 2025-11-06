import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { DiscordSDK } from '@discord/embedded-app-sdk';
import { ErrorBoundary } from './components/ErrorBoundary';
import { errorLogger } from './utils/errorLogger';
import { ErrorType, ErrorSeverity } from './types/errors';
import type { DiscordActivityContext, DiscordIdentity, DiscordAuthorizeOptions } from './types/discord';

// Debug utilities
export const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';
function debug(...args: unknown[]) {
  if (DEBUG) {
    console.log('[WordHex Debug]', new Date().toISOString(), ...args);
  }
}

// Analytics helper
function trackEvent(eventName: string, data?: Record<string, unknown>) {
  debug('[Event]', eventName, data);
  if (typeof window !== 'undefined' && window.va) {
    window.va('event', { name: eventName, data });
  }
}

function getQueryParam(param: string): string | null {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  } catch (e) {
    console.error('Failed to parse URL parameters:', e);
    return null;
  }
}

async function waitForDOMLoaded() {
  if (document.readyState === 'complete') return;
  return new Promise<void>(resolve => {
    window.addEventListener('load', () => resolve(), { once: true });
  });
}

declare global {
  interface Window {
    va?: (event: 'beforeSend' | 'event' | 'pageview', properties?: unknown) => void;
  }
}

async function resolveDiscordIdentity(discord: DiscordSDK | null, frameId: string | null) {
  let identity: DiscordIdentity | null = null;

  if (discord?.commands?.getUser) {
    try {
      const me = await discord.commands.getUser({ id: '@me' });
      if (me) {
        identity = {
          id: me.id,
          username: me.global_name ?? me.username,
          discriminator: me.discriminator,
          global_name: me.global_name ?? null,
        };
        debug('Resolved Discord user via getUser', identity);
      }
    } catch (error) {
      debug('Failed to resolve Discord user with getUser', error);
    }
  }

  if (!identity && discord?.instanceId) {
    identity = {
      id: discord.instanceId,
      username: `Player-${discord.instanceId.slice(-4)}`,
      discriminator: '0000',
      global_name: null,
    };
    debug('Fallback to Discord instanceId for identity', identity);
  }

  if (!identity && frameId) {
    identity = {
      id: frameId,
      username: `Player-${frameId.slice(-4)}`,
      discriminator: '0000',
      global_name: null,
    };
    debug('Fallback to frameId for identity', identity);
  }

  if (!identity) {
    identity = {
      id: `guest-${Date.now().toString(36)}`,
      username: `Guest-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      discriminator: '0000',
      global_name: null,
    };
    debug('Generated guest identity', identity);
  }

  window.__WORDHEX_DISCORD_USER__ = identity;
  return identity;
}

async function initializeDiscordSDK(clientId: string) {
  debug('Starting Discord SDK initialization...');
  await waitForDOMLoaded();

  // Initialize SDK - no container needed for v2.4.0
  try {
    debug('Creating Discord SDK instance with clientId:', clientId);
    const sdk = new DiscordSDK(clientId);

    debug('Calling sdk.ready()...');
    await sdk.ready();

    debug('Discord SDK ready() completed successfully');
    return sdk;
  } catch (error) {
    console.error('Discord SDK initialization error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      origin: window.location.origin,
      clientId,
      userAgent: navigator.userAgent
    });
    throw error;
  }
}

async function initializeApp() {
  debug('Starting app initialization...');

  // First check if root element exists
  if (!document.getElementById('root')) {
    throw new Error('Root element #root not found in DOM');
  }

  let discord: DiscordSDK | null = null;

  // Check if we should initialize Discord
  const frameId = getQueryParam('frame_id');
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const baseContext: DiscordActivityContext = {
    frameId,
    guildId: null,
    channelId: null,
    instanceId: null,
  };

  if (typeof window !== 'undefined') {
    window.__WORDHEX_DISCORD_CONTEXT__ = baseContext;
    window.__WORDHEX_DISCORD_SDK__ = undefined;
  }

  debug('Discord check:', { frameId: !!frameId, clientId: !!clientId, actualClientId: clientId });
  trackEvent('app_init', {
    hasFrameId: !!frameId,
    hasClientId: !!clientId,
    origin: window.location.origin,
    href: window.location.href
  });

  if (frameId && clientId) {
    // Initialize Discord with timeout to prevent hanging
    const discordInitTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Discord SDK timeout after 10s')), 10000)
    );

    try {
      trackEvent('discord_sdk_init_start');

      const discordSdk = await Promise.race<DiscordSDK>([
        initializeDiscordSDK(clientId),
        discordInitTimeout
      ]);
      discord = discordSdk;

      debug('Discord SDK initialized successfully');
      trackEvent('discord_sdk_init_success');

      if (typeof window !== 'undefined') {
        window.__WORDHEX_DISCORD_SDK__ = discordSdk;
        window.__WORDHEX_DISCORD_CONTEXT__ = {
          frameId,
          guildId: discordSdk.guildId ?? null,
          channelId: discordSdk.channelId ?? null,
          instanceId: discordSdk.instanceId ?? null,
        };
      }

      try {
        trackEvent('discord_auth_start');
        // Generate a secure OAuth state
        const state = (() => {
          try {
            const bytes = new Uint8Array(16);
            window.crypto.getRandomValues(bytes);
            return Array.from(bytes)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');
          } catch {
            return String(Date.now());
          }
        })();

        const authorizeOptions: DiscordAuthorizeOptions = {
          client_id: clientId,
          response_type: 'code',
          state,
          prompt: 'none',
          scope: ['identify', 'guilds'],
          // Required by Embedded App SDK: 1 = user-install context
        };
        await discord.commands.authorize(authorizeOptions);
        debug('Discord authorization successful');
        trackEvent('discord_auth_success');
      } catch (authError) {
        console.warn(
          'Discord authorization failed (continuing in limited mode):',
          authError instanceof Error ? authError.message : authError
        );
        trackEvent('discord_auth_failed', {
          error: authError instanceof Error ? authError.message : String(authError)
        });
      }
    } catch (discordError) {
      // Log but don't throw - app should work without Discord
      console.error(
        'Discord integration disabled:',
        discordError instanceof Error ? discordError.message : discordError
      );
      trackEvent('discord_sdk_init_failed', {
        error: discordError instanceof Error ? discordError.message : String(discordError)
      });

      if (typeof window !== 'undefined') {
        window.__WORDHEX_DISCORD_SDK__ = undefined;
        window.__WORDHEX_DISCORD_CONTEXT__ = baseContext;
      }
    }
  } else {
    debug('Running in standalone mode - Discord features will be limited');
    debug('Missing:', !frameId ? 'frame_id' : '', !clientId ? 'client_id' : '');
    trackEvent('standalone_mode', { reason: !frameId ? 'no_frame_id' : 'no_client_id' });

    if (typeof window !== 'undefined') {
      window.__WORDHEX_DISCORD_CONTEXT__ = baseContext;
      window.__WORDHEX_DISCORD_SDK__ = undefined;
    }
  }

  await resolveDiscordIdentity(discord, frameId);

  window.onerror = (message, source, lineno, colno, error) => {
    errorLogger.logError(
      error || new Error(String(message)),
      ErrorType.UNKNOWN,
      ErrorSeverity.HIGH,
      'An unexpected error occurred',
      { source, lineno, colno }
    );
    return false;
  };

  window.onunhandledrejection = (event) => {
    errorLogger.logError(
      event.reason,
      ErrorType.UNKNOWN,
      ErrorSeverity.MEDIUM,
      'An unexpected error occurred in the background',
      { promiseRejection: true }
    );
  };

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <ErrorProvider>
          <AuthProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </AuthProvider>
        </ErrorProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}

initializeApp().catch(error => {
  console.error('Failed to initialize app:', error);
  // Still try to render error UI
  const root = document.getElementById('root');
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <ErrorBoundary>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-slate-800 p-8 rounded-lg text-white">
              <h1 className="text-2xl font-bold mb-4">Initialization Error</h1>
              <p className="text-red-400 mb-4">{error instanceof Error ? error.message : String(error)}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
              >
                Reload page
              </button>
            </div>
          </div>
        </ErrorBoundary>
      </StrictMode>
    );
  }
});
// Build 1761877455
