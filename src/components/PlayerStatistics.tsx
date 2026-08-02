import React, { useState } from 'react';
import { Player, GameHistoryEntry, GameType } from '../types';
import { Trophy, Flame, Sparkles, ScrollText, Award, TrendingUp, BarChart3, Users, Crown, Gamepad2, ArrowUpDown } from 'lucide-react';
import { motion } from 'motion/react';

interface PlayerStatisticsProps {
  players: Player[];
  gameHistory: GameHistoryEntry[];
}

interface PlayerStat {
  player: Player;
  isCurrentRoster: boolean;
  totalGames: number;
  totalWins: number;
  winRate: number;
  highestScore: number;
  highestScoreGameType: GameType | null;
  highScoreByGame: {
    farkle: number;
    yahtzee: number;
    dominoes: number;
  };
  gamesByGame: {
    farkle: number;
    yahtzee: number;
    dominoes: number;
  };
}

type SortOption = 'wins' | 'games' | 'highScore' | 'name';

export default function PlayerStatistics({ players, gameHistory }: PlayerStatisticsProps) {
  const [sortBy, setSortBy] = useState<SortOption>('wins');
  const [gameFilter, setGameFilter] = useState<'all' | GameType>('all');

  // Build unique map of all players (current roster + any historical players)
  const playerMap = new Map<string, { player: Player; isCurrent: boolean }>();
  
  players.forEach(p => {
    playerMap.set(p.id, { player: p, isCurrent: true });
  });

  gameHistory.forEach(entry => {
    entry.players.forEach(hp => {
      if (!playerMap.has(hp.id)) {
        // Find if matches by name if ID was regenerated
        const matchedCurrent = players.find(p => p.name.toLowerCase() === hp.name.toLowerCase());
        if (matchedCurrent) {
          playerMap.set(matchedCurrent.id, { player: matchedCurrent, isCurrent: true });
        } else {
          playerMap.set(hp.id, { player: hp, isCurrent: false });
        }
      }
    });
  });

  // Calculate statistics for each tracked player
  const statsList: PlayerStat[] = Array.from(playerMap.values()).map(({ player, isCurrent }) => {
    // Filter history entries involving this player
    const playerEntries = gameHistory.filter(entry => {
      if (gameFilter !== 'all' && entry.gameType !== gameFilter) return false;

      // Check if player ID or name exists in entry
      const hasId = entry.scores[player.id] !== undefined;
      const hasName = entry.players.some(hp => hp.name.toLowerCase() === player.name.toLowerCase());
      return hasId || hasName;
    });

    const totalGames = playerEntries.length;

    // Calculate wins
    const totalWins = playerEntries.filter(entry => {
      return entry.winner.toLowerCase() === player.name.toLowerCase();
    }).length;

    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

    let highestScore = 0;
    let highestScoreGameType: GameType | null = null;

    const highScoreByGame = {
      farkle: 0,
      yahtzee: 0,
      dominoes: 0,
    };

    const gamesByGame = {
      farkle: 0,
      yahtzee: 0,
      dominoes: 0,
    };

    playerEntries.forEach(entry => {
      let score = entry.scores[player.id];
      if (score === undefined) {
        const matchingPlayer = entry.players.find(hp => hp.name.toLowerCase() === player.name.toLowerCase());
        if (matchingPlayer) {
          score = entry.scores[matchingPlayer.id] || 0;
        } else {
          score = 0;
        }
      }

      gamesByGame[entry.gameType] = (gamesByGame[entry.gameType] || 0) + 1;

      if (score > highScoreByGame[entry.gameType]) {
        highScoreByGame[entry.gameType] = score;
      }

      if (score > highestScore) {
        highestScore = score;
        highestScoreGameType = entry.gameType;
      }
    });

    return {
      player,
      isCurrentRoster: isCurrent,
      totalGames,
      totalWins,
      winRate,
      highestScore,
      highestScoreGameType,
      highScoreByGame,
      gamesByGame,
    };
  });

  // Sort statsList
  const sortedStats = [...statsList].sort((a, b) => {
    if (sortBy === 'wins') {
      if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
      return b.winRate - a.winRate;
    }
    if (sortBy === 'games') {
      return b.totalGames - a.totalGames;
    }
    if (sortBy === 'highScore') {
      return b.highestScore - a.highestScore;
    }
    if (sortBy === 'name') {
      return a.player.name.localeCompare(b.player.name);
    }
    return 0;
  });

  // Highlights
  const topWinner = [...statsList].sort((a, b) => b.totalWins - a.totalWins)[0];
  const topHighScore = [...statsList].sort((a, b) => b.highestScore - a.highestScore)[0];
  const mostActive = [...statsList].sort((a, b) => b.totalGames - a.totalGames)[0];

  const formatGameTypeName = (type: GameType | null) => {
    if (!type) return '';
    if (type === 'farkle') return 'Farkle';
    if (type === 'yahtzee') return 'Yahtzee';
    if (type === 'dominoes') return 'Dominoes';
    return type;
  };

  const getGameIcon = (type: GameType | null) => {
    if (type === 'farkle') return <Flame className="w-3.5 h-3.5 text-orange-500" />;
    if (type === 'yahtzee') return <Sparkles className="w-3.5 h-3.5 text-teal-500" />;
    if (type === 'dominoes') return <ScrollText className="w-3.5 h-3.5 text-pink-500" />;
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] border-2 border-orange-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-orange-100 dark:border-slate-800">
        <div>
          <h3 className="text-xl font-black text-teal-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            Player Statistics
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">
            Lifetime games played, total wins, and high score records per player.
          </p>
        </div>

        {/* CONTROLS: SORT & GAME FILTER */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter by Game */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 text-xs font-bold">
            {(['all', 'farkle', 'yahtzee', 'dominoes'] as const).map(type => (
              <button
                key={type}
                onClick={() => setGameFilter(type)}
                className={`px-3 py-1 rounded-full capitalize transition-all cursor-pointer ${
                  gameFilter === type
                    ? 'bg-teal-900 dark:bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {type === 'all' ? 'All' : type}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-slate-800 border border-orange-200 dark:border-slate-700 rounded-full px-3 py-1 text-xs font-black text-orange-950 dark:text-slate-100">
            <ArrowUpDown className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs font-black focus:outline-none cursor-pointer dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="wins" className="dark:bg-slate-800">Sort by Wins</option>
              <option value="games" className="dark:bg-slate-800">Sort by Games</option>
              <option value="highScore" className="dark:bg-slate-800">Sort by High Score</option>
              <option value="name" className="dark:bg-slate-800">Sort by Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* HIGHLIGHT BANNER CARDS */}
      {gameHistory.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Top Winner */}
          <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Crown className="w-5 h-5 fill-amber-200" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider block">
                Most Wins
              </span>
              <p className="text-sm font-black text-amber-950 dark:text-amber-100 truncate">
                {topWinner?.totalWins ? topWinner.player.name : 'N/A'}
              </p>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">
                {topWinner?.totalWins ? `${topWinner.totalWins} victories (${topWinner.winRate}%)` : 'No wins yet'}
              </span>
            </div>
          </div>

          {/* Highest Score */}
          <div className="bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/50 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Flame className="w-5 h-5 fill-orange-200" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-orange-800 dark:text-orange-400 tracking-wider block">
                All-Time High Score
              </span>
              <p className="text-sm font-black text-orange-950 dark:text-orange-100 truncate">
                {topHighScore?.highestScore ? `${topHighScore.highestScore.toLocaleString()} pts` : 'N/A'}
              </p>
              <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300 block truncate">
                {topHighScore?.highestScore ? `${topHighScore.player.name} (${formatGameTypeName(topHighScore.highestScoreGameType)})` : 'No scores logged'}
              </span>
            </div>
          </div>

          {/* Most Active */}
          <div className="bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-teal-800 dark:text-teal-400 tracking-wider block">
                Most Active
              </span>
              <p className="text-sm font-black text-teal-950 dark:text-teal-100 truncate">
                {mostActive?.totalGames ? mostActive.player.name : 'N/A'}
              </p>
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 block">
                {mostActive?.totalGames ? `${mostActive.totalGames} matches played` : '0 games'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PLAYER STAT CARDS GRID */}
      <div className="space-y-4">
        {sortedStats.map((stat) => (
          <motion.div
            key={stat.player.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-5 hover:border-orange-200 dark:hover:border-slate-600 transition-all hover:bg-white dark:hover:bg-slate-800/80 hover:shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Player Identity */}
              <div className="flex items-center gap-3.5 min-w-[180px]">
                <div
                  className={`w-12 h-12 rounded-2xl ${stat.player.color} flex items-center justify-center font-black text-xl shadow-sm shrink-0`}
                >
                  {stat.player.avatar || stat.player.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      {stat.player.name}
                    </h4>
                    {stat.isCurrentRoster && (
                      <span className="text-[9px] font-black bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Roster
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {stat.totalGames === 1 ? '1 game played' : `${stat.totalGames} games played`}
                  </p>
                </div>
              </div>

              {/* Stat Pillars */}
              <div className="grid grid-cols-3 gap-3 flex-1 max-w-xl">
                {/* Total Wins */}
                <div className="bg-white dark:bg-slate-900 border border-orange-100 dark:border-slate-700 rounded-2xl p-3 text-center shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block flex items-center justify-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    Wins
                  </span>
                  <div className="text-lg font-black text-teal-950 dark:text-teal-300 mt-1">
                    {stat.totalWins}
                  </div>
                  <span className="inline-block text-[9px] font-bold bg-amber-100/70 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full mt-1">
                    {stat.winRate}% Win Rate
                  </span>
                </div>

                {/* Total Games */}
                <div className="bg-white dark:bg-slate-900 border border-orange-100 dark:border-slate-700 rounded-2xl p-3 text-center shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block flex items-center justify-center gap-1">
                    <Gamepad2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    Games
                  </span>
                  <div className="text-lg font-black text-teal-950 dark:text-teal-300 mt-1">
                    {stat.totalGames}
                  </div>
                  <span className="inline-block text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    Played
                  </span>
                </div>

                {/* Highest Score */}
                <div className="bg-white dark:bg-slate-900 border border-orange-100 dark:border-slate-700 rounded-2xl p-3 text-center shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block flex items-center justify-center gap-1">
                    <Award className="w-3 h-3 text-orange-500" />
                    High Score
                  </span>
                  <div className="text-lg font-black text-teal-950 dark:text-teal-300 mt-1 font-mono">
                    {stat.highestScore > 0 ? stat.highestScore.toLocaleString() : '0'}
                  </div>
                  {stat.highestScoreGameType ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-orange-100/70 dark:bg-orange-950/80 text-orange-900 dark:text-orange-300 px-2 py-0.5 rounded-full mt-1">
                      {getGameIcon(stat.highestScoreGameType)}
                      {formatGameTypeName(stat.highestScoreGameType)}
                    </span>
                  ) : (
                    <span className="inline-block text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1">
                      No score
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Game Type Breakdown Row */}
            {stat.totalGames > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Game Breakdown:
                </span>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 bg-orange-50/80 dark:bg-orange-950/40 px-2.5 py-1 rounded-xl border border-orange-100 dark:border-orange-900/50">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">Farkle:</span>
                    <span className="font-mono font-black text-orange-950 dark:text-orange-200">
                      {stat.gamesByGame.farkle} gms
                    </span>
                    {stat.highScoreByGame.farkle > 0 && (
                      <span className="text-[10px] text-orange-700 dark:text-orange-400 font-semibold">
                        (Best: {stat.highScoreByGame.farkle.toLocaleString()})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 bg-teal-50/80 dark:bg-teal-950/40 px-2.5 py-1 rounded-xl border border-teal-100 dark:border-teal-900/50">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">Yahtzee:</span>
                    <span className="font-mono font-black text-teal-950 dark:text-teal-200">
                      {stat.gamesByGame.yahtzee} gms
                    </span>
                    {stat.highScoreByGame.yahtzee > 0 && (
                      <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">
                        (Best: {stat.highScoreByGame.yahtzee.toLocaleString()})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 bg-pink-50/80 dark:bg-pink-950/40 px-2.5 py-1 rounded-xl border border-pink-100 dark:border-pink-900/50">
                    <ScrollText className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">Dominoes:</span>
                    <span className="font-mono font-black text-pink-950 dark:text-pink-200">
                      {stat.gamesByGame.dominoes} gms
                    </span>
                    {stat.highScoreByGame.dominoes > 0 && (
                      <span className="text-[10px] text-pink-700 dark:text-pink-400 font-semibold">
                        (Best: {stat.highScoreByGame.dominoes.toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {sortedStats.length === 0 && (
          <div className="text-center py-12 bg-orange-50/30 dark:bg-slate-800/40 rounded-3xl border border-dashed border-orange-200 dark:border-slate-700 p-8">
            <Users className="w-10 h-10 text-orange-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-black text-teal-900 dark:text-slate-100 uppercase tracking-tight">
              No Players Tracked
            </h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm mx-auto font-medium">
              Add players using the Players Roster panel to start recording match statistics!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
