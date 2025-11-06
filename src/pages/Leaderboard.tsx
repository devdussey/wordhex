import type { AuthSession, PlayerStats } from "../types";

interface LeaderboardProps {
  session: AuthSession;
  stats: PlayerStats;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  highlight?: boolean;
}

const seededLeaders: LeaderboardEntry[] = [
  { name: "NovaHex", score: 960 },
  { name: "CipherSage", score: 920 },
  { name: "GlyphRider", score: 890 },
  { name: "LexiLoop", score: 870 },
  { name: "PuzzleBloom", score: 845 },
];

function getPlayerName(session: AuthSession): string {
  if ("provider" in session) {
    return session.user.username;
  }
  const metadata = session.user.user_metadata as Record<string, unknown> | null | undefined;
  const fullName = metadata && typeof metadata === "object" ? metadata["full_name"] : undefined;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName;
  }
  const username = metadata && typeof metadata === "object" ? metadata["user_name"] : undefined;
  if (typeof username === "string" && username.trim()) {
    return username;
  }
  return session.user.email ?? "You";
}

export default function Leaderboard({ session, stats }: LeaderboardProps) {
  const personalBest = stats.bestScore;
  const playerName = getPlayerName(session);

  const combined = [...seededLeaders];
  if (personalBest > 0) {
    combined.push({ name: playerName, score: personalBest, highlight: true });
  }

  const ranked = combined
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
    .slice(0, 10);

  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">Leaderboard</h1>
        <p className="page__subtitle">
          Chase the top scores from the community and celebrate your personal best.
        </p>
      </header>

      <section className="panel">
        <div className="table">
          <div className="table__header">
            <span>Rank</span>
            <span>Player</span>
            <span>Score</span>
          </div>
          {ranked.map((entry) => (
            <div
              key={`${entry.name}-${entry.score}`}
              className={`table__row${entry.highlight ? " table__row--highlight" : ""}`}
            >
              <span>#{entry.rank}</span>
              <span>{entry.name}</span>
              <span>{entry.score}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
