import type { AuthSession, PlayerStats } from "../types";

interface DashboardProps {
  session: AuthSession;
  stats: PlayerStats;
}

function getGreeting(session: AuthSession): string {
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

  return session.user.email ?? "Player";
}

export default function Dashboard({ session, stats }: DashboardProps) {
  const averageScore = stats.gamesPlayed ? Math.round(stats.totalScore / stats.gamesPlayed) : 0;

  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">Welcome back, {getGreeting(session)}!</h1>
        <p className="page__subtitle">
          Track your latest Wordhex progress and jump back into a new round when you are ready.
        </p>
      </header>

      <section className="grid">
        <article className="stat-card">
          <h2 className="stat-card__label">Games played</h2>
          <p className="stat-card__value">{stats.gamesPlayed}</p>
        </article>
        <article className="stat-card">
          <h2 className="stat-card__label">Best score</h2>
          <p className="stat-card__value">{stats.bestScore}</p>
        </article>
        <article className="stat-card">
          <h2 className="stat-card__label">Average score</h2>
          <p className="stat-card__value">{averageScore}</p>
        </article>
        <article className="stat-card">
          <h2 className="stat-card__label">Total words</h2>
          <p className="stat-card__value">{stats.totalWordsFound}</p>
        </article>
      </section>

      <section className="panel">
        <h2 className="panel__title">Recent words</h2>
        {stats.recentWords.length ? (
          <ul className="list">
            {stats.recentWords.map((word, index) => (
              <li key={`${word}-${index}`} className="list__item">
                <span className="list__word">{word}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="panel__empty">Find words in the arena to build your history.</p>
        )}
      </section>
    </main>
  );
}
