import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import { EventEmitter } from 'events';

import prisma from './db.js';
import { generateGrid } from './gridGenerator.js';

const events = new EventEmitter();

const SESSION_TIMEOUT_MS = 3 * 60 * 1000;
const LOBBY_INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

const toISO = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const asArray = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (value == null) return fallback;
  return value;
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const sanitized = {
    id: user.id,
    discordId: user.discordId,
    username: user.username,
    coins: user.coins,
    gems: user.gems,
    cosmetics: asArray(user.cosmetics, ['default']),
    createdAt: toISO(user.createdAt),
    updatedAt: toISO(user.updatedAt),
  };
  if (user.stats) {
    sanitized.stats = {
      userId: user.stats.userId,
      totalMatches: user.stats.totalMatches,
      totalWins: user.stats.totalWins,
      totalScore: user.stats.totalScore,
      totalWords: user.stats.totalWords,
      bestScore: user.stats.bestScore,
      winStreak: user.stats.winStreak,
      bestWinStreak: user.stats.bestWinStreak,
      updatedAt: toISO(user.stats.updatedAt),
    };
  }
  return sanitized;
};

const sanitizeLobby = (lobby) => {
  if (!lobby) return null;
  const players = (lobby.players ?? [])
    .slice()
    .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt))
    .map((player) => ({
      userId: player.userId,
      username: player.username,
      ready: player.ready,
      isHost: player.isHost,
      joinedAt: toISO(player.joinedAt),
    }));

  const matchId = lobby.matches?.[0]?.id ?? null;

  return {
    id: lobby.id,
    code: lobby.code,
    serverId: lobby.serverId,
    hostId: lobby.hostId,
    visibility: lobby.visibility ?? 'public',
    status: lobby.status,
    maxPlayers: lobby.maxPlayers,
    createdAt: toISO(lobby.createdAt),
    updatedAt: toISO(lobby.updatedAt),
    players,
    matchId,
  };
};

const sanitizeSession = (session) => {
  if (!session) return null;
  return {
    id: session.id,
    userId: session.userId,
    playerName: session.playerName,
    serverId: session.serverId,
    channelId: session.channelId,
    status: session.status,
    score: session.score,
    roundNumber: session.roundNumber,
    createdAt: toISO(session.createdAt),
    updatedAt: toISO(session.updatedAt),
    completedAt: toISO(session.completedAt),
  };
};

const sanitizeMatch = (match) => {
  if (!match) return null;
  const players = (match.players ?? [])
    .map((player) => ({
      userId: player.userId,
      username: player.username,
      score: player.score,
      wordsFound: asArray(player.wordsFound, []),
      roundsPlayed: player.roundsPlayed ?? 0,
      rank: typeof player.rank === 'number' ? player.rank : null,
    }))
    .sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank) return -1;
      if (b.rank) return 1;
      return (b.score ?? 0) - (a.score ?? 0);
    });

  return {
    id: match.id,
    lobbyId: match.lobbyId ?? null,
    status: match.status,
    createdAt: toISO(match.createdAt),
    updatedAt: toISO(match.updatedAt),
    completedAt: toISO(match.completedAt),
    currentPlayerId: match.currentPlayerId ?? null,
    roundNumber: match.roundNumber ?? 1,
    lastTurn: match.lastTurn ?? null,
    gridData: match.gridData ?? null,
    wordsFound: asArray(match.wordsFound, []),
    players,
  };
};

const sanitizeServerRecord = (record) => {
  if (!record) return null;
  return {
    serverId: record.serverId,
    userId: record.userId,
    username: record.username,
    score: record.score,
    wordsFound: record.wordsFound,
    gemsCollected: record.gemsCollected,
    achievedAt: toISO(record.achievedAt),
    updatedAt: toISO(record.updatedAt),
  };
};

async function cleanupStaleSessions() {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);
  const staleSessions = await prisma.session.findMany({
    where: {
      status: 'active',
      updatedAt: {
        lt: cutoff,
      },
    },
  });

  await Promise.all(
    staleSessions.map((session) => completeSession(session.id, { score: session.score }))
  );
}

