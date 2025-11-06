-- Create tables for persistent game state

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "discordId" TEXT UNIQUE,
  "username" TEXT NOT NULL,
  "coins" INTEGER NOT NULL DEFAULT 500,
  "gems" INTEGER NOT NULL DEFAULT 25,
  "cosmetics" JSONB NOT NULL DEFAULT '["default"]'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "UserStats" (
  "userId" TEXT PRIMARY KEY,
  "totalMatches" INTEGER NOT NULL DEFAULT 0,
  "totalWins" INTEGER NOT NULL DEFAULT 0,
  "totalScore" INTEGER NOT NULL DEFAULT 0,
  "totalWords" INTEGER NOT NULL DEFAULT 0,
  "bestScore" INTEGER NOT NULL DEFAULT 0,
  "winStreak" INTEGER NOT NULL DEFAULT 0,
  "bestWinStreak" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Lobby" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "serverId" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "maxPlayers" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lobby_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "LobbyPlayer" (
  "id" TEXT PRIMARY KEY,
  "lobbyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "ready" BOOLEAN NOT NULL DEFAULT FALSE,
  "isHost" BOOLEAN NOT NULL DEFAULT FALSE,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LobbyPlayer_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LobbyPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LobbyPlayer_lobbyId_userId_key" UNIQUE ("lobbyId", "userId")
);

CREATE TABLE "Match" (
  "id" TEXT PRIMARY KEY,
  "lobbyId" TEXT,
  "status" TEXT NOT NULL,
  "currentPlayerId" TEXT,
  "roundNumber" INTEGER NOT NULL DEFAULT 1,
  "lastTurn" JSONB,
  "gridData" JSONB,
  "wordsFound" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Match_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "MatchPlayer" (
  "id" TEXT PRIMARY KEY,
  "matchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "wordsFound" JSONB NOT NULL,
  "roundsPlayed" INTEGER NOT NULL DEFAULT 0,
  "rank" INTEGER,
  CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MatchPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MatchPlayer_matchId_userId_key" UNIQUE ("matchId", "userId")
);

CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "playerName" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "channelId" TEXT,
  "status" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "roundNumber" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ServerRecord" (
  "serverId" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "wordsFound" INTEGER NOT NULL DEFAULT 0,
  "gemsCollected" INTEGER NOT NULL DEFAULT 0,
  "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServerRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "MatchmakingEntry" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "username" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchmakingEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Match_completedAt_idx" ON "Match" ("completedAt" DESC);
CREATE INDEX "Match_updatedAt_idx" ON "Match" ("updatedAt" DESC);
CREATE INDEX "Session_serverId_status_idx" ON "Session" ("serverId", "status");
CREATE INDEX "Lobby_serverId_idx" ON "Lobby" ("serverId");
CREATE INDEX "MatchmakingEntry_serverId_joinedAt_idx" ON "MatchmakingEntry" ("serverId", "joinedAt");

