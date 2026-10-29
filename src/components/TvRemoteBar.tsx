import React, { useState, useEffect } from 'react';
import { useTv } from '../lib/TvContext';
import {
  Tv,
  X,
  Gamepad,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  Home,
  Hash,
  Minimize2,
  Maximize2,
  Delete,
  Check,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const QUICK_PLAYER_NAMES = ['Nick', 'Alice', 'Bob', 'Sarah', 'Mike', 'Alex', 'Sam', 'Taylor', 'Player 4', 'Player 5'];
const LETTER_KEYS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G',
  'H', 'I', 'J', 'K', 'L', 'M', 'N',
  'O', 'P', 'Q', 'R', 'S', 'T', 'U',
  'V', 'W', 'X', 'Y', 'Z', ' ',
];

export const TvRemoteBar: React.FC = () => {
  const {
    isTvMode,
    toggleTvMode,
    showTvGuide,
    setShowTvGuide,
    showVirtualRemote,
    setShowVirtualRemote,
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
  } = useTv();

  const [keypadValue, setKeypadValue] = useState<string>('');

  useEffect(() => {
    if (tvKeypadTarget) {
      setKeypadValue(tvKeypadTarget.initialValue || '');
    }
  }, [tvKeypadTarget]);

  if (!isTvMode) return null;

  return (
    <>
      {/* Bottom Sticky Android TV Leanback HUD Bar */}
      <div
        data-tv-remote-widget="true"
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t-2 border-amber-500/40 text-slate-200 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xl"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 font-black px-2.5 py-1 rounded-lg border border-emerald-500/40 shrink-0">
            <Tv className="w-3.5 h-3.5 text-emerald-400" />
            <span>ANDROID TV</span>
            {gamepadConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="Controller/Remote Connected" />
            )}
          </div>

          {/* Focused Control Indicator */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg max-w-[220px] truncate">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Focus:</span>
            <span className="text-[11px] font-bold text-amber-300 truncate">{focusedLabel}</span>
          </div>

          {/* Live Remote Command Feedback Toast */}
          <AnimatePresence mode="wait">
            {lastRemoteAction && (
              <motion.span
                key={lastRemoteAction}
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black rounded-md text-[10px] uppercase tracking-wider shadow-xs shrink-0"
              >
                {lastRemoteAction}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Interactive Color & D-Pad Legend */}
          <div className="hidden lg:flex items-center gap-3 text-slate-300 pl-2 border-l border-slate-800">
            <span className="flex items-center gap-1 font-medium">
              <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-amber-400">▲▼◄►</span>
              Move
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-emerald-400">OK</span>
              Select
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-sky-400">BACK</span>
              Return
            </span>
            <button
              type="button"
              data-tv-compact="true"
              onClick={() => triggerColorShortcut('green')}
              className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded text-[10px] font-bold text-emerald-300 cursor-pointer"
              title="Green Button (F2): Bank / Submit Score"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Bank/OK
            </button>
            <button
              type="button"
              data-tv-compact="true"
              onClick={() => triggerColorShortcut('red')}
              className="flex items-center gap-1 px-2 py-0.5 bg-red-950/80 hover:bg-red-900 border border-red-700/60 rounded text-[10px] font-bold text-red-300 cursor-pointer"
              title="Red Button (F1): Farkle / Euchred"
            >
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Farkle/Set
            </button>
            <button
              type="button"
              data-tv-compact="true"
              onClick={() => triggerColorShortcut('yellow')}
              className="flex items-center gap-1 px-2 py-0.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 rounded text-[10px] font-bold text-amber-300 cursor-pointer"
              title="Yellow Button (F3): Undo Last Score"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Undo
            </button>
            <button
              type="button"
              data-tv-compact="true"
              onClick={() => triggerColorShortcut('blue')}
              className="flex items-center gap-1 px-2 py-0.5 bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 rounded text-[10px] font-bold text-sky-300 cursor-pointer"
              title="Blue Button (F4): House Rules"
            >
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Rules
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          <button
            type="button"
            data-tv-compact="true"
            onClick={openTvKeypadForActiveInput}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition-colors border border-slate-700 cursor-pointer font-bold text-[11px]"
            title="Open On-Screen TV Number Pad / Keyboard"
          >
            <Hash className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">123 Keypad</span>
          </button>

          <button
            type="button"
            data-tv-compact="true"
            onClick={() => setShowVirtualRemote(!showVirtualRemote)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors border cursor-pointer font-bold text-[11px] ${
              showVirtualRemote
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Toggle On-Screen Virtual TV Remote Controller"
          >
            <Gamepad className="w-3.5 h-3.5" />
            <span>{showVirtualRemote ? 'Hide Remote' : 'TV Remote'}</span>
          </button>

          <button
            type="button"
            data-tv-compact="true"
            onClick={() => setShowTvGuide(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700 cursor-pointer font-bold text-[11px]"
            title="Android TV Remote Shortcuts Guide"
          >
            <span>Guide</span>
          </button>

          <button
            type="button"
            data-tv-compact="true"
            onClick={toggleTvMode}
            className="flex items-center gap-1 px-2.5 py-1 bg-red-950/70 hover:bg-red-900/90 text-red-300 hover:text-red-100 rounded-lg transition-colors border border-red-800/60 cursor-pointer font-bold text-[11px]"
            title="Exit Android TV Mode"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit TV</span>
          </button>
        </div>
      </div>

      {/* Floating On-Screen Virtual Android TV Remote Controller */}
      <AnimatePresence>
        {showVirtualRemote && (
          <motion.div
            data-tv-remote-widget="true"
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            className="fixed bottom-14 right-3 sm:right-5 z-40 w-48 bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-slate-700/90 rounded-[32px] p-3.5 shadow-2xl text-slate-100 select-none"
          >
            {/* Remote Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  TV Remote
                </span>
              </div>
              <button
                type="button"
                data-tv-compact="true"
                onClick={() => setShowVirtualRemote(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                title="Minimize Remote"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Top Utility Buttons: Home & Back & Keypad */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <button
                type="button"
                data-tv-compact="true"
                onClick={triggerBack}
                className="py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-300 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
                title="Back / Return (ESC)"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span className="text-[8px] font-black uppercase">Back</span>
              </button>
              <button
                type="button"
                data-tv-compact="true"
                onClick={triggerHome}
                className="py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
                title="Lobby / Home"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="text-[8px] font-black uppercase">Home</span>
              </button>
              <button
                type="button"
                data-tv-compact="true"
                onClick={openTvKeypadForActiveInput}
                className="py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-300 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
                title="On-Screen Number Pad"
              >
                <Hash className="w-3.5 h-3.5" />
                <span className="text-[8px] font-black uppercase">123</span>
              </button>
            </div>

            {/* Circular D-Pad Navigation Ring */}
            <div className="relative w-36 h-36 mx-auto my-2 bg-slate-900 rounded-full border-2 border-slate-700/90 shadow-inner flex items-center justify-center">
              {/* UP */}
              <button
                type="button"
                data-tv-compact="true"
                onClick={() => navigateSpatial('up')}
                className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-10 flex items-center justify-center text-slate-300 hover:text-amber-400 active:scale-90 cursor-pointer rounded-t-full transition-all"
                title="D-Pad Up"
              >
                <ChevronUp className="w-6 h-6 stroke-[2.5]" />
              </button>

              {/* DOWN */}
              <button
                type="button"
                data-tv-compact="true"
                onClick={() => navigateSpatial('down')}
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-10 flex items-center justify-center text-slate-300 hover:text-amber-400 active:scale-90 cursor-pointer rounded-b-full transition-all"
                title="D-Pad Down"
              >
                <ChevronDown className="w-6 h-6 stroke-[2.5]" />
              </button>

              {/* LEFT */}
              <button
                type="button"
                data-tv-compact="true"
                onClick={() => navigateSpatial('left')}
                className="absolute left-1 top-1/2 -translate-y-1/2 w-10 h-12 flex items-center justify-center text-slate-300 hover:text-amber-400 active:scale-90 cursor-pointer rounded-l-full transition-all"
                title="D-Pad Left"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>

              {/* RIGHT */}
              <button
                type="button"
                data-tv-compact="true"
                onClick={() => navigateSpatial('right')}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-12 flex items-center justify-center text-slate-300 hover:text-amber-400 active:scale-90 cursor-pointer rounded-r-full transition-all"
                title="D-Pad Right"
              >
                <ChevronRight className="w-6 h-6 stroke-[2.5]" />
              </button>

              {/* CENTER OK BUTTON */}
              <button
                type="button"
                data-tv-compact="true"
                onClick={triggerSelect}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg border-2 border-amber-300/60 flex items-center justify-center cursor-pointer transition-all"
                title="D-Pad Center OK / Select"
              >
                OK
              </button>
            </div>

            {/* 4 Color Shortcut Buttons (Red, Green, Yellow, Blue) */}
            <div className="mt-3 pt-2.5 border-t border-slate-800">
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  data-tv-compact="true"
                  onClick={() => triggerColorShortcut('red')}
                  className="py-1.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-lg font-black text-[8px] uppercase tracking-tighter text-center shadow-xs cursor-pointer"
                  title="Red Button (F1): Farkle / Euchred"
                >
                  Farkle
                </button>
                <button
                  type="button"
                  data-tv-compact="true"
                  onClick={() => triggerColorShortcut('green')}
                  className="py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg font-black text-[8px] uppercase tracking-tighter text-center shadow-xs cursor-pointer"
                  title="Green Button (F2): Bank / Score"
                >
                  Bank
                </button>
                <button
                  type="button"
                  data-tv-compact="true"
                  onClick={() => triggerColorShortcut('yellow')}
                  className="py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-lg font-black text-[8px] uppercase tracking-tighter text-center shadow-xs cursor-pointer"
                  title="Yellow Button (F3): Undo"
                >
                  Undo
                </button>
                <button
                  type="button"
                  data-tv-compact="true"
                  onClick={() => triggerColorShortcut('blue')}
                  className="py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white rounded-lg font-black text-[8px] uppercase tracking-tighter text-center shadow-xs cursor-pointer"
                  title="Blue Button (F4): Rules"
                >
                  Rules
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ON-SCREEN TV NUMBER PAD & VIRTUAL KEYBOARD MODAL */}
      <AnimatePresence>
        {tvKeypadTarget && (
          <div
            data-tv-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 max-w-md w-full text-slate-100 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                    <Hash className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      {tvKeypadTarget.label}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Use D-Pad &amp; OK to enter value with your TV Remote
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-tv-close="true"
                  onClick={closeTvKeypad}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Display Screen */}
              <div className="bg-slate-950 border-2 border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between">
                <span className="font-mono text-2xl font-black text-amber-300 truncate">
                  {keypadValue || (tvKeypadTarget.inputType === 'number' ? '0' : 'Type or pick name...')}
                </span>
                <button
                  type="button"
                  onClick={() => setKeypadValue('')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Clear
                </button>
              </div>

              {tvKeypadTarget.inputType === 'number' ? (
                <>
                  {/* Number Pad Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map(digit => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => setKeypadValue(prev => (prev === '0' ? digit : prev + digit))}
                        className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-mono font-black text-lg rounded-xl border border-slate-700 cursor-pointer"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setKeypadValue(prev => prev.slice(0, -1))}
                      className="py-3 bg-slate-800 hover:bg-red-950/60 text-amber-300 font-bold text-sm rounded-xl border border-slate-700 flex items-center justify-center cursor-pointer"
                      title="Backspace"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quick Score Presets */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[50, 100, 250, 500].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setKeypadValue(prev => String((parseInt(prev, 10) || 0) + preset))
                        }
                        className="py-2 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-mono font-black text-xs rounded-xl cursor-pointer"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Quick Player Names for TV Remote */}
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Quick Select Name:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_PLAYER_NAMES.map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setKeypadValue(name)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs rounded-lg border border-slate-700 cursor-pointer"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* On-Screen Letter Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {LETTER_KEYS.map(ch => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() =>
                          setKeypadValue(prev =>
                            prev.length === 0 ? ch : prev + ch.toLowerCase()
                          )
                        }
                        className="py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-xs rounded-lg border border-slate-700 cursor-pointer"
                      >
                        {ch === ' ' ? 'SPC' : ch}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setKeypadValue(prev => prev.slice(0, -1))}
                      className="py-2 bg-slate-800 hover:bg-red-900 text-amber-300 font-bold text-xs rounded-lg border border-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}

              {/* Confirm / Submit Actions */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => applyTvKeypadValue(keypadValue, false)}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl text-xs uppercase tracking-wider border border-slate-700 cursor-pointer"
                >
                  Set Value
                </button>
                <button
                  type="button"
                  onClick={() => applyTvKeypadValue(keypadValue, true)}
                  className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Enter &amp; Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TV D-Pad Guide Modal */}
      <AnimatePresence>
        {showTvGuide && (
          <div
            data-tv-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 md:p-8 max-w-lg w-full text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                data-tv-close="true"
                onClick={() => setShowTvGuide(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <Tv className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-wide">
                    Android TV Remote Control
                  </h3>
                  <p className="text-xs text-slate-400">
                    Leanback D-Pad, Color Buttons &amp; Gamepad Navigation
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 my-5 text-sm">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center gap-3">
                  <span className="w-11 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black flex items-center justify-center text-sm shrink-0">
                    ▲▼◄►
                  </span>
                  <div>
                    <div className="font-bold text-white">D-Pad Directional Keys</div>
                    <div className="text-xs text-slate-400">
                      Move spatial focus across game cards, scorecard cells, and buttons
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center gap-3">
                  <span className="w-11 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black flex items-center justify-center text-sm shrink-0">
                    OK
                  </span>
                  <div>
                    <div className="font-bold text-white">Center / Select Button</div>
                    <div className="text-xs text-slate-400">
                      Press any button, score a Yahtzee category, or open the TV Keypad on inputs
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center gap-3">
                  <span className="w-11 h-10 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono font-black flex items-center justify-center text-xs shrink-0">
                    BACK
                  </span>
                  <div>
                    <div className="font-bold text-white">Back / Return Button</div>
                    <div className="text-xs text-slate-400">
                      Close open dialogs/modals or open the Exit Game menu
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
                  <div className="font-bold text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Remote Color &amp; Controller Shortcuts
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-slate-300">
                        <strong className="text-white">Green / F2:</strong> Bank / Score Hand
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                      <span className="text-slate-300">
                        <strong className="text-white">Red / F1:</strong> Farkle! / Euchred!
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-slate-300">
                        <strong className="text-white">Yellow / F3:</strong> Undo Last Score
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-sky-400 shrink-0" />
                      <span className="text-slate-300">
                        <strong className="text-white">Blue / F4:</strong> House Rules
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTvGuide(false)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-xl transition-all cursor-pointer shadow-lg text-center uppercase tracking-wide text-sm"
              >
                Got It (Press OK)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
