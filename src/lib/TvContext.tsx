import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type TvDirection = 'up' | 'down' | 'left' | 'right';
export type TvColorAction = 'red' | 'green' | 'yellow' | 'blue';

export interface TvKeypadTarget {
  inputEl: HTMLInputElement;
  label: string;
  inputType: 'number' | 'text';
  initialValue: string;
}

interface TvContextType {
  isTvMode: boolean;
  toggleTvMode: () => void;
  showTvGuide: boolean;
  setShowTvGuide: (show: boolean) => void;
  showVirtualRemote: boolean;
  setShowVirtualRemote: (show: boolean) => void;
  focusedLabel: string;
  lastRemoteAction: string | null;
  gamepadConnected: boolean;
  tvKeypadTarget: TvKeypadTarget | null;
  openTvKeypadForActiveInput: () => void;
  closeTvKeypad: () => void;
  applyTvKeypadValue: (val: string, submitAfter?: boolean) => void;
  navigateSpatial: (dir: TvDirection) => void;
  triggerSelect: () => void;
  triggerBack: () => void;
  triggerHome: () => void;
  triggerColorShortcut: (color: TvColorAction) => void;
}

const TvContext = createContext<TvContextType>({
  isTvMode: false,
  toggleTvMode: () => {},
  showTvGuide: false,
  setShowTvGuide: () => {},
  showVirtualRemote: false,
  setShowVirtualRemote: () => {},
  focusedLabel: '',
  lastRemoteAction: null,
  gamepadConnected: false,
  tvKeypadTarget: null,
  openTvKeypadForActiveInput: () => {},
  closeTvKeypad: () => {},
  applyTvKeypadValue: () => {},
  navigateSpatial: () => {},
  triggerSelect: () => {},
  triggerBack: () => {},
  triggerHome: () => {},
  triggerColorShortcut: () => {},
});

function detectAndroidTvUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /AFT|Android TV|GoogleTV|BRAVIA|SHIELD|Leanback|CrKey|SmartTV|Tizen|Web0S|MiBOX|FireTV/i.test(ua);
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  } else {
    input.value = value;
  }
  const event = new Event('input', { bubbles: true });
  input.dispatchEvent(event);
  const changeEvent = new Event('change', { bubbles: true });
  input.dispatchEvent(changeEvent);
}

