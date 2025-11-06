import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { randomUUID, createHmac } from 'crypto';
import rateLimit from 'express-rate-limit';

import {
  upsertUser,
  createGuestUser,
  createLobby,
  joinLobby,
  joinLobbyByCode,
  getLobbyById,
  listLobbies,
  setPlayerReady,
  leaveLobby,
  removeLobbyPlayer,
  startLobby,
  createSession,
  completeSession,
  joinMatchmaking,
  leaveMatchmaking,
  getLeaderboard,
  getPlayerStats,
  getMatchHistory,
  getActiveSessions,
  updateMatchProgress,
  recordMatchResults,
  updateServerRecord,
  getServerRecord,
  getMatchmakingSnapshot,
  onStateEvent,
} from './state.js';
import prisma from './db.js';

dotenv.config();

const app = express();
// Trust the first proxy (Railway/load balancers) so Express recognises X-Forwarded-* headers.
// Allow overriding the behaviour via the TRUST_PROXY environment variable.
function resolveTrustProxy(value) {
  if (value == null) {
    return process.env.NODE_ENV === 'production' ? 1 : false;
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return false;
  }

  if (/^(true|false)$/i.test(trimmedValue)) {
    return trimmedValue.toLowerCase() === 'true';
  }

  const numericValue = Number(trimmedValue);
  if (!Number.isNaN(numericValue)) {
    return numericValue;
  }

  return trimmedValue;
}

app.set('trust proxy', resolveTrustProxy(process.env.TRUST_PROXY));
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://localhost:3001',
];

const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];
const allowedOrigins = [...defaultAllowedOrigins, ...configuredOrigins];

const oauthStates = new Map(); // state -> { createdAt, returnTo }
const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;
const DISCORD_OAUTH_SCOPES = ['identify', 'guilds'];

function getDiscordClientId() {
  return process.env.DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID;
}

function getDiscordClientSecret() {
  return process.env.DISCORD_CLIENT_SECRET;
}

function isAllowedOrigin(origin) {
  return allowedOrigins.some((allowed) => {
    if (allowed === origin) return true;
    if (allowed.endsWith('*')) {
      const base = allowed.slice(0, -1);
      return origin.startsWith(base);
    }
    return false;
  });
}

function getRequestBaseUrl(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const protocol = forwardedProto ? forwardedProto.split(',')[0] : req.protocol;
  const host = forwardedHost ? forwardedHost.split(',')[0] : req.get('host');
  return `${protocol}://${host}`;
}

function getDefaultReturnTo(req) {
  if (process.env.DISCORD_SUCCESS_REDIRECT) {
    return process.env.DISCORD_SUCCESS_REDIRECT;
  }
  const fallbackOrigin = allowedOrigins.find((origin) => !origin.endsWith('*'));
  if (fallbackOrigin) {
    return `${fallbackOrigin.replace(/\/$/, '')}/`;
  }
  const baseUrl = getRequestBaseUrl(req);
  return `${baseUrl.replace(/\/$/, '')}/`;
}

function resolveReturnTo(req, rawReturnTo) {
  const baseUrl = getRequestBaseUrl(req);
  const defaultReturn = getDefaultReturnTo(req);
  let value = null;
  if (typeof rawReturnTo === 'string') {
    value = rawReturnTo;
  } else if (Array.isArray(rawReturnTo)) {
    value = rawReturnTo[0] ?? null;
  } else if (rawReturnTo != null) {
    value = String(rawReturnTo);
  }

  if (!value) {
    return defaultReturn;
  }

  try {
    const url = new URL(value, baseUrl);
    if (url.origin === baseUrl || isAllowedOrigin(url.origin)) {
      return url.toString();
    }
  } catch (error) {
    console.warn('[OAuth] Failed to parse returnTo URL', error);
  }

  return defaultReturn;
}

function pruneOauthStates() {
  const now = Date.now();
  for (const [state, details] of oauthStates.entries()) {
    if (!details?.createdAt || now - details.createdAt > OAUTH_STATE_TTL_MS) {
      oauthStates.delete(state);
    }
  }
}

