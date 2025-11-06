import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import webhookService from '../server/webhookService.js';
import { logBackendError, logDatabaseError } from '../server/errorLogger.js';

// Note: WebSocket not supported on Vercel Serverless Functions
// Use Supabase Realtime instead (already configured in environment)

import {
  upsertUser,
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
import {
  publishSupabaseEvent,
  shutdownSupabaseRealtime,
  isSupabaseRealtimeEnabled,
} from './supabaseRealtime.js';
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
  if (origin && isAllowedOrigin(origin)) {
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

app.use('/api/', limiter);

// WebSocket and real-time updates are handled by Supabase Realtime
// The backend will use publishSupabaseEvent() to broadcast changes
// No local WebSocket server needed on Vercel

// Routes
app.all(['/api/auth', '/api/auth/*'], (_req, res) => {
  res.status(410).json({
    error: 'Legacy authentication endpoints have been disabled. Please use Supabase authentication.',
  });
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

app.post('/api/logs', async (req, res) => {
  const payload = req.body ?? {};
  console.warn('[ClientLog]', payload);

  // Process and save errors
  try {
    let errors = [];

    // Handle both single error and array of errors
    if (Array.isArray(payload)) {
      errors = payload;
    } else if (Array.isArray(payload.errors)) {
      errors = payload.errors;
    } else if (payload.type || payload.message) {
      // Single error object
      errors = [payload];
    }

    // Add source as FRONTEND for all client logs
    errors = errors.map(err => ({
      ...err,
      source: 'FRONTEND'
    }));

    if (errors.length > 0) {
      // Save to database asynchronously
      errors.forEach(async (error) => {
        try {
          await db.errorLog.create({
            data: {
              type: error.type || 'UNKNOWN',
              severity: error.severity || 'MEDIUM',
              message: error.message || 'Unknown error',
              userMessage: error.userMessage,
              source: 'FRONTEND',
              context: error.context || {},
              stack: error.stack,
              userId: error.userId,
              timestamp: error.timestamp ? new Date(error.timestamp) : new Date(),
              webhookSent: false
            }
          });
        } catch (dbError) {
          console.error('Failed to save error to database:', dbError);
        }
      });

      // Send to webhooks asynchronously (don't wait for result)
      webhookService.logErrors(errors).catch(err => {
        console.error('Failed to send errors to webhooks:', err);
      });
    }
  } catch (error) {
    console.error('Error processing webhook logs:', error);
  }

  res.json({ ok: true });
});

// Test webhook configuration
app.post('/api/webhooks/test', async (req, res) => {
  try {
    console.log('Testing webhook configuration...');
    const result = await webhookService.testWebhooks();

    res.json({
      success: true,
      message: 'Webhook test completed',
      result: {
        sent: result.sent,
        failed: result.failed,
        details: result.details
      }
    });
  } catch (error) {
    console.error('Webhook test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test webhooks',
      message: error.message
    });
  }
});

// Global error handlers for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logBackendError(error, {
    type: 'UNCAUGHT_EXCEPTION',
    severity: 'CRITICAL',
    userMessage: 'A critical server error occurred',
    context: {
      nodeVersion: process.version,
      platform: process.platform,
      environment: 'vercel-serverless'
    }
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logBackendError(reason, {
    type: 'UNHANDLED_REJECTION',
    severity: 'HIGH',
    userMessage: 'An unhandled promise rejection occurred',
    context: {
      promise: String(promise),
      nodeVersion: process.version,
      platform: process.platform,
      environment: 'vercel-serverless'
    }
  });
});

// Log webhook system initialization
console.log('Error webhook system initialized');
console.log('Webhooks configured:', webhookService.webhooks?.length || 0);

// Export Express app for Vercel Serverless Functions
// Vercel will handle the HTTP server and routing
export default app;
