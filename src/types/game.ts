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
  gemsCollected: number;
  timeLeft: number;
  gameOver: boolean;
}