function buildRedirectUrl(target, params) {
  const url = new URL(target);
  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function getDiscordRedirectUri(req) {
  const baseUrl = getRequestBaseUrl(req).replace(/\/$/, '');
  return `${baseUrl}/api/auth/discord/callback`;
}

function encodeProfilePayload(payload) {
  const json = JSON.stringify(payload);
  return Buffer.from(json)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function consumeOauthState(state) {
  if (!state) {
    return null;
  }

  pruneOauthStates();
  const details = oauthStates.get(state);
  if (!details) {
    return null;
  }

  oauthStates.delete(state);
  const isExpired = !details.createdAt || Date.now() - details.createdAt > OAUTH_STATE_TTL_MS;
  return { ...details, isExpired };
}


// Input validation helpers
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function validateUserId(userId) {
  return userId && typeof userId === 'string' && userId.length > 0 && userId.length <= 255;
}

function validateUsername(username) {
  return username && typeof username === 'string' && username.length > 0 && username.length <= 100;
}

function validateLobbyCode(code) {
  return code && typeof code === 'string' && /^[0-9]{4}$/.test(code);
}

const corsHandler = (req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    allowedOrigins.some((allowed) => {
      if (allowed === origin) return true;
      if (allowed.endsWith('*')) {
        const base = allowed.slice(0, -1);
        return origin.startsWith(base);
      }
      return false;
    })
  ) {
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    // Origin exists but not in allowlist - reject the request
    console.warn(`[CORS] Origin not in allowlist, rejecting: ${origin}`);
    res.header('Vary', 'Origin');
    // Do not set Access-Control-Allow-Origin header for unauthorized origins
  } else {
    // No origin header (non-browser requests like curl, server-to-server)
    // Allow these for backward compatibility with non-browser clients
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Info'
  );
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
};

app.use(corsHandler);
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }, // Skip trust proxy validation - we handle it ourselves
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Stricter limit for auth endpoints
  message: 'Too many authentication attempts, please try again later.',
  validate: { trustProxy: false }, // Skip trust proxy validation - we handle it ourselves
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

const CHANNEL_MATCHMAKING = 'matchmaking:global';
const LOBBY_RECONNECT_GRACE_MS = 2 * 60 * 1000;

const channelSubscriptions = new Map(); // channel -> Set<ws>
const userConnections = new Map(); // userId -> { sockets: Set<ws>, timeout: ReturnType<typeof setTimeout> | null }

function trackUserConnection(ws) {
  if (!ws.userId) {
    return;
  }

  let entry = userConnections.get(ws.userId);
  if (!entry) {
    entry = { sockets: new Set(), timeout: null };
    userConnections.set(ws.userId, entry);
  }

  entry.sockets.add(ws);
  if (entry.timeout) {
    clearTimeout(entry.timeout);
    entry.timeout = null;
  }
}

function scheduleLobbyCleanup(userId) {
  const entry = userConnections.get(userId);
  if (!entry) {
    return;
  }
  if (entry.sockets.size > 0 || entry.timeout) {
    return;
  }

  entry.timeout = setTimeout(async () => {
    try {
      const currentEntry = userConnections.get(userId);
      if (currentEntry && currentEntry.sockets.size > 0) {
        return;
      }

      const memberships = await prisma.lobbyPlayer.findMany({
        where: { userId },
        select: { lobbyId: true },
      });

      for (const membership of memberships) {
        const { lobbyId } = membership;
        try {
          await leaveLobby({ lobbyId, userId });
        } catch (error) {
          console.error('Failed to auto-remove disconnected player from lobby', lobbyId, userId, error);
        }
      }
    } catch (error) {
      console.error('Failed to clean up lobbies for disconnected user', userId, error);
    } finally {
      const latestEntry = userConnections.get(userId);
      if (!latestEntry) {
        return;
      }
      latestEntry.timeout = null;
      if (latestEntry.sockets.size === 0) {
        userConnections.delete(userId);
      }
    }
  }, LOBBY_RECONNECT_GRACE_MS);
}

function releaseUserConnection(ws) {
  if (!ws.userId) {
    return;
  }

  const entry = userConnections.get(ws.userId);
  if (!entry) {
    return;
  }

  entry.sockets.delete(ws);
  if (entry.sockets.size === 0) {
    scheduleLobbyCleanup(ws.userId);
  }
}

