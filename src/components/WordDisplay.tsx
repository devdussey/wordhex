import { CheckCircle2, XCircle } from 'lucide-react';

interface WordDisplayProps {
  currentWord: string;
  isValid: boolean | null;
  showValidation: boolean;
  lastScore?: number;
  isMyTurn: boolean;
  currentPlayerName: string;
  currentWordScore?: number | null;
}

export function WordDisplay({
  currentWord,
  isValid,
  showValidation,
  lastScore,
  isMyTurn,
  currentPlayerName,
  currentWordScore,
}: WordDisplayProps) {
  return (
    <div className="bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50 min-h-[100px] flex items-center justify-center">
      {currentWord ? (
        <div className="flex items-center gap-4">
          <h2 className="text-4xl font-bold text-white tracking-wider uppercase">
            {currentWord}
          </h2>
          {showValidation && (
            <div className="flex items-center gap-2">
              {isValid ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                  {lastScore !== undefined && (
                    <span className="text-2xl font-bold text-green-400 animate-pulse">
                      +{lastScore}
                    </span>
                  )}
                </>
              ) : (
                <XCircle className="w-8 h-8 text-red-400" />
              )}
            </div>
          )}
          {!showValidation && currentWordScore !== null && currentWordScore !== undefined && (
            <div className="px-4 py-2 bg-yellow-500/20 border-2 border-yellow-400 rounded-xl">
              <span className="text-3xl font-bold text-yellow-300">
                +{currentWordScore}
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-purple-400 text-lg">
          {isMyTurn
            ? 'Select tiles to spell a word...'
            : `Waiting for ${currentPlayerName} to finish their turn`}
        </p>
      )}
    </div>
  );
}
