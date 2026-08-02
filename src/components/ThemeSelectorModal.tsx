import React from 'react';
import { COLOR_THEMES, ColorTheme } from '../theme';
import { Palette, Check, X, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColorTheme: string;
  onSelectColorTheme: (themeId: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function ThemeSelectorModal({
  isOpen,
  onClose,
  currentColorTheme,
  onSelectColorTheme,
  isDarkMode,
  onToggleDarkMode,
}: ThemeSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          className="bg-white dark:bg-slate-900 rounded-[32px] border-2 border-orange-100 dark:border-slate-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-orange-100 dark:bg-slate-800 rounded-2xl text-orange-600 dark:text-amber-400">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Choose Color Theme
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Customize the visual atmosphere of your game table
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dark Mode Toggle Bar */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <Moon className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500 fill-amber-500/20" />
              )}
              <div>
                <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                  {isDarkMode ? 'Dark Night Mode' : 'Bright Day Mode'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Toggle contrast preference for low light
                </p>
              </div>
            </div>

            <button
              onClick={onToggleDarkMode}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                isDarkMode
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          {/* Color Themes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {COLOR_THEMES.map((theme: ColorTheme) => {
              const isSelected = currentColorTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => onSelectColorTheme(theme.id)}
                  className={`p-4 rounded-2xl text-left transition-all cursor-pointer border-2 relative flex flex-col justify-between min-h-[110px] group ${
                    isSelected
                      ? 'border-amber-500 dark:border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-400/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                          {theme.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-snug">
                        {theme.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Gradient Swatch Preview */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-3 w-16 rounded-full bg-gradient-to-r ${theme.previewGradient} shadow-xs`} />
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                        Theme
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-3 bg-teal-900 hover:bg-teal-950 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-colors cursor-pointer shadow-md"
            >
              Done & Apply Theme
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