async function cleanupInactiveLobbies(serverId = 'global') {
  const cutoff = new Date(Date.now() - LOBBY_INACTIVITY_TIMEOUT_MS);
  const staleLobbies = await prisma.lobby.findMany({
    where: {
      serverId,
      status: 'waiting',
      createdAt: { lt: cutoff },
      updatedAt: { lt: cutoff },
    },
    include: {
      players: true,
    },
  });

  for (const lobby of staleLobbies) {
    if ((lobby.players?.length ?? 0) > 1) {
      continue;
    }
    try {
      await prisma.lobby.delete({ where: { id: lobby.id } });
      events.emit('lobby:deleted', { lobbyId: lobby.id, serverId: lobby.serverId });
    } catch (error) {
      console.error('Failed to clean up inactive lobby', lobby.id, error);
    }
  }
}

async function getOrCreateUserStats(userId, client = prisma) {
  let stats = await client.userStats.findUnique({ where: { userId } });
  if (!stats) {
    stats = await client.userStats.create({
      data: {
        userId,
      },
    });
  }
  return stats;
}

async function generateLobbyCode(client = prisma) {
  let code;
  let exists = true;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    const lobby = await client.lobby.findUnique({ where: { code } });
    exists = Boolean(lobby);
  } while (exists);
  return code;
}

async function fetchLobbyById(lobbyId, client = prisma) {
  const lobby = await client.lobby.findUnique({
    where: { id: lobbyId },
    include: {
      players: true,
      matches: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  });
  return lobby;
}

async function fetchMatch(matchId, client = prisma) {
  const match = await client.match.findUnique({
    where: { id: matchId },
    include: {
      players: true,
    },
  });
  return sanitizeMatch(match);
}

export function onStateEvent(eventName, listener) {
  events.on(eventName, listener);
  return () => events.off(eventName, listener);
}

export async function upsertUser({ discordId, username }) {
  const trimmedUsername = username?.trim();
  let existing = null;

  if (discordId) {
    existing = await prisma.user.findUnique({
      where: { discordId },
      include: { stats: true },
    });
  }

  if (!existing && trimmedUsername) {
    existing = await prisma.user.findFirst({
      where: {
        discordId: null,
        username: {
          equals: trimmedUsername,
          mode: 'insensitive',
        },
      },
      include: { stats: true },
    });
  }

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        username: trimmedUsername || existing.username,
      },
      include: { stats: true },
    });
    const sanitized = sanitizeUser(updated);
    events.emit('users:updated', sanitized);
    return sanitized;
  }

  const id = discordId ?? randomUUID();
  const created = await prisma.user.create({
    data: {
      id,
      discordId: discordId ?? null,
      username: trimmedUsername || `Player-${id.slice(0, 6)}`,
      cosmetics: ['default'],
      stats: {
        create: {},
      },
    },
    include: { stats: true },
  });

  const sanitized = sanitizeUser(created);
  events.emit('users:updated', sanitized);
  return sanitized;
}

