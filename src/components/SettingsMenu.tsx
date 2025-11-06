import { X, Volume2, VolumeX, LogOut, UserMinus } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { useState } from 'react';

interface SettingsMenuProps {
  onClose: () => void;
  onVoteQuit: () => void;
  onForfeit: () => void;
}

export function SettingsMenu({ onClose, onVoteQuit, onForfeit }: SettingsMenuProps) {
  const [audioEnabled, setAudioEnabled] = useState(audioManager.isEnabled());

  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    audioManager.setEnabled(newState);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900 to-purple-950 rounded-2xl p-8 max-w-md w-full border-4 border-purple-600/50 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-purple-300 hover:text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full px-6 py-4 bg-purple-700 hover:bg-purple-600 text-white rounded-xl
                     font-semibold transition-all flex items-center justify-center gap-3
                     transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <X className="w-5 h-5" />
            Return to Game
          </button>

          <button
            onClick={toggleAudio}
            className="w-full px-6 py-4 bg-blue-700 hover:bg-blue-600 text-white rounded-xl
                     font-semibold transition-all flex items-center justify-center gap-3
                     transform hover:scale-105 active:scale-95 shadow-lg"
          >
            {audioEnabled ? (
              <>
                <Volume2 className="w-5 h-5" />
                Sound: ON
              </>
            ) : (
              <>
                <VolumeX className="w-5 h-5" />
                Sound: OFF
              </>
            )}
          </button>

          <button
            onClick={onVoteQuit}
            className="w-full px-6 py-4 bg-orange-700 hover:bg-orange-600 text-white rounded-xl
                     font-semibold transition-all flex items-center justify-center gap-3
                     transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <UserMinus className="w-5 h-5" />
            Vote to Quit
          </button>

          <button
            onClick={onForfeit}
            className="w-full px-6 py-4 bg-red-700 hover:bg-red-600 text-white rounded-xl
                     font-semibold transition-all flex items-center justify-center gap-3
                     transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <LogOut className="w-5 h-5" />
            Forfeit Game
          </button>
        </div>

        <p className="text-purple-300 text-sm text-center mt-6">
          Changes take effect immediately
        </p>
      </div>
    </div>
  );
}
