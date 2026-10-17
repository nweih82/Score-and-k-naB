import React, { useState } from 'react';
import { COLOR_THEMES, ColorTheme } from '../theme';
import { Palette, Check, X, Moon, Sun, Sparkles, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ScorecardLivePreview from './ScorecardLivePreview';

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
  const [hoveredThemeId, setHoveredThemeId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Active previewed theme: hovered theme takes precedence over currently selected theme
  const previewThemeId = hoveredThemeId || currentColorTheme;
  const previewTheme =
    COLOR_THEMES.find((t) => t.id === previewThemeId) || COLOR_THEMES[0];
  const isHoveringDifferentTheme =
    Boolean(hoveredThemeId && hoveredThemeId !== currentColorTheme);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[36px] border-2 border-orange-100 dark:border-slate-800 p-5 sm:p-7 max-w-5xl w-full shadow-2xl relative overflow-hidden max-h-[92vh] max-h-[92dvh] overflow-y-auto my-auto flex flex-col"
        >
          {/* MODAL HEADER */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-2xl text-white shadow-xs transition-colors duration-300"
                style={{
                  backgroundColor: previewTheme[isDarkMode ? 'dark' : 'light'].btnBg,
                }}
              >
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Color Themes & Table Atmosphere
                  </h3>
                  {isHoveringDifferentTheme && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 animate-pulse">
                      <Sparkles className="w-3 h-3" /> Hovering: {previewTheme.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Hover over any color theme to preview how the scorecard UI looks live
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors cursor-pointer"
              title="Close theme selector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MAIN 2-COLUMN LAYOUT: THEMES ON LEFT, LIVE SCORECARD PREVIEW ON RIGHT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 flex-1 items-start">
            {/* LEFT COLUMN: Controls & Theme Selection Cards */}
            <div className="lg:col-span-6 space-y-4">
              {/* Day / Night Mode Toggle Bar */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Moon className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                  )}
                  <div>
                    <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                      {isDarkMode ? 'Dark Night Table' : 'Bright Daylight Table'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Preview themes in light or low-light conditions
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                    isDarkMode
                      ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>

              {/* Theme Selection Section Title */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Available Color Palettes ({COLOR_THEMES.length})</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium italic">
                  Hover to preview • Click to apply
                </span>
              </div>

              {/* Color Themes Grid */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                onMouseLeave={() => setHoveredThemeId(null)}
              >
                {COLOR_THEMES.map((theme: ColorTheme) => {
                  const isSelected = currentColorTheme === theme.id;
                  const isHovered = hoveredThemeId === theme.id;

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onSelectColorTheme(theme.id)}
                      onMouseEnter={() => setHoveredThemeId(theme.id)}
                      onFocus={() => setHoveredThemeId(theme.id)}
                      onBlur={() => setHoveredThemeId(null)}
                      className={`p-3.5 rounded-2xl text-left transition-all duration-200 cursor-pointer border-2 relative flex flex-col justify-between min-h-[114px] group select-none ${
                        isSelected
                          ? 'border-amber-500 dark:border-amber-400 bg-amber-50/50 dark:bg-amber-950/25 shadow-md ring-2 ring-amber-400/30'
                          : isHovered
                          ? 'border-slate-400 dark:border-slate-600 bg-slate-50/90 dark:bg-slate-800/80 shadow-md scale-[1.01]'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate">
                              {theme.name}
                            </span>
                            {isHovered && !isSelected && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 animate-pulse">
                                Previewing
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-snug line-clamp-2">
                            {theme.description}
                          </p>
                        </div>

                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : isHovered ? (
                          <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                            <Sparkles className="w-3 h-3" />
                          </div>
                        ) : null}
                      </div>

                      {/* Gradient Swatch Preview Bar */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`h-2.5 w-14 rounded-full bg-gradient-to-r ${theme.previewGradient} shadow-2xs`}
                          />
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">
                            Palette
                          </span>
                        </div>

                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-2xs"
                          style={{ backgroundColor: theme.primaryColor }}
                          title={`Primary accent: ${theme.primaryColor}`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Done & Apply button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-teal-900 hover:bg-teal-950 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Done & Apply Theme
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Scorecard UI Preview */}
            <div className="lg:col-span-6 lg:sticky lg:top-0 space-y-3">
              <div className="hidden lg:flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Live Preview Output
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  Interactive Scorecard Mock
                </span>
              </div>

              <ScorecardLivePreview
                theme={previewTheme}
                isDarkMode={isDarkMode}
                isHovering={isHoveringDifferentTheme}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