export const TvProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTvMode, setIsTvMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('scorekeeper_tv_mode');
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    return detectAndroidTvUserAgent();
  });

  const [showTvGuide, setShowTvGuide] = useState<boolean>(false);
  const [showVirtualRemote, setShowVirtualRemote] = useState<boolean>(() => {
    const saved = localStorage.getItem('scorekeeper_virtual_remote');
    return saved ? saved === 'true' : true;
  });
  const [focusedLabel, setFocusedLabel] = useState<string>('Ready for D-Pad');
  const [lastRemoteAction, setLastRemoteAction] = useState<string | null>(null);
  const [gamepadConnected, setGamepadConnected] = useState<boolean>(false);
  const [tvKeypadTarget, setTvKeypadTarget] = useState<TvKeypadTarget | null>(null);

  const lastFocusedAppElRef = useRef<HTMLElement | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const flashRemoteAction = useCallback((label: string) => {
    setLastRemoteAction(label);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setLastRemoteAction(null);
    }, 1600);
  }, []);

  const toggleTvMode = useCallback(() => {
    setIsTvMode(prev => {
      const next = !prev;
      localStorage.setItem('scorekeeper_tv_mode', String(next));
      if (next) {
        flashRemoteAction('Android TV Mode Enabled');
      }
      return next;
    });
  }, [flashRemoteAction]);

  const handleSetShowVirtualRemote = useCallback((show: boolean) => {
    setShowVirtualRemote(show);
    localStorage.setItem('scorekeeper_virtual_remote', String(show));
  }, []);

  // Track currently focused element to display helpful context in TV HUD Bar
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === document.body) return;

      // Ignore virtual remote buttons when recording the last app element
      if (!target.closest('[data-tv-remote-widget="true"]')) {
        lastFocusedAppElRef.current = target;
      }

      const aria = target.getAttribute('aria-label') || target.getAttribute('title');
      const placeholder = (target as HTMLInputElement).placeholder;
      const text = target.innerText?.trim().replace(/\s+/g, ' ');
      const label = aria || placeholder || (text && text.length <= 45 ? text : text?.slice(0, 42) + '...') || target.tagName.toLowerCase();
      setFocusedLabel(label);
    };

    window.addEventListener('focusin', handleFocusIn);
    return () => window.removeEventListener('focusin', handleFocusIn);
  }, []);

  // Gather visible focusable elements, scoped to topmost modal if any modal is open
  const getFocusableElements = useCallback((includeVirtualRemote = false): HTMLElement[] => {
    const modals = Array.from(
      document.querySelectorAll<HTMLElement>('[data-tv-modal="true"], .fixed.inset-0')
    ).filter(el => {
      if (el.hasAttribute('data-tv-remote-widget')) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
    });

    const scopeRoot: ParentNode = modals.length > 0 ? modals[modals.length - 1] : document;

    const selector = [
      'button:not([disabled])',
      '[role="button"]:not([disabled])',
      '[tabindex="0"]:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'a[href]',
    ].join(', ');

    return Array.from(scopeRoot.querySelectorAll<HTMLElement>(selector)).filter(el => {
      if (!includeVirtualRemote && el.closest('[data-tv-remote-widget="true"]')) {
        return false;
      }
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }, []);

  // 2-Pass Spatial D-Pad Navigation Algorithm
  const navigateSpatial = useCallback((dir: TvDirection) => {
    if (!isTvMode) {
      setIsTvMode(true);
      localStorage.setItem('scorekeeper_tv_mode', 'true');
    }

    const focusables = getFocusableElements(false);
    if (focusables.length === 0) return;

    let activeEl = document.activeElement as HTMLElement | null;
    if (activeEl && activeEl.closest('[data-tv-remote-widget="true"]')) {
      activeEl = lastFocusedAppElRef.current;
    }

    if (!activeEl || activeEl === document.body || !focusables.includes(activeEl)) {
      const initialTarget =
        (lastFocusedAppElRef.current && focusables.includes(lastFocusedAppElRef.current)
          ? lastFocusedAppElRef.current
          : null) ||
        focusables.find(el => el.getAttribute('data-tv-action') === 'primary') ||
        focusables[0];
      initialTarget.focus();
      initialTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      flashRemoteAction(`D-Pad ${dir.toUpperCase()}`);
      return;
    }

    const activeRect = activeEl.getBoundingClientRect();
    const activeCenter = {
      x: activeRect.left + activeRect.width / 2,
      y: activeRect.top + activeRect.height / 2,
    };

    // Pass 1: Cone + Cross-axis overlap priority
    let bestConeCandidate: HTMLElement | null = null;
    let bestConeScore = Infinity;

    // Pass 2: Half-plane fallback so navigation never gets stuck
    let bestFallbackCandidate: HTMLElement | null = null;
    let bestFallbackScore = Infinity;

    focusables.forEach(candidate => {
      if (candidate === activeEl) return;
      const rect = candidate.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      const dx = center.x - activeCenter.x;
      const dy = center.y - activeCenter.y;

      let primaryDist = 0;
      let crossDist = 0;
      let hasCrossOverlap = false;
      let inHalfPlane = false;

      if (dir === 'right') {
        inHalfPlane = dx > 6;
        primaryDist = Math.max(1, rect.left >= activeRect.right ? rect.left - activeRect.right : dx);
        crossDist = Math.abs(dy);
        hasCrossOverlap = rect.bottom >= activeRect.top - 8 && rect.top <= activeRect.bottom + 8;
      } else if (dir === 'left') {
        inHalfPlane = dx < -6;
        primaryDist = Math.max(1, activeRect.left >= rect.right ? activeRect.left - rect.right : -dx);
        crossDist = Math.abs(dy);
        hasCrossOverlap = rect.bottom >= activeRect.top - 8 && rect.top <= activeRect.bottom + 8;
      } else if (dir === 'down') {
        inHalfPlane = dy > 6;
        primaryDist = Math.max(1, rect.top >= activeRect.bottom ? rect.top - activeRect.bottom : dy);
        crossDist = Math.abs(dx);
        hasCrossOverlap = rect.right >= activeRect.left - 12 && rect.left <= activeRect.right + 12;
      } else if (dir === 'up') {
        inHalfPlane = dy < -6;
        primaryDist = Math.max(1, activeRect.top >= rect.bottom ? activeRect.top - rect.bottom : -dy);
        crossDist = Math.abs(dx);
        hasCrossOverlap = rect.right >= activeRect.left - 12 && rect.left <= activeRect.right + 12;
      }

      if (!inHalfPlane) return;

      // Cone check: either overlapping on cross axis or within generous 68-degree cone
      const inCone = hasCrossOverlap || crossDist <= primaryDist * 2.4;
      const overlapFactor = hasCrossOverlap ? 0.35 : 1.0;

      if (inCone) {
        const score = primaryDist + crossDist * 1.85 * overlapFactor;
        if (score < bestConeScore) {
          bestConeScore = score;
          bestConeCandidate = candidate;
        }
      }

      const fallbackScore = primaryDist * 1.6 + crossDist * 0.9;
      if (fallbackScore < bestFallbackScore) {
        bestFallbackScore = fallbackScore;
        bestFallbackCandidate = candidate;
      }
    });

    const chosen = (bestConeCandidate || bestFallbackCandidate) as HTMLElement | null;
    if (chosen) {
      chosen.focus();
      chosen.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      flashRemoteAction(`D-Pad ${dir.toUpperCase()}`);
    }
  }, [isTvMode, getFocusableElements, flashRemoteAction]);

  // Open on-screen keypad for an input element
  const openTvKeypadForInput = useCallback((inputEl: HTMLInputElement) => {
    const inputType = inputEl.type === 'number' ? 'number' : 'text';
    const label =
      inputEl.getAttribute('aria-label') ||
      inputEl.placeholder ||
      inputEl.getAttribute('title') ||
      (inputType === 'number' ? 'Enter Score / Value' : 'Enter Player Name');

    setTvKeypadTarget({
      inputEl,
      label,
      inputType,
      initialValue: inputEl.value || '',
    });
  }, []);

  const openTvKeypadForActiveInput = useCallback(() => {
    const active = (lastFocusedAppElRef.current || document.activeElement) as HTMLElement | null;
    if (active && active.tagName === 'INPUT') {
      openTvKeypadForInput(active as HTMLInputElement);
      return;
    }
    // Otherwise find first visible input on screen
    const visibleInput = Array.from(document.querySelectorAll<HTMLInputElement>('input:not([disabled])')).find(
      el => el.offsetHeight > 0 && !el.closest('[data-tv-remote-widget="true"]')
    );
    if (visibleInput) {
      visibleInput.focus();
      openTvKeypadForInput(visibleInput);
    } else {
      flashRemoteAction('No Input Field on Screen');
    }
  }, [openTvKeypadForInput, flashRemoteAction]);

  const closeTvKeypad = useCallback(() => {
    const targetInput = tvKeypadTarget?.inputEl;
    setTvKeypadTarget(null);
    if (targetInput) {
      window.setTimeout(() => targetInput.focus(), 50);
    }
  }, [tvKeypadTarget]);

  const applyTvKeypadValue = useCallback((val: string, submitAfter = false) => {
    if (!tvKeypadTarget) return;
    const { inputEl } = tvKeypadTarget;
    setNativeInputValue(inputEl, val);
    setTvKeypadTarget(null);

    window.setTimeout(() => {
      inputEl.focus();
      if (submitAfter) {
        const form = inputEl.closest('form');
        if (form) {
          form.requestSubmit();
        } else {
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
          });
          inputEl.dispatchEvent(enterEvent);
        }
      }
      flashRemoteAction(`Entered: ${val || '0'}`);
    }, 40);
  }, [tvKeypadTarget, flashRemoteAction]);

  // Trigger OK / Center Select on active element
  const triggerSelect = useCallback(() => {
    let target = document.activeElement as HTMLElement | null;
    if (!target || target === document.body || target.closest('[data-tv-remote-widget="true"]')) {
      target = lastFocusedAppElRef.current;
    }

    if (!target || !document.body.contains(target)) {
      const focusables = getFocusableElements(false);
      if (focusables.length > 0) {
        focusables[0].focus();
        flashRemoteAction('Focused First Control');
      }
      return;
    }

    if (target.tagName === 'INPUT') {
      openTvKeypadForInput(target as HTMLInputElement);
      flashRemoteAction('Opened TV Keypad');
      return;
    }

    if (target.tagName === 'SELECT') {
      const selectEl = target as HTMLSelectElement;
      const nextIdx = (selectEl.selectedIndex + 1) % Math.max(1, selectEl.options.length);
      selectEl.selectedIndex = nextIdx;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      flashRemoteAction(`Selected: ${selectEl.options[nextIdx]?.text || ''}`);
      return;
    }

    target.click();
    flashRemoteAction('OK / Select');
  }, [getFocusableElements, openTvKeypadForInput, flashRemoteAction]);

  // Trigger Back / Escape action
  const triggerBack = useCallback(() => {
    if (tvKeypadTarget) {
      closeTvKeypad();
      flashRemoteAction('Closed TV Keypad');
      return;
    }

    if (showTvGuide) {
      setShowTvGuide(false);
      flashRemoteAction('Closed TV Guide');
      return;
    }

    // Look for an open modal close button
    const closeBtns = Array.from(
      document.querySelectorAll<HTMLElement>('[data-tv-close="true"]')
    ).filter(el => el.offsetHeight > 0);

    if (closeBtns.length > 0) {
      closeBtns[closeBtns.length - 1].click();
      flashRemoteAction('Back / Closed Modal');
      return;
    }

    // Check any generic open modal overlay with a Cancel or X button
    const openModals = Array.from(
      document.querySelectorAll<HTMLElement>('.fixed.inset-0')
    ).filter(el => !el.hasAttribute('data-tv-remote-widget') && el.offsetHeight > 0);

    if (openModals.length > 0) {
      const topModal = openModals[openModals.length - 1];
      const cancelBtn = Array.from(topModal.querySelectorAll<HTMLElement>('button')).find(btn => {
        const txt = btn.innerText?.toLowerCase() || '';
        return txt.includes('cancel') || txt.includes('close') || txt.includes('keep playing') || txt.includes('got it') || txt.includes('okay');
      }) || topModal.querySelector<HTMLElement>('button');

      if (cancelBtn) {
        cancelBtn.click();
        flashRemoteAction('Back / Dismissed');
        return;
      }
    }

    // If inside an active game, trigger the Quit Game button
    const quitBtn = document.querySelector<HTMLElement>('[data-tv-quit="true"]');
    if (quitBtn && quitBtn.offsetHeight > 0) {
      quitBtn.click();
      flashRemoteAction('Back / Exit Game Menu');
      return;
    }

    flashRemoteAction('At Home Lobby');
  }, [tvKeypadTarget, closeTvKeypad, showTvGuide, flashRemoteAction]);

  // Trigger Home / Return to Lobby
  const triggerHome = useCallback(() => {
    if (tvKeypadTarget) {
      closeTvKeypad();
    }
    if (showTvGuide) {
      setShowTvGuide(false);
    }
    const quitBtn = document.querySelector<HTMLElement>('[data-tv-quit="true"]');
    if (quitBtn && quitBtn.offsetHeight > 0) {
      quitBtn.click();
      flashRemoteAction('Home / Exit Game');
      return;
    }
    const focusables = getFocusableElements(false);
    if (focusables.length > 0) {
      focusables[0].focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      flashRemoteAction('Home / Top of Lobby');
    }
  }, [tvKeypadTarget, closeTvKeypad, showTvGuide, getFocusableElements, flashRemoteAction]);

  // Trigger Color Remote Shortcut Buttons (Red, Green, Yellow, Blue)
  const triggerColorShortcut = useCallback((color: TvColorAction) => {
    const actionMap: Record<TvColorAction, { attr: string; label: string }> = {
      green: { attr: 'primary', label: 'Green: Bank / Confirm' },
      red: { attr: 'danger', label: 'Red: Farkle / Action' },
      yellow: { attr: 'undo', label: 'Yellow: Undo' },
      blue: { attr: 'rules', label: 'Blue: House Rules' },
    };

    const { attr, label } = actionMap[color];
    const targetBtn = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-tv-action="${attr}"]:not([disabled])`)
    ).find(el => el.offsetHeight > 0);

    if (targetBtn) {
      targetBtn.focus();
      targetBtn.click();
      flashRemoteAction(label);
    } else {
      flashRemoteAction(`${label} (Unavailable here)`);
    }
  }, [flashRemoteAction]);

  // Auto-focus inside newly opened modals when in TV mode
  useEffect(() => {
    if (!isTvMode) return;
    const observer = new MutationObserver(() => {
      const modals = Array.from(
        document.querySelectorAll<HTMLElement>('[data-tv-modal="true"], .fixed.inset-0')
      ).filter(el => !el.hasAttribute('data-tv-remote-widget') && el.offsetHeight > 0);

      if (modals.length > 0) {
        const topModal = modals[modals.length - 1];
        if (!topModal.contains(document.activeElement)) {
          const firstFocusable = topModal.querySelector<HTMLElement>(
            'button:not([disabled]), [tabindex="0"]:not([disabled]), input:not([disabled])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isTvMode]);

  // Keyboard & Android TV Hardware Remote Key Listener
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    const keyCode = e.keyCode;

    const isUp = key === 'ArrowUp' || keyCode === 19;
    const isDown = key === 'ArrowDown' || keyCode === 20;
    const isLeft = key === 'ArrowLeft' || keyCode === 21;
    const isRight = key === 'ArrowRight' || keyCode === 22;
    const isArrow = isUp || isDown || isLeft || isRight;

    const isCenterOk =
      key === 'DPAD_CENTER' ||
      key === 'Select' ||
      keyCode === 23 ||
      (key === 'Enter' && isTvMode);

    const isBackKey =
      key === 'Escape' ||
      key === 'Back' ||
      key === 'BrowserBack' ||
      key === 'GoBack' ||
      keyCode === 4 ||
      keyCode === 27 ||
      keyCode === 461 ||
      keyCode === 10009;

    const activeEl = document.activeElement as HTMLElement | null;
    const isTypingInInput =
      activeEl &&
      (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
      !tvKeypadTarget;

    // Handle Back button
    if (isBackKey) {
      e.preventDefault();
      triggerBack();
      return;
    }

    // Handle Color Buttons & Function Keys (F1=Red, F2=Green, F3=Yellow, F4=Blue)
    if (key === 'ColorF0Red' || key === 'F1') {
      e.preventDefault();
      triggerColorShortcut('red');
      return;
    }
    if (key === 'ColorF1Green' || key === 'F2' || key === 'MediaPlayPause') {
      e.preventDefault();
      triggerColorShortcut('green');
      return;
    }
    if (key === 'ColorF2Yellow' || key === 'F3') {
      e.preventDefault();
      triggerColorShortcut('yellow');
      return;
    }
    if (key === 'ColorF3Blue' || key === 'F4') {
      e.preventDefault();
      triggerColorShortcut('blue');
      return;
    }

    // Handle D-Pad Center / OK on non-button elements or inputs in TV mode
    if (isCenterOk && activeEl) {
      if (activeEl.tagName === 'INPUT' && isTvMode && !tvKeypadTarget) {
        e.preventDefault();
        openTvKeypadForInput(activeEl as HTMLInputElement);
        return;
      }
      if (activeEl.tagName !== 'BUTTON' && activeEl.tagName !== 'A' && activeEl.tagName !== 'INPUT') {
        e.preventDefault();
        activeEl.click();
        flashRemoteAction('OK / Select');
        return;
      }
    }

    // Handle Arrow Keys for Spatial D-Pad Navigation
    if (isArrow) {
      // Allow Up/Down/Left/Right to navigate out of inputs in TV Mode so remote never gets trapped inside an input
      if (isTypingInInput && (isLeft || isRight)) {
        const inp = activeEl as HTMLInputElement;
        if (inp.type === 'text' && inp.value.length > 0) {
          const selStart = inp.selectionStart ?? 0;
          if (isLeft && selStart > 0) return;
          if (isRight && selStart < inp.value.length) return;
        }
      }

      e.preventDefault();
      if (isUp) navigateSpatial('up');
      else if (isDown) navigateSpatial('down');
      else if (isLeft) navigateSpatial('left');
      else if (isRight) navigateSpatial('right');
    }
  }, [
    isTvMode,
    tvKeypadTarget,
    triggerBack,
    triggerColorShortcut,
    openTvKeypadForInput,
    navigateSpatial,
    flashRemoteAction,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Gamepad API Polling for Android TV Controllers & Bluetooth Remotes
  useEffect(() => {
    let rafId: number;
    let lastMoveTime = 0;
    const prevButtons: Record<number, boolean> = {};

    const pollGamepads = (timestamp: number) => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let anyConnected = false;

      for (const gp of gamepads) {
        if (!gp) continue;
        anyConnected = true;

        // D-Pad buttons (12: Up, 13: Down, 14: Left, 15: Right) & Left Stick axes (0, 1)
        const up = gp.buttons[12]?.pressed || (gp.axes[1] !== undefined && gp.axes[1] < -0.55);
        const down = gp.buttons[13]?.pressed || (gp.axes[1] !== undefined && gp.axes[1] > 0.55);
        const left = gp.buttons[14]?.pressed || (gp.axes[0] !== undefined && gp.axes[0] < -0.55);
        const right = gp.buttons[15]?.pressed || (gp.axes[0] !== undefined && gp.axes[0] > 0.55);

        if ((up || down || left || right) && timestamp - lastMoveTime > 190) {
          lastMoveTime = timestamp;
          if (up) navigateSpatial('up');
          else if (down) navigateSpatial('down');
          else if (left) navigateSpatial('left');
          else if (right) navigateSpatial('right');
        }

        // Action buttons (edge-triggered)
        const checkBtn = (idx: number, action: () => void) => {
          const pressed = Boolean(gp.buttons[idx]?.pressed);
          if (pressed && !prevButtons[idx]) {
            action();
          }
          prevButtons[idx] = pressed;
        };

        checkBtn(0, triggerSelect); // A / Cross -> OK / Select
        checkBtn(1, triggerBack); // B / Circle -> Back
        checkBtn(2, () => triggerColorShortcut('yellow')); // X -> Undo
        checkBtn(3, () => triggerColorShortcut('blue')); // Y -> Rules
        checkBtn(9, () => triggerColorShortcut('green')); // Start -> Primary / Bank
        checkBtn(8, triggerHome); // Select/Back -> Home
      }

      if (anyConnected !== gamepadConnected) {
        setGamepadConnected(anyConnected);
        if (anyConnected && !isTvMode) {
          setIsTvMode(true);
          localStorage.setItem('scorekeeper_tv_mode', 'true');
        }
      }

      rafId = window.requestAnimationFrame(pollGamepads);
    };

    const onGamepadConnected = () => {
      setGamepadConnected(true);
      if (!isTvMode) {
        setIsTvMode(true);
        localStorage.setItem('scorekeeper_tv_mode', 'true');
      }
      flashRemoteAction('Controller / Remote Connected');
    };

    window.addEventListener('gamepadconnected', onGamepadConnected);
    rafId = window.requestAnimationFrame(pollGamepads);

    return () => {
      window.removeEventListener('gamepadconnected', onGamepadConnected);
      window.cancelAnimationFrame(rafId);
    };
  }, [
    gamepadConnected,
    isTvMode,
    navigateSpatial,
    triggerSelect,
    triggerBack,
    triggerHome,
    triggerColorShortcut,
    flashRemoteAction,
  ]);

  return (
    <TvContext.Provider
      value={{
        isTvMode,
        toggleTvMode,
        showTvGuide,
        setShowTvGuide,
        showVirtualRemote,
        setShowVirtualRemote: handleSetShowVirtualRemote,
        focusedLabel,
        lastRemoteAction,
        gamepadConnected,
        tvKeypadTarget,
        openTvKeypadForActiveInput,
        closeTvKeypad,
        applyTvKeypadValue,
        navigateSpatial,
        triggerSelect,
        triggerBack,
        triggerHome,
        triggerColorShortcut,
      }}
    >
      <div className={isTvMode ? 'tv-mode-active' : ''}>
        {children}
      </div>
    </TvContext.Provider>
  );
};

export const useTv = () => useContext(TvContext);