export function createGuestUser() {
  return upsertUser({
    discordId: null,
    username: `Guest-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    authType: 'guest',
  });
}

export async function getUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { stats: true } });
  return sanitizeUser(user);
}

export async function getPlayerStats(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { stats: true } });
  if (!user) return null;
  const stats = await getOrCreateUserStats(userId);
  return {
    userId: user.id,
    username: user.username,
    coins: user.coins,
    gems: user.gems,
    totalMatches: stats.totalMatches,
    totalWins: stats.totalWins,
    totalScore: stats.totalScore,
    totalWords: stats.totalWords,
    bestScore: stats.bestScore,
    winStreak: stats.winStreak,
    bestWinStreak: stats.bestWinStreak,
    updatedAt: toISO(stats.updatedAt),
  };
}

export async function getLeaderboard(limit = 10) {
  const users = await prisma.user.findMany({
    take: limit,
    orderBy: {
      stats: {
        totalScore: 'desc',
      },
    },
    include: { stats: true },
  });

  return users.map((user) => ({
    userId: user.id,
    username: user.username,
    coins: user.coins,
    gems: user.gems,
    totalMatches: user.stats?.totalMatches ?? 0,
    totalWins: user.stats?.totalWins ?? 0,
    totalScore: user.stats?.totalScore ?? 0,
    totalWords: user.stats?.totalWords ?? 0,
    bestScore: user.stats?.bestScore ?? 0,
    winStreak: user.stats?.winStreak ?? 0,
    bestWinStreak: user.stats?.bestWinStreak ?? 0,
    updatedAt: toISO(user.stats?.updatedAt),
  }));
}

export async function getMatchHistory(userId, limit = 20) {
  const matches = await prisma.match.findMany({
    where: {
      players: {
        some: { userId },
      },
    },
    orderBy: [{ completedAt: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
    include: {
      players: true,
    },
  });

  return matches.map(sanitizeMatch);
}

export async function getActiveSessions(serverId) {
  await cleanupStaleSessions();
  const sessions = await prisma.session.findMany({
    where: {
      serverId,
      status: 'active',
    },
    orderBy: { updatedAt: 'desc' },
  });
  return sessions.map(sanitizeSession);
}

async function createLobbyRecord(client, { hostId, hostUsername, serverId = 'global', maxPlayers = 8 }) {
  const now = new Date();
  const id = randomUUID();
  const code = await generateLobbyCode(client);

  const lobby = await client.lobby.create({
    data: {
      id,
      code,
      serverId,
      hostId,
      status: 'waiting',
      maxPlayers,
      players: {
        create: {
          userId: hostId,
          username: hostUsername,
          ready: true,
          isHost: true,
          joinedAt: now,
        },
      },
    },
    include: {
      players: true,
      matches: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  });

  return lobby;
}

export async function createLobby({ hostId, hostUsername, serverId = 'global', maxPlayers = 8 }) {
  const lobbyRecord = await createLobbyRecord(prisma, {
    hostId,
    hostUsername,
    serverId,
    maxPlayers,
  });
  const lobby = sanitizeLobby(lobbyRecord);
  events.emit('lobby:updated', lobby);
  return lobby;
}

export async function getLobbyById(lobbyId) {
  const lobby = await fetchLobbyById(lobbyId);
  return sanitizeLobby(lobby);
}

export async function getLobbyByCode(code) {
  const lobby = await prisma.lobby.findUnique({
    where: { code },
    include: {
      players: true,
      matches: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  });
  return sanitizeLobby(lobby);
}

export async function listLobbies(serverId = 'global') {
  await cleanupInactiveLobbies(serverId);
  const lobbies = await prisma.lobby.findMany({
    where: {
      serverId,
      status: 'waiting',
    },
    include: {
      players: true,
      matches: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return lobbies.map(sanitizeLobby).filter(Boolean);
}

export async function joinLobbyByCode({ code, userId, username }) {
  const lobby = await prisma.lobby.findUnique({ where: { code } });
  if (!lobby) {
    throw new Error('Lobby not found');
  }
  return joinLobby({ lobbyId: lobby.id, userId, username });
}

export async function joinLobby({ lobbyId, userId, username }) {
  const lobbyRecord = await prisma.$transaction(async (tx) => {
    const lobby = await fetchLobbyById(lobbyId, tx);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    const alreadyJoined = lobby.players.some((player) => player.userId === userId);
    if (alreadyJoined) {
      return lobby;
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      throw new Error('Lobby is full');
    }

    await tx.lobbyPlayer.create({
      data: {
        lobbyId,
        userId,
        username,
        ready: false,
        isHost: false,
      },
    });

    await tx.lobby.update({
      where: { id: lobbyId },
      data: { updatedAt: new Date() },
    });

    const updated = await fetchLobbyById(lobbyId, tx);
    return updated;
  });

  const lobby = sanitizeLobby(lobbyRecord);
  events.emit('lobby:updated', lobby);
  return lobby;
}

export async function setPlayerReady({ lobbyId, userId, ready }) {
  const lobbyRecord = await prisma.$transaction(async (tx) => {
    const lobby = await fetchLobbyById(lobbyId, tx);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    const player = lobby.players.find((p) => p.userId === userId);
    if (!player) {
      throw new Error('Player not in lobby');
    }

    await tx.lobbyPlayer.update({
      where: {
        lobbyId_userId: {
          lobbyId,
          userId,
        },
      },
      data: { ready },
    });

    await tx.lobby.update({
      where: { id: lobbyId },
      data: { updatedAt: new Date() },
    });

    return fetchLobbyById(lobbyId, tx);
  });

  const lobby = sanitizeLobby(lobbyRecord);
  events.emit('lobby:updated', lobby);
  return lobby;
}

export async function leaveLobby({ lobbyId, userId }) {
  const { lobbyRecord, deleted, matchRecord, serverId, endedSessions } =
    await prisma.$transaction(async (tx) => {
      const lobby = await fetchLobbyById(lobbyId, tx);
      if (!lobby) {
        throw new Error('Lobby not found');
      }

      const player = lobby.players.find((p) => p.userId === userId);
      if (!player) {
        return {
          lobbyRecord: lobby,
          deleted: false,
          matchRecord: null,
          serverId: lobby.serverId,
          endedSessions: [],
        };
      }

      await tx.lobbyPlayer.delete({
        where: {
          lobbyId_userId: {
            lobbyId,
            userId,
          },
        },
      });

      const now = new Date();

      const sessionsToComplete = await tx.session.findMany({
        where: {
          userId,
          status: 'active',
        },
      });

      const endedSessions = await Promise.all(
        sessionsToComplete.map((session) =>
          tx.session.update({
            where: { id: session.id },
            data: {
              status: 'completed',
              completedAt: now,
              updatedAt: now,
            },
          })
        )
      );

      const remainingPlayers = await tx.lobbyPlayer.findMany({
        where: { lobbyId },
        orderBy: { joinedAt: 'asc' },
      });

      if (remainingPlayers.length === 0) {
        await tx.match.deleteMany({ where: { lobbyId } });
        await tx.lobby.delete({ where: { id: lobbyId } });
        return {
          lobbyRecord: null,
          deleted: true,
          matchRecord: null,
          serverId: lobby.serverId,
          endedSessions,
        };
      }

      if (userId === lobby.hostId) {
        const nextHost = remainingPlayers[0];
        await tx.lobby.update({
          where: { id: lobbyId },
          data: {
            hostId: nextHost.userId,
            updatedAt: now,
          },
        });
        await tx.lobbyPlayer.update({
          where: {
            lobbyId_userId: {
              lobbyId,
              userId: nextHost.userId,
            },
          },
          data: { isHost: true },
        });
      } else {
        await tx.lobby.update({
          where: { id: lobbyId },
          data: { updatedAt: now },
        });
      }

      let matchRecord = null;
      const activeMatch = await tx.match.findFirst({
        where: {
          lobbyId,
          status: 'in_progress',
        },
        include: { players: true },
      });

      if (activeMatch) {
        await tx.matchPlayer.deleteMany({
          where: {
            matchId: activeMatch.id,
            userId,
          },
        });

        const remainingIds = remainingPlayers.map((p) => p.userId);
        const originalOrder = lobby.players.map((p) => p.userId);
        let nextPlayerId = activeMatch.currentPlayerId;

        if (!nextPlayerId || nextPlayerId === userId || !remainingIds.includes(nextPlayerId)) {
          const removalIndex = originalOrder.indexOf(userId);
          const candidateOrder =
            removalIndex === -1
              ? originalOrder
              : [...originalOrder.slice(removalIndex + 1), ...originalOrder.slice(0, removalIndex)];
          nextPlayerId = candidateOrder.find((id) => remainingIds.includes(id)) ?? remainingIds[0] ?? null;
        }

        const matchUpdate = {
          currentPlayerId: nextPlayerId ?? null,
          updatedAt: now,
        };

        if (activeMatch.lastTurn && activeMatch.lastTurn.playerId === userId) {
          matchUpdate.lastTurn = null;
        }

        await tx.match.update({
          where: { id: activeMatch.id },
          data: matchUpdate,
        });

        matchRecord = await fetchMatch(activeMatch.id, tx);
      }

      const updated = await fetchLobbyById(lobbyId, tx);
      return {
        lobbyRecord: updated,
        deleted: false,
        matchRecord,
        serverId: lobby.serverId,
        endedSessions,
      };
    });

  endedSessions.forEach((sessionRecord) => {
    const session = sanitizeSession(sessionRecord);
    if (session) {
      events.emit('session:updated', session);
    }
  });

  if (deleted) {
    events.emit('lobby:deleted', { lobbyId, serverId });
    return null;
  }

  const lobby = sanitizeLobby(lobbyRecord);
  events.emit('lobby:updated', lobby);

  if (matchRecord) {
    events.emit('match:updated', matchRecord);
  }

  return lobby;
}

export async function removeLobbyPlayer({ lobbyId, targetUserId, requestedBy }) {
  const {
    lobbyRecord,
    deleted,
    matchRecord,
    serverId,
    endedSessions,
  } = await prisma.$transaction(async (tx) => {
    const lobby = await fetchLobbyById(lobbyId, tx);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.hostId !== requestedBy) {
      throw new Error('Only the host can remove players');
    }

    if (targetUserId === requestedBy) {
      throw new Error('Host cannot remove themselves');
    }

    const player = lobby.players.find((p) => p.userId === targetUserId);
    if (!player) {
      return {
        lobbyRecord: lobby,
        deleted: false,
        matchRecord: null,
        serverId: lobby.serverId,
        endedSessions: [],
      };
    }

    await tx.lobbyPlayer.delete({
      where: {
        lobbyId_userId: {
          lobbyId,
          userId: targetUserId,
        },
      },
    });

    const now = new Date();

    const sessionsToComplete = await tx.session.findMany({
      where: {
        userId: targetUserId,
        status: 'active',
      },
    });

    const endedSessions = await Promise.all(
      sessionsToComplete.map((session) =>
        tx.session.update({
          where: { id: session.id },
          data: {
            status: 'completed',
            completedAt: now,
            updatedAt: now,
          },
        })
      )
    );

    const remainingPlayers = await tx.lobbyPlayer.findMany({
      where: { lobbyId },
      orderBy: { joinedAt: 'asc' },
    });

    if (remainingPlayers.length === 0) {
      await tx.match.deleteMany({ where: { lobbyId } });
      await tx.lobby.delete({ where: { id: lobbyId } });
      return {
        lobbyRecord: null,
        deleted: true,
        matchRecord: null,
        serverId: lobby.serverId,
        endedSessions,
      };
    }

    let matchRecord = null;
    const activeMatch = await tx.match.findFirst({
      where: {
        lobbyId,
        status: 'in_progress',
      },
      include: { players: true },
    });

    if (activeMatch) {
      await tx.matchPlayer.deleteMany({
        where: {
          matchId: activeMatch.id,
          userId: targetUserId,
        },
      });

      const remainingIds = remainingPlayers.map((p) => p.userId);
      const originalOrder = lobby.players.map((p) => p.userId);
      let nextPlayerId = activeMatch.currentPlayerId;

      if (!nextPlayerId || nextPlayerId === targetUserId || !remainingIds.includes(nextPlayerId)) {
        const removalIndex = originalOrder.indexOf(targetUserId);
        const candidateOrder =
          removalIndex === -1
            ? originalOrder
            : [...originalOrder.slice(removalIndex + 1), ...originalOrder.slice(0, removalIndex)];
        nextPlayerId = candidateOrder.find((id) => remainingIds.includes(id)) ?? remainingIds[0] ?? null;
      }

      const matchUpdate = {
        currentPlayerId: nextPlayerId ?? null,
        updatedAt: now,
      };

      if (activeMatch.lastTurn && activeMatch.lastTurn.playerId === targetUserId) {
        matchUpdate.lastTurn = null;
      }

      await tx.match.update({
        where: { id: activeMatch.id },
        data: matchUpdate,
      });

      matchRecord = await fetchMatch(activeMatch.id, tx);
    }

    await tx.lobby.update({
      where: { id: lobbyId },
      data: { updatedAt: now },
    });

    const updatedLobby = await fetchLobbyById(lobbyId, tx);
    return {
      lobbyRecord: updatedLobby,
      deleted: false,
      matchRecord,
      serverId: lobby.serverId,
      endedSessions,
    };
  });

  endedSessions.forEach((sessionRecord) => {
    const session = sanitizeSession(sessionRecord);
    if (session) {
      events.emit('session:updated', session);
    }
  });

  if (deleted) {
    events.emit('lobby:deleted', { lobbyId, serverId });
    return { lobby: null, match: matchRecord };
  }

  const lobby = sanitizeLobby(lobbyRecord);
  events.emit('lobby:updated', lobby);

  if (matchRecord) {
    events.emit('match:updated', matchRecord);
  }

  return { lobby, match: matchRecord };
}

export async function startLobby({ lobbyId }) {
  const { lobbyRecord, matchId } = await prisma.$transaction(async (tx) => {
    const lobby = await fetchLobbyById(lobbyId, tx);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    const allReady = lobby.players.every((player) => player.ready);
    if (!allReady) {
      throw new Error('All players must be ready');
    }

    const now = new Date();
    const startingPlayerId = lobby.players.find((player) => player.userId === lobby.hostId)?.userId
      ?? lobby.players[0]?.userId
      ?? null;

    const match = await tx.match.create({
      data: {
        id: randomUUID(),
        lobbyId,
        status: 'in_progress',
        gridData: generateGrid(),
        wordsFound: [],
        currentPlayerId: startingPlayerId,
        roundNumber: 1,
        players: {
          create: lobby.players.map((player) => ({
            userId: player.userId,
            username: player.username,
            score: 0,
            wordsFound: [],
            roundsPlayed: 0,
            rank: null,
          })),
        },
      },
    });

    await tx.lobby.update({
      where: { id: lobbyId },
      data: {
        status: 'playing',
        updatedAt: now,
      },
    });

    const updatedLobby = await fetchLobbyById(lobbyId, tx);

    return { lobbyRecord: updatedLobby, matchId: match.id };
  });

  const lobby = sanitizeLobby(lobbyRecord);
  const match = await fetchMatch(matchId);

  events.emit('match:started', match);
  events.emit('lobby:updated', lobby);

  return { lobby, match };
}

export async function updateMatchProgress({
  matchId,
  players,
  currentPlayerId,
  gridData,
  wordsFound,
  roundNumber,
  lastTurn,
  gameOver,
}) {
  const sanitizedMatch = await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new Error('Match not found');
    }

    const now = new Date();
    const data = {
      updatedAt: now,
    };

    if (typeof currentPlayerId !== 'undefined') {
      data.currentPlayerId = currentPlayerId ?? null;
    }

    if (typeof roundNumber === 'number') {
      data.roundNumber = roundNumber;
    }

    if (typeof lastTurn !== 'undefined') {
      data.lastTurn =
        lastTurn === null
          ? null
          : {
              ...lastTurn,
              completedAt: lastTurn.completedAt ?? now.toISOString(),
            };
    }

    if (typeof gridData !== 'undefined') {
      data.gridData = gridData;
    }

    if (Array.isArray(wordsFound)) {
      data.wordsFound = wordsFound;
    }

    if (Array.isArray(players)) {
      await Promise.all(
        players.map((player) =>
          tx.matchPlayer.upsert({
            where: {
              matchId_userId: {
                matchId,
                userId: player.userId,
              },
            },
            create: {
              matchId,
              userId: player.userId,
              username: player.username,
              score: player.score ?? 0,
              wordsFound: player.wordsFound ?? [],
              roundsPlayed: player.roundsPlayed ?? 0,
              rank: player.rank ?? null,
            },
            update: {
              username: player.username,
              score: player.score ?? 0,
              wordsFound: player.wordsFound ?? [],
              roundsPlayed: player.roundsPlayed ?? 0,
              rank: player.rank ?? null,
            },
          })
        )
      );

      await tx.session.updateMany({
        where: {
          userId: {
            in: players.map((player) => player.userId),
          },
          status: 'active',
        },
        data: { updatedAt: now },
      });
    }

    if (gameOver) {
      data.status = 'completed';
      data.completedAt = match.completedAt ?? now;
      data.currentPlayerId = null;
    }

    await tx.match.update({
      where: { id: matchId },
      data,
    });

    const updatedMatch = await fetchMatch(matchId, tx);
    return updatedMatch;
  });

  events.emit('match:updated', sanitizedMatch);
  return sanitizedMatch;
}

export async function recordMatchResults({ matchId, players, gridData, wordsFound, lobbyId }) {
  if (!Array.isArray(players)) {
    throw new Error('players array required');
  }

  let updatedLobbyRecord = null;

  const sanitizedMatch = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const matchExists = await tx.match.findUnique({ where: { id: matchId } });

    if (matchExists) {
      await tx.match.update({
        where: { id: matchId },
        data: {
          lobbyId: lobbyId ?? matchExists.lobbyId ?? null,
          status: 'completed',
          currentPlayerId: null,
          gridData: gridData ?? null,
          wordsFound: wordsFound ?? [],
          lastTurn: null,
          completedAt: now,
          updatedAt: now,
        },
      });
      await tx.matchPlayer.deleteMany({ where: { matchId } });
    } else {
      await tx.match.create({
        data: {
          id: matchId,
          lobbyId: lobbyId ?? null,
          status: 'completed',
          currentPlayerId: null,
          roundNumber: 1,
          gridData: gridData ?? null,
          wordsFound: wordsFound ?? [],
          lastTurn: null,
          completedAt: now,
        },
      });
    }

    await Promise.all(
      sortedPlayers.map((player, index) =>
        tx.matchPlayer.create({
          data: {
            matchId,
            userId: player.id,
            username: player.username,
            score: player.score ?? 0,
            wordsFound: player.wordsFound ?? [],
            roundsPlayed: player.roundsPlayed ?? 0,
            rank: index + 1,
          },
        })
      )
    );

    const totalWordsDelta = Array.isArray(wordsFound) ? wordsFound.length : 0;

    await Promise.all(
      sortedPlayers.map(async (player, index) => {
        const stats = await getOrCreateUserStats(player.id, tx);
        const isWinner = index === 0;
        const nextWinStreak = isWinner ? stats.winStreak + 1 : 0;

        await tx.userStats.update({
          where: { userId: player.id },
          data: {
            totalMatches: stats.totalMatches + 1,
            totalWins: stats.totalWins + (isWinner ? 1 : 0),
            totalScore: stats.totalScore + (player.score ?? 0),
            totalWords: stats.totalWords + totalWordsDelta,
            bestScore: Math.max(stats.bestScore, player.score ?? 0),
            winStreak: nextWinStreak,
            bestWinStreak: Math.max(stats.bestWinStreak, nextWinStreak),
            updatedAt: now,
          },
        });
      })
    );

    if (lobbyId) {
      const lobby = await tx.lobby.findUnique({ where: { id: lobbyId } });
      if (lobby) {
        await tx.lobby.update({
          where: { id: lobbyId },
          data: {
            status: 'finished',
            updatedAt: now,
          },
        });
        updatedLobbyRecord = await fetchLobbyById(lobbyId, tx);
      }
    }

    const updatedMatch = await fetchMatch(matchId, tx);
    return updatedMatch;
  });

  if (updatedLobbyRecord) {
    const lobby = sanitizeLobby(updatedLobbyRecord);
    events.emit('lobby:updated', lobby);
  }

  events.emit('match:completed', sanitizedMatch);
  events.emit('stats:updated');
  return sanitizedMatch;
}

export async function createSession({ userId, playerName, serverId, channelId }) {
  const sessionRecord = await prisma.session.create({
    data: {
      id: randomUUID(),
      userId,
      playerName,
      serverId,
      channelId: channelId ?? null,
      status: 'active',
      score: 0,
      roundNumber: 1,
    },
  });

  const session = sanitizeSession(sessionRecord);
  events.emit('session:updated', session);
  return session;
}

export async function completeSession(sessionId, { score }) {
  const now = new Date();
  const sessionRecord = await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      score: typeof score === 'number' ? score : undefined,
      completedAt: now,
      updatedAt: now,
    },
  });

  const session = sanitizeSession(sessionRecord);
  events.emit('session:updated', session);
  return session;
}

export async function joinMatchmaking({ userId, username, serverId }) {
  let matchedLobby = null;

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.matchmakingEntry.upsert({
      where: { userId },
      create: {
        userId,
        username,
        serverId,
        joinedAt: now,
      },
      update: {
        username,
        serverId,
        joinedAt: now,
      },
    });

    const queue = await tx.matchmakingEntry.findMany({
      where: { serverId },
      orderBy: { joinedAt: 'asc' },
    });

    if (queue.length >= 2) {
      const [playerA, playerB] = queue;
      await tx.matchmakingEntry.deleteMany({
        where: {
          userId: {
            in: [playerA.userId, playerB.userId],
          },
        },
      });

      const lobbyRecord = await createLobbyRecord(tx, {
        hostId: playerA.userId,
        hostUsername: playerA.username,
        serverId,
        maxPlayers: 8,
      });

      await tx.lobbyPlayer.create({
        data: {
          lobbyId: lobbyRecord.id,
          userId: playerB.userId,
          username: playerB.username,
          ready: false,
          isHost: false,
        },
      });

      await tx.lobby.update({
        where: { id: lobbyRecord.id },
        data: { updatedAt: new Date() },
      });

      matchedLobby = await fetchLobbyById(lobbyRecord.id, tx);
    }
  });

  const snapshot = await getMatchmakingSnapshot();
  events.emit('matchmaking:updated', snapshot);

  if (matchedLobby) {
    const lobby = sanitizeLobby(matchedLobby);
    events.emit('lobby:updated', lobby);
    return { status: 'matched', lobby };
  }

  const queueForServer = snapshot.entries.filter((entry) => entry.serverId === serverId);
  const position =
    queueForServer.findIndex((entry) => entry.userId === userId) + 1 || queueForServer.length;

  return {
    status: 'queued',
    queuePosition: position,
    playersInQueue: queueForServer.length,
  };
}

export async function leaveMatchmaking({ userId }) {
  await prisma.matchmakingEntry.deleteMany({ where: { userId } });
  const snapshot = await getMatchmakingSnapshot();
  events.emit('matchmaking:updated', snapshot);
  return { success: true };
}

export async function updateServerRecord({
  serverId,
  userId,
  username,
  score,
  wordsFound,
  gemsCollected,
}) {
  const existing = await prisma.serverRecord.findUnique({ where: { serverId } });
  const now = new Date();

  if (!existing || existing.score < score) {
    const record = await prisma.serverRecord.upsert({
      where: { serverId },
      update: {
        userId,
        username,
        score,
        wordsFound: wordsFound ?? 0,
        gemsCollected: gemsCollected ?? 0,
        achievedAt: now,
        updatedAt: now,
      },
      create: {
        serverId,
        userId,
        username,
        score,
        wordsFound: wordsFound ?? 0,
        gemsCollected: gemsCollected ?? 0,
        achievedAt: now,
      },
    });

    const sanitized = sanitizeServerRecord(record);
    events.emit('server-record:updated', sanitized);
    return sanitized;
  }

  return sanitizeServerRecord(existing);
}

export async function getServerRecord(serverId) {
  const record = await prisma.serverRecord.findUnique({ where: { serverId } });
  return sanitizeServerRecord(record);
}

export async function getMatchmakingSnapshot() {
  const entries = await prisma.matchmakingEntry.findMany({
    orderBy: { joinedAt: 'asc' },
  });

  return {
    queueSize: entries.length,
    entries: entries.map((entry) => ({
      userId: entry.userId,
      username: entry.username,
      serverId: entry.serverId,
      joinedAt: entry.joinedAt instanceof Date ? entry.joinedAt.getTime() : Date.now(),
    })),
  };
}
