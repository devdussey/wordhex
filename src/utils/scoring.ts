import { getWordSet } from '../lib/wordService';
import { SelectedTile, WordResult } from '../types/game';

// SpellCast official letter values
const LETTER_SCORES: Record<string, number> = {
  A: 1,
  E: 1,
  I: 1,
  O: 1,
  N: 2,
  R: 2,
  S: 2,
  T: 2,
  D: 3,
  G: 3,
  L: 3,
  B: 4,
  H: 4,
  P: 4,
  M: 4,
  U: 4,
  Y: 4,
  C: 5,
  F: 5,
  V: 5,
  W: 5,
  K: 6,
  J: 7,
  X: 7,
  Q: 8,
  Z: 8,
};

const FALLBACK_WORDS = new Set<string>([
  'word',
  'words',
  'game',
  'games',
  'hex',
  'spell',
  'cast',
  'score',
  'scores',
  'tile',
  'tiles',
  'letters',
  'letter',
]);

async function loadWordSet(): Promise<Set<string>> {
  try {
    return await getWordSet();
  } catch (error) {
    console.error('Falling back to minimal word list:', error);
    return FALLBACK_WORDS;
  }
}

export async function isValidWord(word: string): Promise<boolean> {
  const normalized = word.trim().toLowerCase();
  if (normalized.length < 3) {
    return false;
  }
  const validWords = await loadWordSet();
  return validWords.has(normalized);
}

export async function calculateScore(tiles: SelectedTile[]): Promise<WordResult | null> {
  const word = tiles.map((tile) => tile.letter).join('');

  if (!(await isValidWord(word))) {
    return null;
  }

  let baseScore = 0;
  let wordMultiplier = 1;
  const multipliers: string[] = [];

  for (const tile of tiles) {
    const letterKey = tile.letter.toUpperCase();
    let letterScore = LETTER_SCORES[letterKey] ?? 1;

    if (tile.multiplier === 'DL') {
      letterScore *= 2;
      multipliers.push('2x Letter');
    } else if (tile.multiplier === 'TL') {
      letterScore *= 3;
      multipliers.push('3x Letter');
    } else if (tile.multiplier === 'DW') {
      wordMultiplier *= 2;
      multipliers.push('2x Word');
    } else if (tile.multiplier === 'TW') {
      wordMultiplier *= 3;
      multipliers.push('3x Word');
    }

    baseScore += letterScore;
  }

  const lengthBonus = word.length >= 6 ? 10 : 0;
  const finalScore = baseScore * wordMultiplier + lengthBonus;

  return {
    word,
    score: finalScore,
    baseScore,
    multipliers,
  };
}
