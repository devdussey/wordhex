/**
 * React Hook for Discord Embedded SDK
 * Provides easy access to Discord SDK functionality
 */

import { useEffect, useState } from 'react';
import { discordSdk, type DiscordUser } from '../lib';

export function useDiscordSdk() {
  const [isReady, setIsReady] = useState(discordSdk.isSDKReady());
  const [isEmbedded, setIsEmbedded] = useState(discordSdk.isRunningInDiscord());
  const [user, setUser] = useState<DiscordUser | null>(discordSdk.getUser());

  useEffect(() => {
    // Wait for SDK to be ready
    const checkReady = async () => {
      if (!discordSdk.isSDKReady()) {
        await discordSdk.initialize();
      }
      setIsReady(discordSdk.isSDKReady());
      setIsEmbedded(discordSdk.isRunningInDiscord());
      setUser(discordSdk.getUser());
    };

    void checkReady();
  }, []);

  /**
   * Update Discord activity status
   */
  const setActivity = async (details: string, state?: string) => {
    if (!isReady || !isEmbedded) {
      return false;
    }

    return await discordSdk.setActivity({
      details,
      state,
      timestamps: {
        start: Date.now(),
      },
      assets: {
        large_image: 'wordhex-logo',
        large_text: 'WordHex',
      },
    });
  };

  /**
   * Open Discord share dialog
   */
  const openShareDialog = async () => {
    if (!isReady || !isEmbedded) {
      return;
    }
    await discordSdk.openShareDialog();
  };

  return {
    isReady,
    isEmbedded,
    user,
    setActivity,
    openShareDialog,
    sdk: discordSdk,
  };
}