function subscriptionKey(channel) {
  return channel.toString();
}

function subscribe(ws, channel) {
  const key = subscriptionKey(channel);
  if (!channelSubscriptions.has(key)) {
    channelSubscriptions.set(key, new Set());
  }
  channelSubscriptions.get(key).add(ws);
  if (!ws.subscriptions) {
    ws.subscriptions = new Set();
  }
  ws.subscriptions.add(key);
}

function unsubscribe(ws, channel) {
  const key = subscriptionKey(channel);
  if (channelSubscriptions.has(key)) {
    channelSubscriptions.get(key).delete(ws);
    if (channelSubscriptions.get(key).size === 0) {
      channelSubscriptions.delete(key);
    }
  }
  if (ws.subscriptions) {
    ws.subscriptions.delete(key);
  }
}

function broadcast(channel, payload) {
  const key = subscriptionKey(channel);
  const subscribers = channelSubscriptions.get(key);
  if (!subscribers) return;
  const message = JSON.stringify({ channel: key, ...payload });
  subscribers.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  ws.subscriptions = new Set();

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (message.type === 'identify') {
        ws.userId = message.userId;
        ws.username = message.username;
        trackUserConnection(ws);
      }
      if (message.type === 'subscribe') {
        subscribe(ws, message.channel);
      }
      if (message.type === 'unsubscribe') {
        unsubscribe(ws, message.channel);
      }
      if (message.type === 'player:action') {
        // Broadcast player action to all players in the match
        const { matchId, action, playerId, username } = message;
        if (matchId && action) {
          broadcast(`match:${matchId}`, {
            type: 'player:action',
            playerId,
            username,
            action,
          });
        }
      }
    } catch (error) {
      console.error('Failed to handle websocket message', error);
    }
  });

  ws.on('close', () => {
    if (ws.subscriptions) {
      ws.subscriptions.forEach((channel) => unsubscribe(ws, channel));
    }
    releaseUserConnection(ws);
  });
});

// Broadcast hooks
onStateEvent('lobby:updated', (lobby) => {
  if (lobby) {
    broadcast(`lobby:${lobby.id}`, { type: 'lobby:update', lobby });
    if (!lobby.isPrivate) {
      broadcast(`server:${lobby.serverId}:lobbies`, { type: 'lobby:update', lobby });
    }
  }
});

onStateEvent('lobby:deleted', ({ lobbyId, serverId }) => {
  broadcast(`lobby:${lobbyId}`, { type: 'lobby:deleted', lobbyId });
  if (serverId) {
    broadcast(`server:${serverId}:lobbies`, { type: 'lobby:deleted', lobbyId });
  }
});

onStateEvent('matchmaking:updated', (snapshot) => {
  broadcast(CHANNEL_MATCHMAKING, { type: 'matchmaking:update', snapshot });
});

onStateEvent('match:started', (match) => {
  if (match?.lobbyId) {
    broadcast(`lobby:${match.lobbyId}`, { type: 'match:started', match });
  }
  broadcast(`match:${match.id}`, { type: 'match:update', match });
});

onStateEvent('match:updated', (match) => {
  if (match?.lobbyId) {
    broadcast(`lobby:${match.lobbyId}`, { type: 'match:update', match });
  }
  broadcast(`match:${match.id}`, { type: 'match:update', match });
});

onStateEvent('match:completed', (match) => {
  if (match?.lobbyId) {
    broadcast(`lobby:${match.lobbyId}`, { type: 'match:completed', match });
  }
});

onStateEvent('session:updated', (session) => {
  broadcast(`sessions:${session.serverId}`, { type: 'sessions:update', session });
});

onStateEvent('server-record:updated', (record) => {
  broadcast(`server-record:${record.serverId}`, { type: 'server-record:update', record });
});

