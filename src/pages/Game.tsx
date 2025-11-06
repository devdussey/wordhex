import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthSession, PlayerStats } from "../types";

const LETTERS = "EEEEEEEEEEEEAAAAAAAAAIIIIIIIIONNNNNNRRRRRRTTTTTLLLLSSSSUUUUDDDDGGGGBBCCMMPPFFHHVVWWYYKJXQZ";
const BOARD_SIZE = 4;
const ROUND_DURATION = 90;
const DICTIONARY = [
  "WORD",
  "HEX",
  "POWER",
  "LETTER",
  "PUZZLE",
  "STORM",
  "BRAIN",
  "CODE",
  "STACK",
  "MIND",
  "REACT",
  "STATE",
  "HOOK",
  "NOVA",
  "RIDDLE",
  "GLYPH",
];

interface GameProps {
  session: AuthSession;
  stats: PlayerStats;
  onStatsChange: (next: PlayerStats) => void;
}

interface BoardCell {
  id: string;
  letter: string;
}

function createBoard(): BoardCell[] {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 7)}`,
    letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
  }));
}

function canMakeWord(board: BoardCell[], word: string): boolean {
  const normalized = word.toUpperCase();
  const available = board.reduce<Record<string, number>>((acc, cell) => {
    acc[cell.letter] = (acc[cell.letter] ?? 0) + 1;
    return acc;
  }, {});

  for (const char of normalized) {
    if (!available[char]) {
      return false;
    }
    available[char] -= 1;
  }

  return true;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function Game({ session, stats, onStatsChange }: GameProps) {
  const [board, setBoard] = useState(() => createBoard());
  const [entry, setEntry] = useState("");
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(ROUND_DURATION);
  const [isActive, setIsActive] = useState(true);
  const [gameFinished, setGameFinished] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || gameFinished) {
      return;
    }

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((value) => {
        if (value <= 1) {
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          endRound();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, gameFinished]);

  const boardRows = useMemo(() => {
    const rows: BoardCell[][] = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      rows.push(board.slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE));
    }
    return rows;
  }, [board]);

  function resetBoard() {
    setBoard(createBoard());
    setEntry("");
    setFoundWords([]);
    setScore(0);
    setSecondsRemaining(ROUND_DURATION);
    setIsActive(true);
    setGameFinished(false);
  }

  function submitWord() {
    const word = entry.trim().toUpperCase();
    if (!word || word.length < 3) {
      return;
    }

    if (!DICTIONARY.includes(word)) {
      return;
    }

    if (!canMakeWord(board, word)) {
      return;
    }

    if (foundWords.includes(word)) {
      return;
    }

    setFoundWords((words) => [...words, word]);
    setScore((value) => value + word.length * 10);
    setEntry("");
  }

  function endRound() {
    if (gameFinished) {
      return;
    }

    setIsActive(false);
    setGameFinished(true);

    const updatedStats: PlayerStats = {
      gamesPlayed: stats.gamesPlayed + 1,
      totalScore: stats.totalScore + score,
      bestScore: Math.max(stats.bestScore, score),
      totalWordsFound: stats.totalWordsFound + foundWords.length,
      recentWords: [...foundWords, ...stats.recentWords].slice(0, 10),
      lastUpdated: new Date().toISOString(),
    };

    onStatsChange(updatedStats);
  }

  function handleFinish() {
    if (!gameFinished) {
      endRound();
    }
  }

  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">Wordhex Arena</h1>
        <p className="page__subtitle">
          Assemble valid words from the letter grid before the clock runs out. Each new word adds
          to your score.
        </p>
      </header>

      <section className="panel">
        <div className="game__status">
          <div className="game__timer">Time left: {formatTime(secondsRemaining)}</div>
          <div className="game__score">Score: {score}</div>
          <div className="game__player">Player: {"provider" in session ? session.user.username : session.user.email ?? "Guest"}</div>
        </div>

        <div className="board">
          {boardRows.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="board__row">
              {row.map((cell) => (
                <div key={cell.id} className="board__cell">
                  {cell.letter}
                </div>
              ))}
            </div>
          ))}
        </div>

        <form
          className="game__form"
          onSubmit={(event) => {
            event.preventDefault();
            submitWord();
          }}
        >
          <label className="game__label">
            Enter a word
            <input
              className="game__input"
              value={entry}
              onChange={(event) => setEntry(event.target.value)}
              disabled={!isActive}
              placeholder="Type at least 3 letters"
            />
          </label>
          <button className="button button--primary" type="submit" disabled={!isActive}>
            Submit
          </button>
          <button
            className="button"
            type="button"
            onClick={handleFinish}
            disabled={gameFinished}
          >
            Finish round
          </button>
          <button className="button" type="button" onClick={resetBoard}>
            New letters
          </button>
        </form>

        <section className="panel panel--nested">
          <h2 className="panel__title">Found words</h2>
          {foundWords.length ? (
            <ul className="list">
              {foundWords.map((word) => (
                <li key={word} className="list__item">
                  <span className="list__word">{word}</span>
                  <span className="list__score">+{word.length * 10}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel__empty">Submit valid words to start scoring points.</p>
          )}
        </section>
      </section>
    </main>
  );
}
