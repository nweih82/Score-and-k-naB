import React, { useState } from 'react';
import { Trophy, Award, Flame, Sparkles, Dices, Calendar, Crown, Medal, Globe, ShieldCheck } from 'lucide-react';
import { GameType, GameHistoryEntry, HighScoreRecord } from '../types';
import { motion } from 'motion/react';

interface HallOfFameProps {
  gameHistory: GameHistoryEntry[];
  globalRecords?: HighScoreRecord[];
}

export const HallOfFame: React.FC<HallOfFameProps> = ({ gameHistory, globalRecords = [] }) => {
  const [filterGame, setFilterGame] = useState<GameType | 'all'>('all');

  // Extract all individual player high scores from gameHistory
  const localRecords: HighScoreRecord[] = [];
  gameHistory.forEach(entry => {
    Object.entries(entry.scores || {}).forEach(([playerId, score]) => {
      const playerObj = entry.players.find(p => p.id === playerId);
      const name = playerObj?.name || 'Player';
      localRecords.push({
        id: `local-${entry.id}-${playerId}`,
        playerName: name,
        playerAvatar: playerObj?.avatar || '🎲',
        playerColor: playerObj?.color || 'bg-emerald-500',
        score: Number(score) || 0,
        gameType: entry.gameType,
        date: entry.date,
        isWinner: entry.winner === name,
      });
    });
  });

  // Combine local records and global records, deduplicating by ID or exact match
  const recordMap = new Map<string, HighScoreRecord>();
  [...localRecords, ...globalRecords].forEach(rec => {
    const key = `${rec.playerName.toLowerCase()}-${rec.gameType}-${rec.score}-${rec.date}`;
    if (!recordMap.has(key)) {
      recordMap.set(key, rec);
    }
  });

  const allRecords = Array.from(recordMap.values());

  // Helper to get top 5 for a specific game type
  const getTop5ForType = (type: GameType) => {
    return allRecords
      .filter(r => r.gameType === type)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  };

  const farkleTop5 = getTop5ForType('farkle');
  const yahtzeeTop5 = getTop5ForType('yahtzee');
  const dominoesTop5 = getTop5ForType('dominoes');

  // Currently displayed top 5 records based on selected filter
  const displayedRecords = filterGame === 'all'
    ? allRecords.sort((a, b) => b.score - a.score).slice(0, 5)
    : getTop5ForType(filterGame);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-amber-950 flex items-center justify-center font-black shadow-md border-2 border-amber-200 shrink-0">
            <Crown className="w-5 h-5 fill-current" />
          </div>
        );
      case 1:
        return (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-800 flex items-center justify-center font-black shadow-sm border-2 border-slate-100 shrink-0">
            <Medal className="w-5 h-5 fill-current text-slate-700" />
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-amber-100 flex items-center justify-center font-black shadow-sm border-2 border-amber-500 shrink-0">
            <Award className="w-5 h-5 fill-current text-amber-300" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-black text-sm border border-slate-200 dark:border-slate-700 shrink-0">
            #{index + 1}
          </div>
        );
    }
  };

  const getGameLabel = (type: GameType) => {
    switch (type) {
      case 'farkle':
        return { name: 'Farkle', icon: <Flame className="w-3.5 h-3.5 text-orange-400" />, bg: 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400' };
      case 'yahtzee':
        return { name: 'Yahtzee', icon: <Sparkles className="w-3.5 h-3.5 text-teal-400" />, bg: 'bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400' };
      case 'dominoes':
        return { name: 'Dominoes', icon: <Dices className="w-3.5 h-3.5 text-pink-400" />, bg: 'bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400' };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] border-2 border-amber-200/60 dark:border-slate-800 p-6 shadow-md space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl border border-amber-400/30 text-amber-600 dark:text-amber-400">
            <Trophy className="w-6 h-6 fill-amber-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Global Hall of Fame
              </h3>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase rounded-full flex items-center gap-1">
                <Globe className="w-3 h-3 text-emerald-500 animate-pulse" />
                Live High Scores
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Top 5 highest individual player records across all game sessions
            </p>
          </div>
        </div>

        {/* Filter Pill Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterGame('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              filterGame === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Games
          </button>
          <button
            onClick={() => setFilterGame('farkle')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              filterGame === 'farkle'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Farkle
          </button>
          <button
            onClick={() => setFilterGame('yahtzee')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              filterGame === 'yahtzee'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Yahtzee
          </button>
          <button
            onClick={() => setFilterGame('dominoes')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              filterGame === 'dominoes'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Dices className="w-3.5 h-3.5" />
            Dominoes
          </button>
        </div>
      </div>

      {/* Overview Top 5 Breakdown (when "All Games" selected) or Single Filter List */}
      {filterGame === 'all' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FARKLE TOP 5 CARD */}
          <div className="bg-gradient-to-b from-orange-50/50 via-white to-orange-50/20 dark:from-slate-800/60 dark:to-slate-900 p-5 rounded-3xl border border-orange-200/60 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between border-b border-orange-200/40 dark:border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500 fill-orange-400" />
                <h4 className="font-black text-sm uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Farkle Leaderboard
                </h4>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-orange-100 dark:bg-slate-700 text-orange-700 dark:text-orange-300 rounded-full">
                Top 5
              </span>
            </div>

            <div className="space-y-2.5">
              {farkleTop5.length > 0 ? (
                farkleTop5.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      idx === 0
                        ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-amber-300/80 dark:border-amber-500/40 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getRankBadge(idx)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base leading-none">{rec.playerAvatar || '🎲'}</span>
                          <span className="font-black text-sm text-slate-800 dark:text-slate-100 truncate">
                            {rec.playerName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {rec.date}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-sm text-orange-600 dark:text-orange-400 block">
                        {rec.score.toLocaleString()} pts
                      </span>
                      {rec.isWinner && (
                        <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">
                          Match Winner
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  No Farkle high scores yet
                </div>
              )}
            </div>
          </div>

          {/* YAHTZEE TOP 5 CARD */}
          <div className="bg-gradient-to-b from-teal-50/50 via-white to-teal-50/20 dark:from-slate-800/60 dark:to-slate-900 p-5 rounded-3xl border border-teal-200/60 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between border-b border-teal-200/40 dark:border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-500 fill-teal-400" />
                <h4 className="font-black text-sm uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Yahtzee Leaderboard
                </h4>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-teal-100 dark:bg-slate-700 text-teal-700 dark:text-teal-300 rounded-full">
                Top 5
              </span>
            </div>

            <div className="space-y-2.5">
              {yahtzeeTop5.length > 0 ? (
                yahtzeeTop5.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      idx === 0
                        ? 'bg-gradient-to-r from-teal-500/15 to-emerald-500/10 border-teal-300/80 dark:border-teal-500/40 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getRankBadge(idx)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base leading-none">{rec.playerAvatar || '🎲'}</span>
                          <span className="font-black text-sm text-slate-800 dark:text-slate-100 truncate">
                            {rec.playerName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {rec.date}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-sm text-teal-600 dark:text-teal-400 block">
                        {rec.score.toLocaleString()} pts
                      </span>
                      {rec.isWinner && (
                        <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">
                          Match Winner
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  No Yahtzee high scores yet
                </div>
              )}
            </div>
          </div>

          {/* DOMINOES TOP 5 CARD */}
          <div className="bg-gradient-to-b from-pink-50/50 via-white to-pink-50/20 dark:from-slate-800/60 dark:to-slate-900 p-5 rounded-3xl border border-pink-200/60 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between border-b border-pink-200/40 dark:border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <Dices className="w-5 h-5 text-pink-500 fill-pink-400" />
                <h4 className="font-black text-sm uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Dominoes Leaderboard
                </h4>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-pink-100 dark:bg-slate-700 text-pink-700 dark:text-pink-300 rounded-full">
                Top 5
              </span>
            </div>

            <div className="space-y-2.5">
              {dominoesTop5.length > 0 ? (
                dominoesTop5.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      idx === 0
                        ? 'bg-gradient-to-r from-pink-500/15 to-rose-500/10 border-pink-300/80 dark:border-pink-500/40 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getRankBadge(idx)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base leading-none">{rec.playerAvatar || '🁏'}</span>
                          <span className="font-black text-sm text-slate-800 dark:text-slate-100 truncate">
                            {rec.playerName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {rec.date}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-sm text-pink-600 dark:text-pink-400 block">
                        {rec.score.toLocaleString()} pts
                      </span>
                      {rec.isWinner && (
                        <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">
                          Match Winner
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  No Dominoes high scores yet
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Filtered Single List View */
        <div className="space-y-3">
          {displayedRecords.length > 0 ? (
            displayedRecords.map((rec, idx) => {
              const gameMeta = getGameLabel(rec.gameType);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={rec.id || idx}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                    idx === 0
                      ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-amber-300 dark:border-amber-500/50 shadow-md ring-2 ring-amber-400/20'
                      : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {getRankBadge(idx)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none">{rec.playerAvatar || '🎲'}</span>
                        <span className="font-black text-base text-slate-900 dark:text-white truncate">
                          {rec.playerName}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${gameMeta.bg}`}>
                          {gameMeta.icon}
                          {gameMeta.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {rec.date}
                        </span>
                        {rec.isWinner && (
                          <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Winner
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-xl text-slate-900 dark:text-white block">
                      {rec.score.toLocaleString()} <span className="text-xs font-bold text-slate-500">pts</span>
                    </span>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-semibold text-sm">
              No high scores logged for this game type yet. Play a match to claim top rank!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
