import type { Session } from "@supabase/supabase-js";

export interface LocalSession {
  id: string;
  created_at: string;
  provider: "demo";
  user: {
    id: string;
    username: string;
    email?: string;
    avatar_url?: string;
  };
}

export type AuthSession = Session | LocalSession;

export interface PlayerStats {
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
  totalWordsFound: number;
  recentWords: string[];
  lastUpdated?: string;
}
