import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface TvContextType {
  isTvMode: boolean;
  toggleTvMode: () => void;
  showTvGuide: boolean;
  setShowTvGuide: (show: boolean) => void;
}

const TvContext = createContext<TvContextType>({
  isTvMode: false,
  toggleTvMode: () => {},
  showTvGuide: false,
  setShowTvGuide: () => {},
});

export const TvProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTvMode, setIsTvMode] = useState<boolean>(() => {
    return localStorage.getItem('scorekeeper_tv_mode') === 'true';
  });
  const [showTvGuide, setShowTvGuide] = useState<boolean>(false);

  const toggleTvMode = () => {
    setIsTvMode(prev => {
      const next = !prev;
      localStorage.setItem('scorekeeper_tv_mode', String(next));
      if (next) {
        setShowTvGuide(true);
      }
      return next;
    });
  };

  // Spatial D-Pad Navigation Handler for TV Remotes / Arrow Keys
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
    const isBackKey = e.key === 'Escape' || e.key === 'Back' || e.keyCode === 10009 || e.keyCode === 461;

    // Auto enable TV mode on first arrow key press if not already active
    if (isArrow && !isTvMode) {
      setIsTvMode(true);
      localStorage.setItem('scorekeeper_tv_mode', 'true');
    }

    // Handle spatial navigation when arrow key pressed
    if (isArrow) {
      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex="0"]:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]'
        )
      ).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
      });

      if (focusables.length === 0) return;

      const activeEl = document.activeElement as HTMLElement | null;

      // If nothing is focused or body is focused, focus the first interactive element
      if (!activeEl || activeEl === document.body || !focusables.includes(activeEl)) {
        focusables[0].focus();
        e.preventDefault();
        return;
      }

      const activeRect = activeEl.getBoundingClientRect();
      const activeCenter = {
        x: activeRect.left + activeRect.width / 2,
        y: activeRect.top + activeRect.height / 2,
      };

      let bestCandidate: HTMLElement | null = null;
      let minDistance = Infinity;

      focusables.forEach(candidate => {
        if (candidate === activeEl) return;
        const rect = candidate.getBoundingClientRect();
        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };

        const dx = center.x - activeCenter.x;
        const dy = center.y - activeCenter.y;

        let isDirectionValid = false;

        switch (e.key) {
          case 'ArrowRight':
            isDirectionValid = dx > 10 && Math.abs(dy) < Math.abs(dx) * 2;
            break;
          case 'ArrowLeft':
            isDirectionValid = dx < -10 && Math.abs(dy) < Math.abs(dx) * 2;
            break;
          case 'ArrowDown':
            isDirectionValid = dy > 10 && Math.abs(dx) < Math.abs(dy) * 2;
            break;
          case 'ArrowUp':
            isDirectionValid = dy < -10 && Math.abs(dx) < Math.abs(dy) * 2;
            break;
        }

        if (isDirectionValid) {
          // Weighted Euclidean distance giving preference to alignment
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDistance) {
            minDistance = dist;
            bestCandidate = candidate;
          }
        }
      });

      if (bestCandidate) {
        e.preventDefault();
        (bestCandidate as HTMLElement).focus();
        (bestCandidate as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [isTvMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <TvContext.Provider value={{ isTvMode, toggleTvMode, showTvGuide, setShowTvGuide }}>
      <div className={isTvMode ? 'tv-mode-active' : ''}>
        {children}
      </div>
    </TvContext.Provider>
  );
};

export const useTv = () => useContext(TvContext);
