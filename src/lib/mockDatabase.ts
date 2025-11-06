export interface MockUser {
  id: string;
  username: string;
  discord_id?: string;
  password_hash?: string;
  coins: number;
  gems: number;
  cosmetics: string[];
  created_at: string;
}

export interface MockPlayerStats {
  user_id: string;
  total_matches: number;
  total_wins: number;
  total_score: number;
  total_words: number;
  best_score: number;
  win_streak: number;
  best_win_streak: number;
}

export interface MockGameSession {
  id: string;
  server_id: string;
  player_name: string;
  player_avatar_url?: string;
  score: number;
  round_number: number;
  game_status: 'active' | 'finished';
  created_at: string;
}

export interface MockLobby {
  id: string;
  lobby_code: string;
  status: 'waiting' | 'playing' | 'finished';
  host_id: string;
  created_at: string;
}

export interface MockLobbyPlayer {
  id: string;
  lobby_id: string;
  user_id: string;
  player_name: string;
  is_ready: boolean;
  joined_at: string;
}

export interface MockMatch {
  id: string;
  created_at: string;
  winner_id?: string;
  duration_seconds: number;
}

export interface MockMatchPlayer {
  id: string;
  match_id: string;
  user_id: string;
  score: number;
  words_found: number;
  created_at: string;
}

export interface MockMatchmakingEntry {
  id: string;
  user_id: string;
  server_id: string;
  searching_since: string;
}

interface MockDatabase {
  users: MockUser[];
  player_stats: MockPlayerStats[];
  game_sessions: MockGameSession[];
  lobbies: MockLobby[];
  lobby_players: MockLobbyPlayer[];
  matches: MockMatch[];
  match_players: MockMatchPlayer[];
  matchmaking_queue: MockMatchmakingEntry[];
  error_logs: Array<Record<string, unknown>>;
}

export const mockDatabase: MockDatabase = {
  users: [],
  player_stats: [],
  game_sessions: [],
  lobbies: [],
  lobby_players: [],
  matches: [],
  match_players: [],
  matchmaking_queue: [],
  error_logs: [],
};

export type MockTable = keyof MockDatabase;

export function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
