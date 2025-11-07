/**
 * Discord Embedded App SDK Configuration
 * Handles initialization and authentication for Discord Activities
 */

import { DiscordSDK } from '@discord/embedded-app-sdk';

export type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
};

export type DiscordAuth = {
  access_token: string;
  user: DiscordUser;
  scopes: string[];
  expires: string;
  application: {
    id: string;
    name: string;
    icon: string | null;
    description: string;
  };
};

class DiscordSDKManager {
  private sdk: DiscordSDK | null = null;
  private auth: DiscordAuth | null = null;
  private isReady = false;
  private isEmbedded = false;

  constructor() {
    // Check if running in Discord embedded context
    this.isEmbedded = this.checkIfEmbedded();
  }

  /**
   * Check if the app is running inside Discord
   */
  private checkIfEmbedded(): boolean {
    // Check for Discord's iframe context
    if (typeof window === 'undefined') {
      return false;
    }

    // Discord Activities run in an iframe with specific query params
    const params = new URLSearchParams(window.location.search);
    return params.has('frame_id') || params.has('instance_id');
  }

  /**
   * Initialize the Discord SDK
   */
  async initialize(): Promise<boolean> {
    if (this.isReady) {
      return true;
    }

    try {
      const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

      if (!clientId) {
        console.warn('[DiscordSDK] VITE_DISCORD_CLIENT_ID not configured. Discord SDK disabled.');
        return false;
      }

      // Initialize SDK with client ID
      this.sdk = new DiscordSDK(clientId);

      // Wait for the SDK to be ready
      await this.sdk.ready();

      console.info('[DiscordSDK] SDK initialized successfully');
      this.isReady = true;

      // Authenticate if embedded
      if (this.isEmbedded) {
        await this.authenticate();
      }

      return true;
    } catch (error) {
      console.error('[DiscordSDK] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Authenticate with Discord
   */
  async authenticate(): Promise<DiscordAuth | null> {
    if (!this.sdk) {
      console.warn('[DiscordSDK] SDK not initialized');
      return null;
    }

    try {
      // Authorize with Discord
      const { code } = await this.sdk.commands.authorize({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID || 'mock-client-id',
        response_type: 'code',
        state: '',
        prompt: 'none',
        scope: [
          'identify',
          'guilds',
          'guilds.members.read',
        ],
      });

      // Exchange code for access token
      // Note: This should be done through your backend API
      const response = await fetch('/api/discord/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const auth = await response.json() as DiscordAuth;
      this.auth = auth;

      console.info('[DiscordSDK] Authenticated:', auth.user.username);
      return auth;
    } catch (error) {
      console.error('[DiscordSDK] Authentication failed:', error);
      return null;
    }
  }

  /**
   * Get current Discord user
   */
  getUser(): DiscordUser | null {
    return this.auth?.user || null;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.auth?.access_token || null;
  }

  /**
   * Check if running in Discord embedded context
   */
  isRunningInDiscord(): boolean {
    return this.isEmbedded;
  }

  /**
   * Check if SDK is ready
   */
  isSDKReady(): boolean {
    return this.isReady;
  }

  /**
   * Get the SDK instance
   */
  getSDK(): DiscordSDK | null {
    return this.sdk;
  }

  /**
   * Send activity update to Discord
   */
  async setActivity(activity: {
    type?: number;
    details?: string;
    state?: string;
    timestamps?: {
      start?: number;
      end?: number;
    };
    assets?: {
      large_image?: string;
      large_text?: string;
      small_image?: string;
      small_text?: string;
    };
    party?: {
      id?: string;
      size?: [number, number];
    };
  }): Promise<boolean> {
    if (!this.sdk || !this.isReady) {
      console.warn('[DiscordSDK] SDK not ready');
      return false;
    }

    try {
      await this.sdk.commands.setActivity({
        activity: {
          type: activity.type || 0,
          details: activity.details,
          state: activity.state,
          timestamps: activity.timestamps,
          assets: activity.assets,
          party: activity.party,
        },
      });

      return true;
    } catch (error) {
      console.error('[DiscordSDK] Failed to set activity:', error);
      return false;
    }
  }

  /**
   * Get guild/server information
   */
  async getGuild(): Promise<any> {
    if (!this.sdk || !this.isReady) {
      return null;
    }

    try {
      // Get current channel info which includes guild_id
      const channelId = this.sdk.channelId;
      const guildId = this.sdk.guildId;

      if (guildId) {
        return { guild_id: guildId, channel_id: channelId };
      }
      return null;
    } catch (error) {
      console.error('[DiscordSDK] Failed to get guild:', error);
      return null;
    }
  }

  /**
   * Encourage users to share/invite
   */
  async openShareDialog(): Promise<void> {
    if (!this.sdk || !this.isReady) {
      console.warn('[DiscordSDK] SDK not ready');
      return;
    }

    try {
      // Open external invite dialog
      await this.sdk.commands.openExternalLink({
        url: window.location.href,
      });
    } catch (error) {
      console.error('[DiscordSDK] Failed to open share dialog:', error);
    }
  }
}

// Export singleton instance
export const discordSdk = new DiscordSDKManager();

// Initialize on import (only in browser)
if (typeof window !== 'undefined') {
  discordSdk.initialize().catch((error) => {
    console.error('[DiscordSDK] Failed to initialize on import:', error);
  });
}
