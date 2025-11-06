import { Trophy, Clock, Sparkles, BookOpen, Award } from 'lucide-react';

interface ScoreBoardProps {
  score: number;
  timeLeft: number;
  gemsCollected: number;
  wordsFound: number;
  serverRecord?: { score: number; player_name: string } | null;
}

export function ScoreBoard({ score, timeLeft, gemsCollected, wordsFound, serverRecord }: ScoreBoardProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="space-y-4">
      {serverRecord && (
        <div className="bg-gradient-to-r from-pink-600 via-purple-500 to-pink-600 rounded-xl p-4 shadow-lg text-center border-2 border-pink-400">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Award className="w-6 h-6 text-white" />
            <span className="text-sm font-bold uppercase text-white">Server Record</span>
          </div>
          <div className="text-3xl font-bold text-white">{serverRecord.score}</div>
          <div className="text-xs text-white/90 mt-1">Held by {serverRecord.player_name}</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-4 shadow-lg text-white">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase opacity-90">Score</span>
        </div>
        <div className="text-3xl font-bold">{score}</div>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-4 shadow-lg text-white">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase opacity-90">Time</span>
        </div>
        <div className="text-3xl font-bold">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>

      <div className="bg-gradient-to-br from-pink-600 to-fuchsia-600 rounded-xl p-4 shadow-lg text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase opacity-90">Gems</span>
        </div>
        <div className="text-3xl font-bold">{gemsCollected}</div>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl p-4 shadow-lg text-white">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase opacity-90">Words</span>
        </div>
        <div className="text-3xl font-bold">{wordsFound}</div>
      </div>
    </div>
    </div>
  );
}
