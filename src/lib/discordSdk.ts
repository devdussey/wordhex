import { DiscordSDK, DiscordSDKMock } from '@discord/embedded-app-sdk';

// Types for Discord user and authentication
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

export interface DiscordAuth {
  access_token: string;
  user: DiscordUser;
  scopes: string[];
  expires: string;
}

// Initialize Discord SDK
const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

if (!clientId) {
  throw new Error('VITE_DISCORD_CLIENT_ID is required for Discord Activities');
}

// Use mock SDK in development if not running in Discord
const isInDiscord = () => {
  return window.location.ancestorOrigins?.length > 0 ||
         window.location.search.includes('frame_id=');
};

// Initialize the appropriate SDK
export const discordSdk = isInDiscord()
  ? new DiscordSDK(clientId)
  : new DiscordSDKMock(clientId, null, null, null);

// Setup function to initialize the SDK
export async function setupDiscordSdk() {
  try {
    // Wait for Discord to be ready
    await discordSdk.ready();

    console.log('[Discord SDK] Ready');

    // Authorize with Discord
    const { code } = await discordSdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: [
        'identify',
        'guilds',
      ],
    });

    // Exchange code for access token via your backend
    const response = await fetch('/.proxy/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const { access_token } = await response.json();

    // Authenticate with Discord
    const auth = await discordSdk.commands.authenticate({
      access_token,
    });

    if (!auth) {
      throw new Error('Failed to authenticate with Discord');
    }

    console.log('[Discord SDK] Authenticated:', auth.user.username);

    return {
      access_token,
      user: auth.user,
      scopes: auth.scopes,
      expires: auth.expires,
    } as DiscordAuth;
  } catch (error) {
    console.error('[Discord SDK] Setup failed:', error);
    throw error;
  }
}

// Get current user info (requires user ID)
export async function getCurrentUser(userId: string): Promise<DiscordUser | null> {
  try {
    const user = await discordSdk.commands.getUser({ id: userId });
    return user as DiscordUser | null;
  } catch (error) {
    console.error('[Discord SDK] Failed to get user:', error);
    return null;
  }
}

// Get instance participants
export async function getInstanceParticipants() {
  try {
    const participants = await discordSdk.commands.getInstanceConnectedParticipants();
    return participants;
  } catch (error) {
    console.error('[Discord SDK] Failed to get participants:', error);
    return [];
  }
}

// Update activity instance
export async function updateActivity(activity: { details?: string; state?: string }) {
  try {
    await discordSdk.commands.setActivity({
      activity: {
        type: 0, // Playing
        details: activity.details,
        state: activity.state,
      },
    });
  } catch (error) {
    console.error('[Discord SDK] Failed to update activity:', error);
  }
}

export default discordSdk;