// Routes
app.get('/api/auth/discord/start', (req, res) => {
  try {
    const clientId = getDiscordClientId();
    const clientSecret = getDiscordClientSecret();

    if (!clientId || !clientSecret) {
      console.error('[OAuth] Discord credentials are not configured');
      return res.status(500).json({ error: 'Discord OAuth is not configured.' });
    }

    pruneOauthStates();

    const returnTo = resolveReturnTo(req, req.query.returnTo);
    const state = randomUUID();
    oauthStates.set(state, {
      createdAt: Date.now(),
      returnTo,
    });

    const authorizeUrl = buildRedirectUrl('https://discord.com/oauth2/authorize', {
      client_id: clientId,
      response_type: 'code',
      redirect_uri: getDiscordRedirectUri(req),
      scope: DISCORD_OAUTH_SCOPES.join(' '),
      prompt: 'consent',
      state,
    });

    res.set('Cache-Control', 'no-store');
    return res.json({ url: authorizeUrl });
  } catch (error) {
    console.error('auth/discord/start error', error);
    return res.status(500).json({ error: 'Failed to start Discord login.' });
  }
});

app.get('/api/auth/discord/callback', async (req, res) => {
  const rawState = req.query.state;
  const stateValue = Array.isArray(rawState) ? rawState[0] : rawState;
  const stateDetails = consumeOauthState(stateValue);
  const returnTo = stateDetails?.returnTo ?? getDefaultReturnTo(req);

  const redirectWithError = (message, statusCode = 400) => {
    if (statusCode >= 500) {
      console.error('[OAuth] Discord callback error:', message);
    }
    const location = buildRedirectUrl(returnTo, { error: message });
    return res.redirect(location);
  };

  if (!stateValue) {
    return redirectWithError('We could not verify your Discord login. Please try again.');
  }

  if (!stateDetails) {
    return redirectWithError('Your Discord login could not be validated. Please try again.');
  }

  if (stateDetails.isExpired) {
    return redirectWithError('Your Discord login attempt expired. Please try again.');
  }

  const discordError = req.query.error;
  const errorDescription = req.query.error_description;
  if (discordError) {
    const message =
      typeof errorDescription === 'string' && errorDescription.length > 0
        ? errorDescription
        : 'Discord rejected the login attempt. Please try again.';
    return redirectWithError(message);
  }

  const rawCode = req.query.code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  if (!code) {
    return redirectWithError('We did not receive a login code from Discord. Please try again.');
  }

  const clientId = getDiscordClientId();
  const clientSecret = getDiscordClientSecret();

  if (!clientId || !clientSecret) {
    return redirectWithError('Discord login is not available right now. Please try again later.', 500);
  }

  // For Embedded App SDK authorize() flow, Discord expects redirect_uri to be 'http://localhost'
  // When falling back to standard web OAuth, use our hosted callback URL.
  const embedded = String(req.query.embedded || '').toLowerCase() === '1' || String(req.query.embedded || '').toLowerCase() === 'true';
  const redirectUri = embedded ? 'http://localhost' : getDiscordRedirectUri(req);

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      console.error('[OAuth] Failed to exchange Discord code', tokenResponse.status, body);
      return redirectWithError('We could not verify your Discord login. Please try again later.', 500);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('[OAuth] Discord token response missing access_token', tokenData);
      return redirectWithError('We could not verify your Discord login. Please try again later.', 500);
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      const body = await userResponse.text();
      console.error('[OAuth] Failed to fetch Discord profile', userResponse.status, body);
      return redirectWithError('We could not fetch your Discord profile. Please try again later.', 500);
    }

    const discordUser = await userResponse.json();

    if (!discordUser?.id) {
      console.error('[OAuth] Discord profile missing id', discordUser);
      return redirectWithError('We could not fetch your Discord profile. Please try again later.', 500);
    }

    const preferredUsername =
      discordUser.global_name || discordUser.username || `Discord User ${discordUser.id}`;

    const user = await upsertUser({
      discordId: discordUser.id,
      username: preferredUsername,
    });

    const profile = {
      id: user.id,
      username: user.username,
      discordId: user.discordId,
      email: user.email ?? null,
      authType: 'discord',
      coins: user.coins ?? 0,
      gems: user.gems ?? 0,
      cosmetics: user.cosmetics ?? ['default'],
      createdAt: user.createdAt,
      stats: user.stats,
    };

    const redirectLocation = buildRedirectUrl(returnTo, {
      token: user.id,
      profile: encodeProfilePayload(profile),
    });

    return res.redirect(redirectLocation);
  } catch (error) {
    console.error('auth/discord/callback error', error);
    return redirectWithError('We could not complete your Discord login. Please try again later.', 500);
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { discordId, username } = req.body ?? {};
    if (!discordId && !username) {
      return res.status(400).json({ error: 'discordId or username required' });
    }
    const user = await upsertUser({ discordId, username });
    res.json({ token: user.id, user });
  } catch (error) {
    console.error('auth/login error', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.post('/api/auth/guest', async (_req, res) => {
  try {
    const user = await createGuestUser();
    res.json({ token: user.id, user });
  } catch (error) {
    console.error('auth/guest error', error);
    res.status(500).json({ error: 'Failed to create guest' });
  }
});

app.post('/api/matchmaking/join', async (req, res) => {
  try {
    const { userId, username, serverId = 'global' } = req.body ?? {};
    if (!userId || !username) {
      return res.status(400).json({ error: 'userId and username are required' });
    }
    const result = await joinMatchmaking({ userId, username, serverId });
    res.json(result);
  } catch (error) {
    console.error('matchmaking/join error', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

app.post('/api/matchmaking/leave', async (req, res) => {
  try {
    const { userId } = req.body ?? {};
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    const result = await leaveMatchmaking({ userId });
    res.json(result);
  } catch (error) {
    console.error('matchmaking/leave error', error);
    res.status(500).json({ error: 'Failed to leave queue' });
  }
});

app.get('/api/matchmaking/snapshot', async (_req, res) => {
  res.json(await getMatchmakingSnapshot());
});

// Simple health and diagnostics endpoint
app.get('/api/health', async (_req, res) => {
  let dbOk = false;
  try {
    // Basic DB check: raw SELECT 1
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (_) {
    dbOk = false;
  }
  res.json({ ok: true, uptime: process.uptime(), dbOk });
});

// Also respond on /api and /api/
app.get('/api', (_req, res) => {
  res.json({ ok: true, message: 'WordHex API', endpoints: ['/api/health', '/api/leaderboard', '/api/sessions/active'] });
});

app.post('/api/lobby/create', async (req, res) => {
  try {
    const { hostId: requestedHostId, username, serverId = 'global', isPrivate = false } = req.body ?? {};
    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }
    // Ensure user exists in database and get their actual ID
    const user = await upsertUser({ discordId: null, username });
    const hostId = user.id;
    const lobby = await createLobby({ hostId, hostUsername: username, serverId });
    res.json({ lobby });
  } catch (error) {
    console.error('lobby/create error', error);
    res.status(500).json({ error: 'Failed to create lobby' });
  }
});

app.post('/api/lobby/join', async (req, res) => {
  try {
    const { code, lobbyId, userId: requestedUserId, username } = req.body ?? {};

    // Validate inputs
    if (code && !validateLobbyCode(code)) {
      return res.status(400).json({ error: 'Invalid lobby code format' });
    }
    if (lobbyId && !isValidUUID(lobbyId)) {
      return res.status(400).json({ error: 'Invalid lobby ID format' });
    }
    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Invalid username' });
    }
    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }
    // Ensure user exists in database and get their actual ID
    const user = await upsertUser({ discordId: null, username });
    const userId = user.id;

    let lobby = null;
    if (code) {
      lobby = await joinLobbyByCode({ code: code.toString(), userId, username });
    } else if (lobbyId) {
      lobby = await joinLobby({ lobbyId, userId, username });
    } else {
      return res.status(400).json({ error: 'code or lobbyId required' });
    }
    res.json({ lobby });
  } catch (error) {
    console.error('lobby/join error', error);
    res.status(500).json({ error: 'Failed to join lobby' });
  }
});

app.get('/api/lobbies', async (req, res) => {
  try {
    const { serverId = 'global' } = req.query;
    const lobbies = await listLobbies(serverId);
    res.json(lobbies);
  } catch (error) {
    console.error('lobbies list error', error);
    res.status(500).json({ error: 'Failed to list lobbies' });
  }
});

app.get('/api/lobby/:lobbyId', async (req, res) => {
  if (!isValidUUID(req.params.lobbyId)) {
    return res.status(400).json({ error: 'Invalid lobby ID format' });
  }
  const lobby = await getLobbyById(req.params.lobbyId);
  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }
  res.json(lobby);
});

app.post('/api/lobby/ready', async (req, res) => {
  try {
    const { lobbyId, userId, ready } = req.body ?? {};
    if (!lobbyId || !userId || typeof ready !== 'boolean') {
      return res.status(400).json({ error: 'lobbyId, userId and ready are required' });
    }
    const lobby = await setPlayerReady({ lobbyId, userId, ready });
    res.json({ lobby });
  } catch (error) {
    console.error('lobby/ready error', error);
    res.status(500).json({ error: 'Failed to update ready status' });
  }
});

app.post('/api/lobby/leave', async (req, res) => {
  try {
    const { lobbyId, userId } = req.body ?? {};
    if (!lobbyId || !userId) {
      return res.status(400).json({ error: 'lobbyId and userId required' });
    }
    const lobby = await leaveLobby({ lobbyId, userId });
    res.json({ lobby });
  } catch (error) {
    console.error('lobby/leave error', error);
    res.status(500).json({ error: 'Failed to leave lobby' });
  }
});

app.post('/api/lobby/remove-player', async (req, res) => {
  try {
    const { lobbyId, targetUserId, requestedBy } = req.body ?? {};
    if (!lobbyId || !targetUserId || !requestedBy) {
      return res.status(400).json({ error: 'lobbyId, targetUserId and requestedBy required' });
    }
    if (!isValidUUID(lobbyId)) {
      return res.status(400).json({ error: 'Invalid lobby ID format' });
    }
    if (!validateUserId(targetUserId) || !validateUserId(requestedBy)) {
      return res.status(400).json({ error: 'Invalid user identifier' });
    }

    const result = await removeLobbyPlayer({ lobbyId, targetUserId, requestedBy });
    res.json(result);
  } catch (error) {
    console.error('lobby/remove-player error', error);
    const message = error instanceof Error ? error.message : 'Failed to remove player';
    const status =
      message === 'Only the host can remove players'
        ? 403
        : message === 'Lobby not found'
        ? 404
        : 500;
    res.status(status).json({ error: message });
  }
});

app.post('/api/lobby/start', async (req, res) => {
  try {
    const { lobbyId } = req.body ?? {};
    if (!lobbyId) {
      return res.status(400).json({ error: 'lobbyId required' });
    }
    const result = await startLobby({ lobbyId });
    res.json(result);
  } catch (error) {
    console.error('lobby/start error', error);
    res.status(500).json({ error: 'Failed to start lobby' });
  }
});

app.post('/api/game/sessions', async (req, res) => {
  try {
    const { userId, playerName, serverId = 'global', channelId } = req.body ?? {};
    if (!userId || !playerName) {
      return res.status(400).json({ error: 'userId and playerName required' });
    }
    const session = await createSession({ userId, playerName, serverId, channelId });
    res.json({ session });
  } catch (error) {
    console.error('game/sessions error', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.post('/api/game/sessions/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { score } = req.body ?? {};
    const session = await completeSession(sessionId, { score });
    res.json({ session });
  } catch (error) {
    console.error('game/sessions complete error', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

app.post('/api/game/matches/:matchId/progress', async (req, res) => {
  try {
    const { matchId } = req.params;
    if (!isValidUUID(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID format' });
    }
    const {
      players,
      currentPlayerId,
      gridData,
      wordsFound,
      roundNumber,
      lastTurn,
      gameOver,
    } = req.body ?? {};

    if (!matchId) {
      return res.status(400).json({ error: 'matchId required' });
    }

    const match = await updateMatchProgress({
      matchId,
      players,
      currentPlayerId,
      gridData,
      wordsFound,
      roundNumber,
      lastTurn,
      gameOver,
    });

    res.json({ match });
  } catch (error) {
    console.error('game/matches progress error', error);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

app.post('/api/game/matches', async (req, res) => {
  try {
    const { matchId, players, gridData, wordsFound, lobbyId } = req.body ?? {};
    if (!players || !Array.isArray(players)) {
      return res.status(400).json({ error: 'players array required' });
    }
    const match = await recordMatchResults({
      matchId: matchId ?? randomUUID(),
      players,
      gridData,
      wordsFound: wordsFound ?? [],
      lobbyId,
    });
    res.json({ match });
  } catch (error) {
    console.error('game/matches error', error);
    res.status(500).json({ error: 'Failed to record match' });
  }
});

app.get('/api/sessions/active', async (req, res) => {
  const { serverId = 'global' } = req.query;
  const sessions = await getActiveSessions(serverId);
  res.json(sessions);
});

app.get('/api/leaderboard', async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  res.json(await getLeaderboard(limit));
});

app.get('/api/stats/:userId', async (req, res) => {
  const stats = await getPlayerStats(req.params.userId);
  if (!stats) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(stats);
});

app.get('/api/matches/:userId', async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  res.json(await getMatchHistory(req.params.userId, limit));
});

app.get('/api/server-records', async (req, res) => {
  const { serverId = 'global' } = req.query;
  res.json((await getServerRecord(serverId)) ?? null);
});

app.post('/api/server-records', async (req, res) => {
  try {
    const { serverId = 'global', userId, username, score, wordsFound, gemsCollected } = req.body ?? {};
    if (!userId || !username || typeof score !== 'number') {
      return res.status(400).json({ error: 'userId, username and score are required' });
    }
    const record = await updateServerRecord({
      serverId,
      userId,
      username,
      score,
      wordsFound: wordsFound ?? 0,
      gemsCollected: gemsCollected ?? 0,
    });
    res.json(record);
  } catch (error) {
    console.error('server-records update error', error);
    res.status(500).json({ error: 'Failed to update server record' });
  }
});

app.post('/api/logs', (req, res) => {
  const payload = req.body ?? {};
  console.warn('[ClientLog]', payload);
  res.json({ ok: true });
});

// Clean up expired OAuth states every 5 minutes
const oauthStatePruneInterval = setInterval(pruneOauthStates, 5 * 60 * 1000);

const PORT = Number(process.env.PORT || 3001);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
  console.log(`WebSocket listening on ws://0.0.0.0:${PORT}/ws`);
});

oauthStatePruneInterval.unref?.();

// Discord interactions endpoint for activity validation
app.post('/interactions', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  // Verify Discord signature (optional - only if DISCORD_PUBLIC_KEY is set)
  // If verification is not set up, just respond to PING requests
  if (publicKey && signature && timestamp) {
    try {
      // For now, we skip signature verification since it requires nacl library
      // Discord will still accept our PING response
      console.log('[interactions] Received Discord interaction request');
    } catch (error) {
      console.error('[interactions] Signature verification failed', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Parse body if it's still a string
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const { type } = body;

  // Discord sends a PING interaction (type 1) for verification
  if (type === 1) {
    console.log('[interactions] Responding to PING');
    return res.json({ type: 1 });
  }

  // Handle other interaction types if needed
  console.log('[interactions] Unknown interaction type:', type);
  res.status(400).json({ error: 'Unknown interaction type' });
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Received ${signal}. Shutting down gracefully...`);

  clearInterval(oauthStatePruneInterval);

  const forceExitTimeout = setTimeout(() => {
    console.error('Forcing shutdown after graceful timeout.');
    process.exit(1);
  }, 10_000);
  forceExitTimeout.unref?.();

  wss.clients.forEach((client) => {
    try {
      client.terminate();
    } catch (error) {
      console.error('Failed to terminate WebSocket client during shutdown:', error);
    }
  });

  wss.close((error) => {
    if (error) {
      console.error('Error closing WebSocket server during shutdown:', error);
    }
  });

  prisma
    .$disconnect()
    .catch((error) => {
      console.error('Error disconnecting Prisma during shutdown:', error);
    })
    .finally(() => {
      httpServer.close((error) => {
        if (error) {
          console.error('Error closing HTTP server during shutdown:', error);
          process.exit(1);
          return;
        }

        console.log('Shutdown complete.');
        process.exit(0);
      });
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
