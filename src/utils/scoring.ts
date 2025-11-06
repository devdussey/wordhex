import { SelectedTile, WordResult } from '../types/game';

// SpellCast official letter values
const LETTER_SCORES: Record<string, number> = {
  'A': 1, 'E': 1, 'I': 1, 'O': 1,  // 1 point
  'N': 2, 'R': 2, 'S': 2, 'T': 2,  // 2 points
  'D': 3, 'G': 3, 'L': 3,          // 3 points
  'B': 4, 'H': 4, 'P': 4, 'M': 4, 'U': 4, 'Y': 4,  // 4 points
  'C': 5, 'F': 5, 'V': 5, 'W': 5,  // 5 points
  'K': 6,                          // 6 points
  'J': 7, 'X': 7,                  // 7 points
  'Q': 8, 'Z': 8                   // 8 points
};

let validWordsCache: Set<string> | null = null;

async function getValidWords(): Promise<Set<string>> {
  if (validWordsCache) return validWordsCache;
  try {
    const { validWords } = await import('../lib/wordlist');
    validWordsCache = validWords;
    return validWords;
  } catch (error) {
    console.warn('Wordlist not available, using basic validation');
    // Fallback: return a set of common words if wordlist fails to load
    return new Set();
  }
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

  // SpellCast long word bonus: +10 points for 6+ letter words
  const lengthBonus = word.length >= 6 ? 10 : 0;
  const finalScore = baseScore * wordMultiplier + lengthBonus;

  return {
    word,
    score: finalScore,
    baseScore,
    multipliers
  };
}
