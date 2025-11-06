import { SelectedTile, WordResult } from '../types/game';

const LETTER_SCORES: Record<string, number> = {
  'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'S': 1, 'T': 1, 'R': 1,
  'D': 2, 'G': 2,
  'B': 3, 'C': 3, 'M': 3, 'P': 3,
  'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
  'K': 5,
  'J': 8, 'X': 8,
  'Q': 10, 'Z': 10
};

let validWordsCache: Set<string> | null = null;

async function getValidWords(): Promise<Set<string>> {
  if (validWordsCache) return validWordsCache;
  const { validWords } = await import('../lib/wordlist');
  validWordsCache = validWords;
  return validWords;
}

export async function isValidWord(word: string): Promise<boolean> {
  const validWords = await getValidWords();
  return word.length >= 3 && validWords.has(word.toLowerCase());
}

export async function calculateScore(tiles: SelectedTile[]): Promise<WordResult | null> {
  const word = tiles.map(t => t.letter).join('');

  if (!(await isValidWord(word))) {
    return null;
  }

  let baseScore = 0;
  let wordMultiplier = 1;
  const multipliers: string[] = [];

  for (const tile of tiles) {
    let letterScore = LETTER_SCORES[tile.letter] || 1;

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

  const lengthBonus = word.length >= 6 ? Math.floor((word.length - 5) * 5) : 0;
  const finalScore = baseScore * wordMultiplier + lengthBonus;

  return {
    word,
    score: finalScore,
    baseScore,
    multipliers
  };
}
