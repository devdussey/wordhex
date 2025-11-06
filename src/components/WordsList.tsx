import { WordResult } from '../types/game';
import { Flame } from 'lucide-react';

interface WordsListProps {
  words: WordResult[];
}

export function WordsList({ words }: WordsListProps) {
  const lastThreeWords = words.slice(-3).reverse();

  if (words.length === 0) {
    return (
      <div className="bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-400" />
          Previous Words
        </h3>
        <p className="text-purple-400">No words found yet. Start spelling!</p>
      </div>
    );
  }

  return (
    <div className="bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Flame className="w-6 h-6 text-orange-400" />
        Previous Words
      </h3>
      <div className="space-y-2">
        {lastThreeWords.map((wordResult, idx) => (
          <div
            key={`${wordResult.word}-${idx}`}
            className="bg-purple-800/50 rounded-lg p-3 flex items-center justify-between animate-slideIn"
          >
            <div>
              <span className="text-white font-bold uppercase text-lg">
                {wordResult.word}
              </span>
              {wordResult.multipliers.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {wordResult.multipliers.map((mult, i) => (
                    <span
                      key={i}
                      className="text-xs bg-slate-600 text-yellow-300 px-2 py-0.5 rounded-full"
                    >
                      {mult}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-400">
                +{wordResult.score}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
