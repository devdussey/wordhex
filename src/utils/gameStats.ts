import { api } from '../services/api';

interface Player {
  id: string;
  username: string;
  score: number;
  wordsFound?: string[];
  roundsPlayed?: number;
}

interface SaveMatchParams {
  matchId?: string;
  players: Player[];
  gridData: unknown;
  wordsFound: string[];
  lobbyId?: string;
}

export async function saveMatchResults({ matchId, players, gridData, wordsFound, lobbyId }: SaveMatchParams) {
  try {
    const payload = {
      matchId,
      lobbyId,
      players: players.map((player) => ({
        id: player.id,
        username: player.username,
        score: player.score,
        wordsFound: player.wordsFound ?? [],
        roundsPlayed: player.roundsPlayed ?? 0,
      })),
      gridData,
      wordsFound,
    };
    const response = await api.game.recordMatch(payload);
    return { success: true, matchId: response?.match?.id ?? matchId ?? null };
  } catch (error) {
    console.error('Failed to save match results:', error);
    return { success: false, error };
  }
}
