import type { DiscordSDK } from '@discord/embedded-app-sdk';
import type { DiscordActivityContext, DiscordIdentity } from './discord';

declare global {
  interface Window {
    __WORDHEX_DISCORD_USER__?: DiscordIdentity;
    __WORDHEX_DISCORD_SDK__?: DiscordSDK;
    __WORDHEX_DISCORD_CONTEXT__?: DiscordActivityContext;
  }
}

export {};
