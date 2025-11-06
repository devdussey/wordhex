const LETTER_FREQUENCIES = {
  E: 12,
  T: 9,
  A: 9,
  O: 8,
  I: 8,
  N: 7,
  S: 7,
  H: 6,
  R: 6,
  D: 5,
  L: 5,
  C: 4,
  U: 4,
  M: 4,
  W: 3,
  F: 3,
  G: 3,
  Y: 3,
  P: 3,
  B: 2,
  V: 2,
  K: 2,
  J: 1,
  X: 1,
  Q: 1,
  Z: 1,
};

const MULTIPLIER_TYPES = ['DL', 'TL', 'DW', 'TW'];

export function generateGrid(rows = 5, cols = 5) {
  const letters = Object.entries(LETTER_FREQUENCIES).flatMap(([letter, freq]) =>
    Array(freq).fill(letter)
  );

  const grid = [];

  for (let row = 0; row < rows; row += 1) {
    const rowTiles = [];
    for (let col = 0; col < cols; col += 1) {
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];

      let multiplier = null;
      const multiplierChance = Math.random();

      if (multiplierChance < 0.15) {
        multiplier = MULTIPLIER_TYPES[Math.floor(Math.random() * MULTIPLIER_TYPES.length)];
      }

      const isGem = Math.random() < 0.08;

      rowTiles.push({
        letter: randomLetter,
        multiplier,
        row,
        col,
        isGem,
      });
    }
    grid.push(rowTiles);
  }

  return grid;
}

export default generateGrid;
