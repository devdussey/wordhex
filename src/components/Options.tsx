import { ArrowLeft, Volume2, Music, Vibrate, Eye, MousePointerClick } from 'lucide-react';
import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface OptionsProps {
  onBack: () => void;
}

export function Options({ onBack }: OptionsProps) {
  const { inputMode, setInputMode } = useSettings();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(false);
  const [showHints, setShowHints] = useState(true);

  const toggleOption = (
    currentValue: boolean,
    setter: (value: boolean) => void,
    storageKey: string
  ) => {
    const newValue = !currentValue;
    setter(newValue);
    localStorage.setItem(storageKey, JSON.stringify(newValue));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 p-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="mb-8 px-6 py-3 bg-purple-800/50 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Menu
        </button>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Options</h1>
          <p className="text-purple-300 text-lg">Customize Your Experience</p>
        </div>

        <div className="space-y-4">
          <div className="bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center">
                <MousePointerClick className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Input Mode</h3>
                <p className="text-purple-300 text-sm">
                  {inputMode === 'click' ? 'Click each letter' : 'Click and drag to select'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setInputMode(inputMode === 'click' ? 'drag' : 'click')}
              className={`w-16 h-8 rounded-full transition-all ${
                inputMode === 'drag' ? 'bg-green-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`w-6 h-6 bg-white rounded-full transition-transform ${
                  inputMode === 'drag' ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Sound Effects</h3>
                <p className="text-purple-300 text-sm">Play sound effects during gameplay</p>
              </div>
            </div>
            <button
              onClick={() => toggleOption(soundEnabled, setSoundEnabled, 'soundEnabled')}
              className={`w-16 h-8 rounded-full transition-all ${
                soundEnabled ? 'bg-green-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`w-6 h-6 bg-white rounded-full transition-transform ${
                  soundEnabled ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Background Music</h3>
                <p className="text-purple-300 text-sm">Play music while you spell</p>
              </div>
            </div>
            <button
              onClick={() => toggleOption(musicEnabled, setMusicEnabled, 'musicEnabled')}
              className={`w-16 h-8 rounded-full transition-all ${
                musicEnabled ? 'bg-green-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`w-6 h-6 bg-white rounded-full transition-transform ${
                  musicEnabled ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center">
                <Vibrate className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Haptic Feedback</h3>
                <p className="text-purple-300 text-sm">Vibrate on tile selection</p>
              </div>
            </div>
            <button
              onClick={() => toggleOption(vibrateEnabled, setVibrateEnabled, 'vibrateEnabled')}
              className={`w-16 h-8 rounded-full transition-all ${
                vibrateEnabled ? 'bg-green-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`w-6 h-6 bg-white rounded-full transition-transform ${
                  vibrateEnabled ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Show Hints</h3>
                <p className="text-purple-300 text-sm">Display helpful tips during gameplay</p>
              </div>
            </div>
            <button
              onClick={() => toggleOption(showHints, setShowHints, 'showHints')}
              className={`w-16 h-8 rounded-full transition-all ${
                showHints ? 'bg-green-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`w-6 h-6 bg-white rounded-full transition-transform ${
                  showHints ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-8 bg-purple-900/30 rounded-xl p-6 shadow-lg border-2 border-purple-700/50">
          <h2 className="text-xl font-bold text-white mb-4">About</h2>
          <div className="space-y-2 text-purple-300">
            <p>Spellcast - Word Puzzle Game</p>
            <p className="text-sm">Version 1.0.0</p>
            <p className="text-sm">Created with React, TypeScript, and Supabase</p>
          </div>
        </div>
      </div>
    </div>
  );
}
