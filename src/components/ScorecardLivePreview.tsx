import React, { useState } from 'react';
import { ColorTheme } from '../theme';
import { Sparkles, Trophy, Dices, User, CheckCircle2, Flame, Eye } from 'lucide-react';
import { motion } from 'motion/react';

interface ScorecardLivePreviewProps {
  theme: ColorTheme;
  isDarkMode: boolean;
  isHovering: boolean;
}

export default function ScorecardLivePreview({
  theme,
  isDarkMode,
  isHovering,
}: ScorecardLivePreviewProps) {
  const [activePlayer, setActivePlayer] = useState<'alice' | 'bob'>('alice');
  const tokens = isDarkMode ? theme.dark : theme.light;

  return (
    <div
      data-preview-theme={theme.id}
      className={`rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col shadow-lg ${
        isDarkMode
          ? 'bg-slate-900/90 border-slate-700/80'
          : 'bg-white/95 border-slate-200'
      }`}
      style={
        {
          '--theme-accent-color': tokens.accentColor,
          '--yz-card-bg': tokens.cardBg,
          '--yz-card-border': tokens.cardBorder,
          '--yz-section-bg': tokens.sectionBg,
          '--yz-section-text': tokens.sectionText,
          '--yz-table-header-bg': tokens.tableHeaderBg,
          '--yz-table-header-text': tokens.tableHeaderText,
          '--yz-active-col-bg': tokens.activeColBg,
          '--yz-active-col-border': tokens.activeColBorder,
          '--yz-grand-total-bg': tokens.grandTotalBg,
          '--yz-grand-total-text': tokens.grandTotalText,
          '--yz-primary-text': tokens.primaryText,
          '--yz-muted-text': tokens.mutedText,
          '--yz-btn-bg': tokens.btnBg,
          '--yz-btn-hover': tokens.btnHover,
        } as React.CSSProperties
      }
    >
      {/* PREVIEW TOP BAR */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block transition-colors duration-300"
              style={{ backgroundColor: tokens.accentColor }}
            />
            {isHovering && (
              <span
                className="w-2.5 h-2.5 rounded-full absolute animate-ping opacity-75"
                style={{ backgroundColor: tokens.accentColor }}
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">
                Scorecard UI Preview
              </span>
              <span
                className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white transition-colors duration-300"
                style={{ backgroundColor: tokens.accentColor }}
              >
                {theme.name}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {isHovering
                ? '✨ Live preview of hovered theme'
                : 'Showing your currently selected theme'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
          <Eye className="w-3 h-3 text-slate-400" />
          <span>{isDarkMode ? 'Night' : 'Day'}</span>
        </div>
      </div>

      {/* TABLETOP CONTAINER */}
      <div
        className="p-3.5 sm:p-4 transition-colors duration-300 flex-1 flex flex-col justify-between"
        style={{ backgroundColor: tokens.tableBg }}
      >
        {/* SCORECARD CARD */}
        <motion.div
          key={`${theme.id}-${isDarkMode ? 'dark' : 'light'}`}
          initial={{ opacity: 0.85, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border-2 shadow-sm overflow-hidden transition-all duration-300"
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: tokens.cardBorder,
          }}
        >
          {/* SCORECARD HEADER */}
          <div
            className="px-3.5 py-2.5 border-b flex items-center justify-between"
            style={{
              backgroundColor: tokens.sectionBg,
              borderColor: tokens.cardBorder,
              color: tokens.sectionText,
            }}
          >
            <div className="flex items-center gap-2">
              <Dices
                className="w-4 h-4 transition-colors"
                style={{ color: tokens.accentColor }}
              />
              <span className="text-xs font-black uppercase tracking-wider">
                Yahtzee Scorecard
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white shadow-2xs"
                style={{ backgroundColor: tokens.accentColor }}
              >
                Round 8 / 13
              </span>
            </div>
          </div>

          {/* SCORECARD TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className="border-b transition-colors"
                  style={{
                    backgroundColor: tokens.tableHeaderBg,
                    borderColor: tokens.cardBorder,
                    color: tokens.tableHeaderText,
                  }}
                >
                  <th className="py-2 px-3 text-[10px] font-black uppercase tracking-wider w-[42%]">
                    Category
                  </th>
                  {/* Alice (Player 1) */}
                  <th
                    onClick={() => setActivePlayer('alice')}
                    className={`py-2 px-2.5 text-center cursor-pointer transition-all select-none w-[29%] ${
                      activePlayer === 'alice' ? 'relative' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={
                      activePlayer === 'alice'
                        ? {
                            backgroundColor: tokens.activeColBg,
                            borderLeft: `2px solid ${tokens.activeColBorder}`,
                            borderRight: `2px solid ${tokens.activeColBorder}`,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-[9px] text-white font-black flex items-center justify-center">
                        A
                      </span>
                      <span
                        className="font-black text-[11px] uppercase truncate"
                        style={{ color: tokens.primaryText }}
                      >
                        Alice
                      </span>
                      {activePlayer === 'alice' && (
                        <span
                          className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full text-white"
                          style={{ backgroundColor: tokens.accentColor }}
                        >
                          Turn
                        </span>
                      )}
                    </div>
                  </th>
                  {/* Bob (Player 2) */}
                  <th
                    onClick={() => setActivePlayer('bob')}
                    className={`py-2 px-2.5 text-center cursor-pointer transition-all select-none w-[29%] ${
                      activePlayer === 'bob' ? 'relative' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={
                      activePlayer === 'bob'
                        ? {
                            backgroundColor: tokens.activeColBg,
                            borderLeft: `2px solid ${tokens.activeColBorder}`,
                            borderRight: `2px solid ${tokens.activeColBorder}`,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-indigo-500 text-[9px] text-white font-black flex items-center justify-center">
                        B
                      </span>
                      <span
                        className="font-black text-[11px] uppercase truncate"
                        style={{ color: tokens.primaryText }}
                      >
                        Bob
                      </span>
                      {activePlayer === 'bob' && (
                        <span
                          className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full text-white"
                          style={{ backgroundColor: tokens.accentColor }}
                        >
                          Turn
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y" style={{ borderColor: tokens.cardBorder }}>
                {/* Upper Section Header */}
                <tr
                  className="text-[9px] font-black uppercase tracking-wider"
                  style={{
                    backgroundColor: tokens.sectionBg,
                    color: tokens.sectionText,
                  }}
                >
                  <td colSpan={3} className="py-1 px-3">
                    Upper Section
                  </td>
                </tr>

                {/* Aces */}
                <tr className="hover:opacity-90">
                  <td className="py-1.5 px-3 font-semibold" style={{ color: tokens.primaryText }}>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs opacity-75">⚀</span> Aces
                    </span>
                  </td>
                  <td
                    className="py-1.5 px-2.5 text-center font-mono font-black"
                    style={{
                      color: tokens.primaryText,
                      backgroundColor:
                        activePlayer === 'alice' ? tokens.activeColBg : undefined,
                      borderLeft:
                        activePlayer === 'alice'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                      borderRight:
                        activePlayer === 'alice'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                    }}
                  >
                    3
                  </td>
                  <td
                    className="py-1.5 px-2.5 text-center font-mono font-black"
                    style={{
                      color: tokens.primaryText,
                      backgroundColor:
                        activePlayer === 'bob' ? tokens.activeColBg : undefined,
                      borderLeft:
                        activePlayer === 'bob'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                      borderRight:
                        activePlayer === 'bob'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                    }}
                  >
                    4
                  </td>
                </tr>

                {/* Sixes */}
                <tr className="hover:opacity-90">
                  <td className="py-1.5 px-3 font-semibold" style={{ color: tokens.primaryText }}>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs opacity-75">⚅</span> Sixes
                    </span>
                  </td>
                  <td
                    className="py-1.5 px-2.5 text-center font-mono font-black"
                    style={{
                      color: tokens.primaryText,
                      backgroundColor:
                        activePlayer === 'alice' ? tokens.activeColBg : undefined,
                      borderLeft:
                        activePlayer === 'alice'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                      borderRight:
                        activePlayer === 'alice'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                    }}
                  >
                    24
                  </td>
                  <td
                    className="py-1.5 px-2.5 text-center font-mono font-black"
                    style={{
                      color: tokens.primaryText,
                      backgroundColor:
                        activePlayer === 'bob' ? tokens.activeColBg : undefined,
                      borderLeft:
                        activePlayer === 'bob'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                      borderRight:
                        activePlayer === 'bob'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                    }}
                  >
                    18
                  </td>
                </tr>

                {/* Upper Bonus Row */}
                <tr
                  className="font-bold text-[10px]"
                  style={{
                    backgroundColor: tokens.sectionBg,
                    color: tokens.sectionText,
                  }}
                >
                  <td className="py-1.5 px-3">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Upper Bonus (+35)
                    </span>
                  </td>
                  <td
                    className="py-1.5 px-2.5 text-center font-mono font-black"
                    style={{
                      backgroundColor:
                        activePlayer === 'alice' ? tokens.activeColBg : undefined,
                      borderLeft:
                        activePlayer === 'alice'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                      borderRight:
                        activePlayer === 'alice'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                    }}
                  >
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-black text-white"
                      style={{ backgroundColor: tokens.accentColor }}
                    >
                      +35
                    </span>
                  </td>
                  <td
                    className="py-1.5 px-2.5 text-center font-mono font-black opacity-60"
                    style={{
                      backgroundColor:
                        activePlayer === 'bob' ? tokens.activeColBg : undefined,
                      borderLeft:
                        activePlayer === 'bob'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                      borderRight:
                        activePlayer === 'bob'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                    }}
                  >
                    0
                  </td>
                </tr>

                {/* Lower Section Header */}
                <tr
                  className="text-[9px] font-black uppercase tracking-wider"
                  style={{
                    backgroundColor: tokens.sectionBg,
                    color: tokens.sectionText,
                  }}
                >
                  <td colSpan={3} className="py-1 px-3">
                    Lower Section
                  </td>
                </tr>

                {/* Full House */}
                <tr className="hover:opacity-90">
                  <td className="py-1.5 px-3 font-semibold" style={{ color: tokens.primaryText }}>
                    Full House (25)
                  </td>
                  <td
                    className="py-1.5 px-2.5 text-center font-mono font-black"
                    style={{
                      color: tokens.primaryText,
                      backgroundColor:
                        activePlayer === 'alice' ? tokens.activeColBg : undefined,
                      borderLeft:
                        activePlayer === 'alice'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                      borderRight:
                        activePlayer === 'alice'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                    }}
                  >
                    25
                  </td>
                  <td
                    className="py-1.5 px-2.5 text-center font-mono font-black"
                    style={{
                      color: tokens.primaryText,
                      backgroundColor:
                        activePlayer === 'bob' ? tokens.activeColBg : undefined,
                      borderLeft:
                        activePlayer === 'bob'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                      borderRight:
                        activePlayer === 'bob'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                    }}
                  >
                    25
                  </td>
                </tr>

                {/* Yahtzee (50) */}
                <tr className="hover:opacity-90">
                  <td className="py-1.5 px-3 font-semibold" style={{ color: tokens.primaryText }}>
                    <span className="flex items-center gap-1 font-bold">
                      <Flame className="w-3 h-3 text-amber-500 fill-amber-400" /> Yahtzee (50)
                    </span>
                  </td>
                  <td
                    className="py-1.5 px-2.5 text-center font-mono font-black"
                    style={{
                      color: tokens.primaryText,
                      backgroundColor:
                        activePlayer === 'alice' ? tokens.activeColBg : undefined,
                      borderLeft:
                        activePlayer === 'alice'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                      borderRight:
                        activePlayer === 'alice'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                    }}
                  >
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-black text-white"
                      style={{ backgroundColor: tokens.accentColor }}
                    >
                      50
                    </span>
                  </td>
                  <td
                    className="py-1.5 px-2.5 text-center font-mono font-bold opacity-40"
                    style={{
                      color: tokens.mutedText,
                      backgroundColor:
                        activePlayer === 'bob' ? tokens.activeColBg : undefined,
                      borderLeft:
                        activePlayer === 'bob'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                      borderRight:
                        activePlayer === 'bob'
                          ? `2px solid ${tokens.activeColBorder}`
                          : undefined,
                    }}
                  >
                    --
                  </td>
                </tr>

                {/* GRAND TOTAL ROW */}
                <tr
                  className="font-black text-xs transition-colors duration-300 shadow-sm"
                  style={{
                    backgroundColor: tokens.grandTotalBg,
                    color: tokens.grandTotalText,
                  }}
                >
                  <td className="py-2 px-3 uppercase tracking-wider flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    Grand Total
                  </td>
                  <td className="py-2 px-2.5 text-center font-mono text-sm tracking-tight font-black">
                    198 <span className="text-[9px] font-bold opacity-85">pts</span>
                  </td>
                  <td className="py-2 px-2.5 text-center font-mono text-sm tracking-tight font-black opacity-90">
                    151 <span className="text-[9px] font-bold opacity-85">pts</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* INTERACTIVE DICE / ACTION BAR MINIATURE */}
        <div
          className="mt-3 p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-all duration-300"
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: tokens.cardBorder,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
              Dice Kept:
            </span>
            <div className="flex items-center gap-1 font-mono text-xs font-black">
              <span
                className="w-6 h-6 rounded-lg text-white flex items-center justify-center shadow-xs"
                style={{ backgroundColor: tokens.btnBg }}
              >
                ⚅
              </span>
              <span
                className="w-6 h-6 rounded-lg text-white flex items-center justify-center shadow-xs"
                style={{ backgroundColor: tokens.btnBg }}
              >
                ⚅
              </span>
              <span
                className="w-6 h-6 rounded-lg text-white flex items-center justify-center shadow-xs"
                style={{ backgroundColor: tokens.btnBg }}
              >
                ⚅
              </span>
              <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center">
                ⚄
              </span>
              <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center">
                ⚂
              </span>
            </div>
          </div>

          <button
            type="button"
            className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-white shadow-xs transition-opacity hover:opacity-90 cursor-pointer shrink-0"
            style={{ backgroundColor: tokens.btnBg }}
          >
            Roll Again (2)
          </button>
        </div>

        {/* COLOR PALETTE SWATCH PILLS */}
        <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-bold uppercase tracking-wider">
            Palette Tokens:
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-full shadow-2xs border border-white/30"
              style={{ backgroundColor: tokens.accentColor }}
              title="Accent Color"
            />
            <div
              className="w-4 h-4 rounded-full shadow-2xs border border-white/30"
              style={{ backgroundColor: tokens.tableHeaderBg }}
              title="Header Tint"
            />
            <div
              className="w-4 h-4 rounded-full shadow-2xs border border-white/30"
              style={{ backgroundColor: tokens.activeColBg }}
              title="Active Column"
            />
            <div
              className="w-4 h-4 rounded-full shadow-2xs border border-white/30"
              style={{ backgroundColor: tokens.grandTotalBg }}
              title="Grand Total Banner"
            />
            <div
              className="w-4 h-4 rounded-full shadow-2xs border border-white/30"
              style={{ backgroundColor: tokens.tableBg }}
              title="Table Background"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
