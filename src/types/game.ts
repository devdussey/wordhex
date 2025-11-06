export interface Tile {
  letter: string;
  multiplier: 'DL' | 'TL' | 'DW' | 'TW' | null;
  row: number;
  col: number;
  isGem?: boolean;
}

export interface SelectedTile extends Tile {
  index: number;
}

export interface WordResult {
  word: string;
  score: number;
  baseScore: number;
  multipliers: string[];
}

export interface GameState {
  grid: Tile[][];
  selectedTiles: SelectedTile[];
  currentWord: string;
  score: number;
  wordsFound: WordResult[];
  gemsCollected: number;      // Gems earned from gem tiles
  gemsRemaining: number;      // Gems available to use (start with 3, max 10)
  timeLeft: number;
  gameOver: boolean;
}
