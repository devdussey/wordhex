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

export interface DiscordAuthorizeOptions {
  client_id: string;
  response_type: 'code';
  state: string;
  prompt: 'none' | 'consent';
  scope: string[];
}
