export interface PlayerStatsSummary {
  totalMatches: number;
  totalWins: number;
  totalScore: number;
  totalWords: number;
  bestScore: number;
  winStreak: number;
  bestWinStreak: number;
  updatedAt: string;
}

export interface ApiUser {
  id: string;
  discordId: string | null;
  email: string | null;
  username: string;
  authType: 'discord' | 'guest' | 'email';
  coins: number;
  gems: number;
  cosmetics: string[];
  createdAt: string;
  updatedAt: string;
  stats?: PlayerStatsSummary;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}

export interface LobbyPlayer {
  userId: string;
  username: string;
  ready: boolean;
  isHost: boolean;
  joinedAt: string;
}

export type LobbyStatus = 'waiting' | 'playing' | 'finished';
export type LobbyVisibility = 'public' | 'private';

export interface LobbySummary {
  id: string;
  code: string;
  serverId: string;
  hostId: string;
  visibility: LobbyVisibility;
  status: LobbyStatus;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  maxPlayers: number;
  players: LobbyPlayer[];
  matchId: string | null;
}

export interface MatchPlayerSummary {
  userId: string;
  username: string;
  score: number;
  wordsFound: string[];
  roundsPlayed?: number;
  rank: number | null;
}

export type MatchStatus = 'in_progress' | 'completed';

export interface MatchTurnSummary {
  playerId: string;
  username: string;
  word?: string;
  scoreDelta: number;
  gems?: number;
  completedAt: string;
}

export interface MatchSummary {
  id: string;
  lobbyId: string | null;
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  players: MatchPlayerSummary[];
  currentPlayerId?: string | null;
  roundNumber?: number;
  lastTurn?: MatchTurnSummary | null;
  gridData?: unknown;
  wordsFound?: string[];
}

export interface LobbyResponse {
  lobby: LobbySummary;
}

export interface LobbyMaybeResponse {
  lobby: LobbySummary | null;
}

export interface LobbyRemovePlayerResponse {
  lobby: LobbySummary | null;
  match?: MatchSummary | null;
}

export interface LobbyListResponse {
  lobbies: LobbySummary[];
}

export interface GameSession {
  id: string;
  userId: string;
  playerName: string;
  serverId: string;
  channelId: string | null;
  status: 'active' | 'completed';
  score: number;
  roundNumber: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface SessionResponse {
  session: GameSession;
}

export interface MatchRecordResponse {
  match: MatchSummary;
}

export interface LobbyStartResponse {
  lobby: LobbySummary;
  match: MatchSummary;
}

export interface MatchmakingQueued {
  status: 'queued';
  queuePosition: number;
  playersInQueue: number;
}

export interface MatchmakingMatched {
  status: 'matched';
  lobby: LobbySummary;
}

export type MatchmakingJoinResponse = MatchmakingQueued | MatchmakingMatched;

export interface MatchmakingSnapshotEntry {
  userId: string;
  username: string;
  serverId: string;
  joinedAt: number;
}

export interface MatchmakingSnapshot {
  queueSize: number;
  entries: MatchmakingSnapshotEntry[];
}

export interface LeaderboardEntry extends PlayerStatsSummary {
  userId: string;
  username: string;
  coins: number;
  gems: number;
}

export interface PlayerStatsResponse extends PlayerStatsSummary {
  userId: string;
  username: string;
  coins: number;
  gems: number;
}

export type MatchHistoryEntry = MatchSummary;

export interface ServerRecord {
  serverId: string;
  userId: string;
  username: string;
  score: number;
  wordsFound?: number;
  gemsCollected?: number;
  achievedAt: string;
  updatedAt: string;
}

export interface SuccessResponse {
  success: boolean;
}

export interface LogsResponse {
  ok: boolean;
}


export interface PlayerAction {
  type: 'letter_select' | 'word_attempt' | 'selection_clear';
  selectedLetters?: string;
  word?: string;
  timestamp: string;
}

export interface RealtimeMessage {
  channel: string;
  type?: string;
  playerId?: string;
  username?: string;
  action?: PlayerAction;
  [key: string]: unknown;
}
