import { createContext, useContext, useState, ReactNode } from 'react';

export type InputMode = 'click' | 'drag';

interface SettingsContextType {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [inputMode, setInputModeState] = useState<InputMode>(() => {
    if (typeof window === 'undefined') return 'click';
    try {
      const saved = localStorage.getItem('wordhex_input_mode');
      return (saved === 'drag' ? 'drag' : 'click') as InputMode;
    } catch {
      return 'click';
    }
  });

  const setInputMode = (mode: InputMode) => {
    setInputModeState(mode);
    try {
      localStorage.setItem('wordhex_input_mode', mode);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <SettingsContext.Provider value={{ inputMode, setInputMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
