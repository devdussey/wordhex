export interface DiscordIdentity {
  id: string;
  username: string;
  discriminator?: string;
  global_name?: string | null;
}

export interface DiscordActivityContext {
  frameId: string | null;
  guildId: string | null;
  channelId: string | null;
  instanceId: string | null;
}
