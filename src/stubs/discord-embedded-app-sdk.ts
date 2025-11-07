export type AuthorizeOptions = {
  client_id: string;
  response_type: string;
  state?: string;
  prompt?: string;
  scope?: string[];
};

export type AuthorizeResponse = {
  code: string;
};

export type SetActivityOptions = {
  activity: {
    type?: number;
    name?: string;
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
    secrets?: Record<string, string>;
    instance?: boolean;
  };
};

export type ExternalLinkOptions = {
  url: string;
};

const warn = (message: string) => {
  if (typeof console !== 'undefined') {
    console.warn(`[DiscordSDK Stub] ${message}`);
  }
};

export class DiscordSDK {
  readonly channelId?: string;
  readonly guildId?: string;

  constructor(private readonly clientId: string) {
    warn(`Initialized with client id "${clientId}". The embedded app SDK is stubbed in this environment.`);
  }

  async ready(): Promise<void> {
    warn('ready() called. Resolving immediately because real SDK is unavailable.');
  }

  commands = {
    authorize: async (options: AuthorizeOptions): Promise<AuthorizeResponse> => {
      warn(
        `authorize() called with response_type="${options.response_type}" and scopes="${options.scope?.join(', ') ?? 'none'}". Returning mock authorization code.`,
      );
      return { code: 'mock-authorization-code' };
    },
    setActivity: async (options: SetActivityOptions): Promise<void> => {
      warn(`setActivity() called with payload: ${JSON.stringify(options.activity)}. Activity updates are not supported in the stub.`);
    },
    openExternalLink: async (options: ExternalLinkOptions): Promise<void> => {
      warn(`openExternalLink() called for url: ${options.url}. Opening via window.open when available.`);
      if (typeof window !== 'undefined') {
        window.open(options.url, '_blank', 'noopener,noreferrer');
      }
    },
  };
}
