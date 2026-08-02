import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  playClickSound,
  playBankSound,
  playFarkleSound,
  playRoundCompleteSound,
  playWinSound,
  playUndoSound,
  getSoundMuted,
  setSoundMuted,
  toggleSoundMuted,
} from './sound';

interface SoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playClick: () => void;
  playBank: () => void;
  playFarkle: () => void;
  playRoundComplete: () => void;
  playWin: () => void;
  playUndo: () => void;
}

const SoundContext = createContext<SoundContextType>({
  isMuted: false,
  toggleMute: () => {},
  playClick: () => {},
  playBank: () => {},
  playFarkle: () => {},
  playRoundComplete: () => {},
  playWin: () => {},
  playUndo: () => {},
});

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMutedState] = useState<boolean>(() => getSoundMuted());

  const handleToggleMute = () => {
    const nextState = toggleSoundMuted();
    setIsMutedState(nextState);
    if (!nextState) {
      playClickSound();
    }
  };

  return (
    <SoundContext.Provider
      value={{
        isMuted,
        toggleMute: handleToggleMute,
        playClick: playClickSound,
        playBank: playBankSound,
        playFarkle: playFarkleSound,
        playRoundComplete: playRoundCompleteSound,
        playWin: playWinSound,
        playUndo: playUndoSound,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => useContext(SoundContext);
