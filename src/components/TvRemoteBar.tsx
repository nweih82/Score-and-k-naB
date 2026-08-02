import React from 'react';
import { useTv } from '../lib/TvContext';
import { Tv, Move, CheckSquare, CornerDownLeft, X, HelpCircle, Gamepad } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TvRemoteBar: React.FC = () => {
  const { isTvMode, toggleTvMode, showTvGuide, setShowTvGuide } = useTv();

  if (!isTvMode) return null;

  return (
    <>
      {/* Bottom Sticky TV Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/80 text-slate-200 px-4 py-2 flex items-center justify-between text-xs shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded border border-emerald-500/30">
            <Tv className="w-3.5 h-3.5" />
            <span>TV MODE</span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1 font-medium">
              <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono font-bold text-amber-400">▲▼◄►</span>
              Navigate
            </span>

            <span className="flex items-center gap-1 font-medium">
              <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono font-bold text-emerald-400">OK</span>
              Select
            </span>

            <span className="flex items-center gap-1 font-medium">
              <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono font-bold text-sky-400">BACK</span>
              Cancel/Close
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTvGuide(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700 cursor-pointer font-bold text-[11px]"
            title="Android TV Remote Guide"
          >
            <Gamepad className="w-3.5 h-3.5 text-amber-400" />
            <span>TV Remote Guide</span>
          </button>

          <button
            onClick={toggleTvMode}
            className="flex items-center gap-1 px-2.5 py-1 bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-red-100 rounded-lg transition-colors border border-red-800/60 cursor-pointer font-bold text-[11px]"
            title="Exit Android TV Mode"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit TV Mode</span>
          </button>
        </div>
      </div>

      {/* TV D-Pad Guide Modal */}
      <AnimatePresence>
        {showTvGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 md:p-8 max-w-lg w-full text-slate-100 shadow-2xl relative"
            >
              <button
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
                  <h3 className="text-xl font-black text-white uppercase tracking-wide">Android TV Remote Support</h3>
                  <p className="text-xs text-slate-400">Leanback D-Pad & Keyboard Navigation Active</p>
                </div>
              </div>

              <div className="space-y-3 my-6 text-sm">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black flex items-center justify-center text-base">
                      ▲▼◄►
                    </span>
                    <div>
                      <div className="font-bold text-white">D-Pad Directional Keys</div>
                      <div className="text-xs text-slate-400">Move spatial focus seamlessly between buttons & scores</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black flex items-center justify-center text-sm">
                      OK
                    </span>
                    <div>
                      <div className="font-bold text-white">Center / Select Button</div>
                      <div className="text-xs text-slate-400">Bank scores, select categories, or start games</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono font-black flex items-center justify-center text-xs">
                      ESC
                    </span>
                    <div>
                      <div className="font-bold text-white">Back Button / Escape</div>
                      <div className="text-xs text-slate-400">Dismiss dialogs, edit scores, or return to selector</div>
                    </div>
                  </div>
                </div>
              </div>

              <button
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
