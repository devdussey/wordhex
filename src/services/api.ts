import type {
  AuthResponse,
  GameSession,
  LobbyMaybeResponse,
  LobbyListResponse,
  LobbyResponse,
  LobbyRemovePlayerResponse,
  LobbySummary,
  LobbyStartResponse,
  LogsResponse,
  MatchHistoryEntry,
  MatchRecordResponse,
  MatchmakingJoinResponse,
  MatchmakingSnapshot,
  PlayerStatsResponse,
  LeaderboardEntry,
  ServerRecord,
  SessionResponse,
  SuccessResponse,
  RealtimeMessage,
} from '../types/api';

export interface MatchProgressPayload {
  players?: Array<{
    userId: string;
    username: string;
    score: number;
    roundsPlayed: number;
    wordsFound?: string[];
  }>;
  currentPlayerId: string | null;
  gridData?: unknown;
  wordsFound?: unknown;
  roundNumber?: number;
  lastTurn?: Record<string, unknown> | null;
  gameOver?: boolean;
}

function isLocalhost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

let memoApiBase: string | null = null;
let memoWsBase: string | null = null;
const FALLBACK_SERVER_ID = import.meta.env.VITE_SERVER_ID || 'dev-server-123';

function sanitizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function getDefaultServerId(): string {
  if (typeof window !== 'undefined') {
    const context = window.__WORDHEX_DISCORD_CONTEXT__;
    if (context?.guildId) {
      return context.guildId;
    }
  }

  return FALLBACK_SERVER_ID;
}

function isDiscordActivityHost(hostname: string): boolean {
  return /\.discord(?:says)?\.com$/i.test(hostname);
}

function shouldEnforceSameOrigin(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  if (isLocalhost(hostname)) {
    return false;
  }

  const allowCrossOriginEnv = import.meta.env.VITE_ALLOW_CROSS_ORIGIN_API;
  if (typeof allowCrossOriginEnv === 'string' && allowCrossOriginEnv.toLowerCase() === 'true') {
    return false;
  }

  if (isDiscordActivityHost(hostname)) {
    return true;
  }

  return true;
}

function computeApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    if (typeof window === 'undefined') {
      return sanitizeBaseUrl(envUrl);
    }

    try {
      const resolvedEnvUrl = new URL(envUrl, window.location.origin);
      const enforceSameOrigin = shouldEnforceSameOrigin();

      if (
        enforceSameOrigin &&
        !isLocalhost(resolvedEnvUrl.hostname) &&
        resolvedEnvUrl.origin !== window.location.origin
      ) {
        console.warn(
          `[api] Ignoring VITE_API_URL (${envUrl}) because it points to a different origin (${resolvedEnvUrl.origin}) than the app (${window.location.origin}). Falling back to same-origin /api to avoid CORS issues.`
        );
      } else {
        return sanitizeBaseUrl(resolvedEnvUrl.href);
      }
    } catch (error) {
      console.error(`[api] Invalid VITE_API_URL "${envUrl}". Falling back to default.`, error);
    }
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    if (isLocalhost(hostname)) {
      return 'http://localhost:3001/api';
    }
    console.warn(
      '[api] Missing usable VITE_API_URL; falling back to same-origin /api. Configure VITE_API_URL for production.'
    );
    return `${origin.replace(/\/$/, '')}/api`;
  }

  return 'http://localhost:3001/api';
}

function computeWsBase(apiBase: string): string {
  const envUrl = import.meta.env.VITE_WS_URL?.trim();
  if (envUrl) {
    if (typeof window === 'undefined') {
      return sanitizeBaseUrl(envUrl);
    }

    try {
      return sanitizeBaseUrl(new URL(envUrl, window.location.origin).href);
    } catch (error) {
      console.error(`[api] Invalid VITE_WS_URL "${envUrl}". Falling back to default.`, error);
    }
  }

  if (typeof window !== 'undefined') {
    const { protocol, host, hostname } = window.location;
    if (isLocalhost(hostname)) {
      return 'ws://localhost:3001/ws';
    }
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    console.warn(
      '[api] Missing usable VITE_WS_URL; falling back to same-origin /ws. Configure VITE_WS_URL for production.'
    );
    return `${wsProtocol}//${host}/ws`;
  }

  return sanitizeBaseUrl(
    apiBase
      .replace(/^http/i, (match) => (match.toLowerCase() === 'https' ? 'wss' : 'ws'))
      .replace(/\/api\/?$/, '/ws')
  );
}

function getApiBase(): string {
  if (!memoApiBase) {
    memoApiBase = computeApiBase();
  }
  return memoApiBase;
}

function getWsBase(): string {
  if (!memoWsBase) {
    memoWsBase = computeWsBase(getApiBase());
  }
  return memoWsBase;
}

let authToken: string | null = localStorage.getItem('wordhex_token');

function storeAuthCredentials(result: AuthResponse) {
  authToken = result.token;
  localStorage.setItem('wordhex_token', result.token);
  return result;
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...normalizeHeaders(options.headers),
  };
  const baseUrl = getApiBase();

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const url = `${baseUrl}${path}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`, options.body ? JSON.parse(options.body as string) : '');

  return fetch(url, {
    ...options,
    headers,
  }).then(async (response) => {
    const contentType = response.headers.get('content-type');
    const isJson = Boolean(contentType && contentType.includes('application/json'));
    const body: unknown = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof body === 'string'
          ? body
          : (typeof body === 'object' && body !== null && 'error' in body
              ? String((body as Record<string, unknown>).error)
              : response.statusText);
      console.error(`[API] ${options.method || 'GET'} ${url} failed:`, message);
      throw new Error(message);
    }

    console.log(`[API] ${options.method || 'GET'} ${url} success:`, body);
    return body as T;
  });
}

export const api = {
  auth: {
    async identityLogin(identity: { discordId?: string; username?: string }) {
      const result = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(identity),
      });
      return storeAuthCredentials(result);
    },
    async guest() {
      const result = await request<AuthResponse>('/auth/guest', { method: 'POST' });
      return storeAuthCredentials(result);
    },
    async registerEmail(payload: { email: string; password: string; username: string }) {
      const result = await request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return storeAuthCredentials(result);
    },
    async loginWithEmail(payload: { email: string; password: string }) {
      const result = await request<AuthResponse>('/auth/email-login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return storeAuthCredentials(result);
    },
    setToken(token: string) {
      authToken = token;
      localStorage.setItem('wordhex_token', token);
    },
    clearToken() {
      authToken = null;
      localStorage.removeItem('wordhex_token');
    },
    async getDiscordAuthUrl(returnTo: string): Promise<string> {
      const params = new URLSearchParams();
      if (returnTo) {
        params.set('returnTo', returnTo);
      }
      const queryString = params.toString();
      const path = `/auth/discord/start${queryString ? `?${queryString}` : ''}`;
      const response = await request<{ url?: string }>(path);
      if (!response?.url) {
        throw new Error('Discord OAuth URL was not returned by the server.');
      }
      return response.url;
    },
  },

  lobby: {
    create(payload: { hostId: string; username: string; serverId?: string; isPrivate?: boolean }) {
      return request<LobbyResponse>('/lobby/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async list(params: { serverId?: string } = {}) {
      const searchParams = new URLSearchParams();
      const serverId = params.serverId ?? getDefaultServerId();
      if (serverId) {
        searchParams.set('serverId', serverId);
      }
      const query = searchParams.toString();
      const response = await request<LobbyListResponse | LobbySummary[]>(
        `/lobbies${query ? `?${query}` : ''}`,
        { method: 'GET' }
      );
      const lobbies = Array.isArray(response) ? response : response.lobbies ?? [];
      return lobbies.filter((lobby) => !lobby.isPrivate);
    },
    join(payload: { code?: string; lobbyId?: string; userId: string; username: string }) {
      return request<LobbyResponse>('/lobby/join', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    get(lobbyId: string) {
      return request<LobbySummary>(`/lobby/${lobbyId}`, { method: 'GET' });
    },
    ready(payload: { lobbyId: string; userId: string; ready: boolean }) {
      return request<LobbyResponse>('/lobby/ready', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    leave(payload: { lobbyId: string; userId: string }) {
      return request<LobbyMaybeResponse>('/lobby/leave', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    removePlayer(payload: { lobbyId: string; targetUserId: string; requestedBy: string }) {
      return request<LobbyRemovePlayerResponse>('/lobby/remove-player', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    start(payload: { lobbyId: string }) {
      return request<LobbyStartResponse>('/lobby/start', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  matchmaking: {
    join(payload: { userId: string; username: string; serverId?: string }) {
      return request<MatchmakingJoinResponse>('/matchmaking/join', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    leave(payload: { userId: string }) {
      return request<SuccessResponse>('/matchmaking/leave', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    snapshot() {
      return request<MatchmakingSnapshot>('/matchmaking/snapshot', { method: 'GET' });
    },
  },

  game: {
    createSession(payload: { userId: string; playerName: string; serverId?: string; channelId?: string }) {
      return request<SessionResponse>('/game/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    completeSession(sessionId: string, payload: { score: number }) {
      return request<SessionResponse>(`/game/sessions/${sessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateMatchProgress(matchId: string, payload: MatchProgressPayload) {
      return request<MatchRecordResponse>(`/game/matches/${matchId}/progress`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    recordMatch(payload: {
      matchId?: string;
      lobbyId?: string;
      players: { id: string; username: string; score: number; wordsFound?: string[] }[];
      gridData?: unknown;
      wordsFound?: unknown[];
    }) {
      return request<MatchRecordResponse>('/game/matches', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    activeSessions(serverId: string) {
      const params = new URLSearchParams({ serverId });
      return request<GameSession[]>(`/sessions/active?${params.toString()}`, { method: 'GET' });
    },
  },

  stats: {
    leaderboard(limit = 10) {
      const params = new URLSearchParams({ limit: String(limit) });
      return request<LeaderboardEntry[]>(`/leaderboard?${params.toString()}`, { method: 'GET' });
    },
    player(userId: string) {
      return request<PlayerStatsResponse>(`/stats/${userId}`, { method: 'GET' });
    },
    matches(userId: string, limit = 20) {
      const params = new URLSearchParams({ limit: String(limit) });
      return request<MatchHistoryEntry[]>(`/matches/${userId}?${params.toString()}`, {
        method: 'GET',
      });
    },
    serverRecord(serverId: string) {
      const params = new URLSearchParams({ serverId });
      return request<ServerRecord | null>(`/server-records?${params.toString()}`, { method: 'GET' });
    },
    updateServerRecord(payload: {
      serverId: string;
      userId: string;
      username: string;
      score: number;
      wordsFound?: number;
      gemsCollected?: number;
    }) {
      return request<ServerRecord>('/server-records', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  logs: {
    client(payload: Record<string, unknown>) {
      return request<LogsResponse>('/logs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },
};

type MessageHandler = (payload: RealtimeMessage) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private channelHandlers = new Map<string, Set<MessageHandler>>();
  private identifyPayload: { userId: string; username: string } | null = null;

  connect(userId: string, username: string) {
    this.identifyPayload = { userId, username };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.identify();
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return;
    }
    this.ws = new WebSocket(getWsBase());
    this.ws.onopen = () => {
      this.identify();
      this.resubscribeAll();
    };
    this.ws.onclose = () => {
      this.ws = null;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      this.reconnectTimeout = setTimeout(() => {
        if (this.identifyPayload) {
          this.connect(this.identifyPayload.userId, this.identifyPayload.username);
        }
      }, 2000);
    };
    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as RealtimeMessage;
        const { channel } = payload;
        if (!channel) {
          return;
        }
        const handlers = this.channelHandlers.get(channel);
        if (handlers) {
          handlers.forEach((handler) => handler(payload));
        }
      } catch (error) {
        console.warn('Failed to parse realtime message', error);
      }
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  subscribe(channel: string, handler: MessageHandler) {
    if (!this.channelHandlers.has(channel)) {
      this.channelHandlers.set(channel, new Set());
    }
    this.channelHandlers.get(channel)!.add(handler);
    this.send({ type: 'subscribe', channel });
  }

  unsubscribe(channel: string, handler?: MessageHandler) {
    const handlers = this.channelHandlers.get(channel);
    if (!handlers) return;
    if (handler) {
      handlers.delete(handler);
    } else {
      handlers.clear();
    }
    if (handlers.size === 0) {
      this.channelHandlers.delete(channel);
      this.send({ type: 'unsubscribe', channel });
    }
  }

  private identify() {
    if (this.identifyPayload) {
      this.send({ type: 'identify', ...this.identifyPayload });
    }
  }

  private resubscribeAll() {
    this.channelHandlers.forEach((_handlers, channel) => {
      this.send({ type: 'subscribe', channel });
    });
  }

  private send(payload: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  sendPlayerAction(matchId: string, playerId: string, username: string, action: { type: string; selectedLetters?: string; word?: string; timestamp: string }) {
    this.send({
      type: 'player:action',
      matchId,
      playerId,
      username,
      action,
    });
  }
}

export const realtime = new RealtimeClient();
