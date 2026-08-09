import React, { useState, useEffect } from 'react';
import { Player, DominoesState, DominoesRound } from '../types';
import { Play, RotateCcw, ChevronRight, Hash, Trash2, Award, Plus, Check, UserPlus, X, AlertCircle, Undo } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, saveActiveGameToFirestore, deleteSavedGameFromFirestore } from '../lib/firebase';
import { useSound } from '../lib/SoundContext';

interface DominoesScorerProps {
  players: Player[];
  onGameFinished: (winnerName: string, finalScores: Record<string, number>) => void;
  onAddPlayer?: (name: string, color: string) => Player;
  externalGameState?: DominoesState | null;
  onSyncGameRoom?: (newGameState: DominoesState) => void;
  isOnlineSynced?: boolean;
}

export default function DominoesScorer({
  players,
  onGameFinished,
  onAddPlayer,
  externalGameState,
  onSyncGameRoom,
  isOnlineSynced,
}: DominoesScorerProps) {
  const { playBank, playUndo } = useSound();
  const [gameState, setGameState] = useState<DominoesState | null>(null);
  const [historyStack, setHistoryStack] = useState<DominoesState[]>([]);
  const [isSettingUp, setIsSettingUp] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [targetScoreInput, setTargetScoreInput] = useState(200);

  const pushStateToHistory = () => {
    if (gameState) {
      setHistoryStack(prev => [...prev, JSON.parse(JSON.stringify(gameState))]);
    }
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    playUndo();
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, prev.length - 1));
    setGameState(previous);
    setActiveScoreInput('');
  };

  // Custom confirmation modals state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [playerToRemoveId, setPlayerToRemoveId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Active game player management state
  const [showAddPlayerInGame, setShowAddPlayerInGame] = useState(false);
  const [inGameNewPlayerName, setInGameNewPlayerName] = useState('');

  // Quick Score entry state
  const [activeScoreInput, setActiveScoreInput] = useState('');

  // Check for saved game on mount
  useEffect(() => {
    const saved = localStorage.getItem('scorekeeper_saved_dominoes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.gameState) {
          setGameState(parsed.gameState);
          setIsSettingUp(false);
        }
      } catch (err) {
        console.error("Error loading saved Dominoes game", err);
      }
    }
  }, []);

  // Listen to external online game room updates
  useEffect(() => {
    if (externalGameState) {
      setGameState(externalGameState);
      setIsSettingUp(false);
    }
  }, [externalGameState]);

  // Save game progress automatically whenever gameState changes
  useEffect(() => {
    if (gameState) {
      if (gameState.winnerId) {
        localStorage.removeItem('scorekeeper_saved_dominoes');
        if (auth.currentUser) {
          deleteSavedGameFromFirestore(auth.currentUser.uid, 'dominoes');
        }
      } else {
        const savedData = {
          gameType: 'dominoes' as const,
          gameState,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('scorekeeper_saved_dominoes', JSON.stringify(savedData));
        if (auth.currentUser) {
          saveActiveGameToFirestore(auth.currentUser.uid, 'dominoes', savedData);
        }
      }

      if (onSyncGameRoom) {
        onSyncGameRoom(gameState);
      }
    }
  }, [gameState]);

  const removePlayerFromActiveGame = (playerId: string) => {
    if (!gameState) return;
    if (gameState.players.length <= 1) {
      setAlertMessage("You cannot remove the last player!");
      return;
    }
    setPlayerToRemoveId(playerId);
  };

  const confirmRemovePlayer = () => {
    if (!gameState || !playerToRemoveId) return;
    pushStateToHistory();
    const remainingPlayers = gameState.players.filter(p => p.id !== playerToRemoveId);
    const newScores = { ...gameState.scores };
    delete newScores[playerToRemoveId];

    let newActivePlayerId = gameState.activePlayerId;
    if (gameState.activePlayerId === playerToRemoveId) {
      const removedIdx = gameState.players.findIndex(p => p.id === playerToRemoveId);
      const nextPlayer = remainingPlayers[removedIdx % remainingPlayers.length];
      newActivePlayerId = nextPlayer.id;
    }

    setGameState({
      ...gameState,
      players: remainingPlayers,
      scores: newScores,
      activePlayerId: newActivePlayerId,
    });
    setPlayerToRemoveId(null);
  };

  const addPlayerToActiveGame = (player: Player) => {
    if (!gameState) return;
    if (gameState.players.some(p => p.id === player.id)) return;
    pushStateToHistory();

    setGameState({
      ...gameState,
      players: [...gameState.players, player],
      scores: {
        ...gameState.scores,
        [player.id]: 0,
      }
    });
  };

  const handleCreateAndAddPlayerInGame = (name: string) => {
    if (!name.trim() || !onAddPlayer) return;
    const colors = [
      'bg-rose-500 text-white',
      'bg-sky-500 text-white',
      'bg-emerald-500 text-white',
      'bg-amber-500 text-white',
      'bg-violet-500 text-white',
      'bg-fuchsia-500 text-white',
      'bg-teal-500 text-white',
      'bg-indigo-500 text-white',
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newP = onAddPlayer(name.trim(), randomColor);
    addPlayerToActiveGame(newP);
  };

  // Automatically select all players by default
  useEffect(() => {
    if (players.length > 0 && selectedPlayers.length === 0) {
      setSelectedPlayers(players.map(p => p.id));
    }
  }, [players]);

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const startNewGame = () => {
    const gamePlayers = players.filter(p => selectedPlayers.includes(p.id));
    if (gamePlayers.length === 0) return;

    const initialScores: Record<string, number> = {};
    gamePlayers.forEach(p => {
      initialScores[p.id] = 0;
    });

    setHistoryStack([]);
    setGameState({
      players: gamePlayers,
      scores: initialScores,
      rounds: [],
      targetScore: targetScoreInput,
      winnerId: null,
      activePlayerId: gamePlayers[0].id,
    });

    setIsSettingUp(false);
    setActiveScoreInput('');
  };

  const addScore = (playerId: string, points: number) => {
    if (!gameState) return;
    pushStateToHistory();
    playBank();

    const newScore = (gameState.scores[playerId] || 0) + points;

    // Check if points exceed target
    let newWinnerId = gameState.winnerId;
    if (newScore >= gameState.targetScore) {
      // Set winner
      newWinnerId = playerId;
    }

    // Add round entry
    const newRound: DominoesRound = {
      scores: {
        [playerId]: points,
      },
    };

    // Update state
    const updatedScores = {
      ...gameState.scores,
      [playerId]: newScore,
    };

    // Cycle to next player
    const activeIdx = gameState.players.findIndex(p => p.id === gameState.activePlayerId);
    const nextIdx = (activeIdx + 1) % gameState.players.length;
    const nextPlayerId = gameState.players[nextIdx].id;

    const newGameState = {
      ...gameState,
      scores: updatedScores,
      rounds: [...gameState.rounds, newRound],
      activePlayerId: nextPlayerId,
      winnerId: newWinnerId,
    };

    setGameState(newGameState);

    if (newWinnerId) {
      const winner = gameState.players.find(p => p.id === newWinnerId);
      if (winner) {
        localStorage.removeItem('scorekeeper_saved_dominoes');
        onGameFinished(winner.name, updatedScores);
      }
    }
  };

  const handleCustomScoreSubmit = (e: React.FormEvent, playerId: string) => {
    e.preventDefault();
    const pts = parseInt(activeScoreInput);
    if (!isNaN(pts)) {
      addScore(playerId, pts);
      setActiveScoreInput('');
    }
  };

  const removeRound = (roundIdx: number) => {
    if (!gameState) return;
    pushStateToHistory();

    const round = gameState.rounds[roundIdx];
    const updatedScores = { ...gameState.scores };

    // Subtract points from players' scores
    Object.entries(round.scores).forEach(([pId, pts]) => {
      updatedScores[pId] = Math.max(0, (updatedScores[pId] || 0) - (pts as number));
    });

    const updatedRounds = gameState.rounds.filter((_, idx) => idx !== roundIdx);

    // Re-check for winner
    let newWinnerId: string | null = null;
    gameState.players.forEach(p => {
      if (updatedScores[p.id] >= gameState.targetScore) {
        if (!newWinnerId || updatedScores[p.id] > updatedScores[newWinnerId]) {
          newWinnerId = p.id;
        }
      }
    });

    setGameState({
      ...gameState,
      scores: updatedScores,
      rounds: updatedRounds,
      winnerId: newWinnerId,
    });
  };

  const resetGame = () => {
    setShowResetConfirm(true);
  };

  const confirmResetGame = () => {
    localStorage.removeItem('scorekeeper_saved_dominoes');
    setIsSettingUp(true);
    setGameState(null);
    setHistoryStack([]);
    setShowResetConfirm(false);
  };

  if (isSettingUp) {
    return (
      <div className="bg-white rounded-[32px] shadow-sm border-2 border-orange-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <ChevronRight className="w-6 h-6 text-orange-500 animate-pulse rotate-90" />
          <h2 className="text-xl font-black text-teal-900 uppercase tracking-tight">
            Dominoes Scoreboard Setup
          </h2>
        </div>

        <div className="space-y-6">
          {/* Step 1: Select Players */}
          <div>
            <label className="block text-[10px] font-black text-teal-800 uppercase tracking-widest mb-3">
              Select Participants (At least 1)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {players.map(player => {
                const isSelected = selectedPlayers.includes(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerSelection(player.id)}
                    className={`flex items-center gap-2 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/60 shadow-xs'
                        : 'border-orange-100/60 hover:border-orange-200 bg-orange-50/10'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${isSelected ? 'bg-orange-500' : 'bg-slate-300'}`}
                    />
                    <span className="font-bold text-gray-700 text-sm truncate uppercase tracking-tight">{player.name}</span>
                  </button>
                );
              })}
            </div>
            {players.length === 0 && (
              <div className="text-sm text-teal-800/40 py-2 font-semibold">
                No players available. Add players below or in the sidebar!
              </div>
            )}

            {onAddPlayer && (
              <div className="mt-3.5 flex gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Quick Add Player..."
                  id="quick-add-dominoes-player"
                  maxLength={15}
                  className="flex-1 px-3 py-2 bg-orange-50/20 border-2 border-orange-100 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        const colors = [
                          'bg-rose-500 text-white',
                          'bg-sky-500 text-white',
                          'bg-emerald-500 text-white',
                          'bg-amber-500 text-white',
                          'bg-violet-500 text-white',
                          'bg-fuchsia-500 text-white',
                          'bg-teal-500 text-white',
                          'bg-indigo-500 text-white',
                        ];
                        const randomColor = colors[Math.floor(Math.random() * colors.length)];
                        const newP = onAddPlayer(val, randomColor);
                        setSelectedPlayers(prev => [...prev, newP.id]);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('quick-add-dominoes-player') as HTMLInputElement;
                    const val = input?.value.trim();
                    if (val) {
                      const colors = [
                        'bg-rose-500 text-white',
                        'bg-sky-500 text-white',
                        'bg-emerald-500 text-white',
                        'bg-amber-500 text-white',
                        'bg-violet-500 text-white',
                        'bg-fuchsia-500 text-white',
                        'bg-teal-500 text-white',
                        'bg-indigo-500 text-white',
                      ];
                      const randomColor = colors[Math.floor(Math.random() * colors.length)];
                      const newP = onAddPlayer(val, randomColor);
                      setSelectedPlayers(prev => [...prev, newP.id]);
                      if (input) input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Custom Target Score */}
          <div>
            <label className="block text-[10px] font-black text-teal-800 uppercase tracking-widest mb-2">
              Target Score (Points to win)
            </label>
            <div className="flex gap-2">
              {[100, 150, 200, 250].map(val => (
                <button
                  key={val}
                  onClick={() => setTargetScoreInput(val)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                    targetScoreInput === val
                      ? 'bg-orange-500 border-orange-500 text-white shadow-xs'
                      : 'bg-white border-orange-100 text-teal-900 hover:bg-orange-50/30'
                  }`}
                >
                  {val} pts
                </button>
              ))}
              <div className="relative flex-1">
                <input
                  type="number"
                  value={targetScoreInput}
                  onChange={(e) => setTargetScoreInput(Math.max(10, parseInt(e.target.value) || 0))}
                  className="w-full h-full px-3 text-xs font-black text-slate-950 dark:text-slate-900 border-2 border-orange-100 rounded-xl focus:outline-none focus:border-orange-400 focus:text-black"
                  placeholder="Custom"
                />
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startNewGame}
            disabled={selectedPlayers.length === 0}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 text-white font-black rounded-full text-sm flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer uppercase tracking-wider"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Dominoes Scoreboard
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId)!;

  return (
    <div className="grid grid-cols-1 landscape:grid-cols-12 md:grid-cols-12 gap-6">
      {/* Left Area - Active Scoring Cards */}
      <div className="landscape:col-span-7 md:col-span-7 lg:col-span-8 space-y-4 sm:space-y-6">
        {/* Active Player Box */}
        <div className="bg-teal-600 text-white rounded-[32px] p-6 shadow-lg border-2 border-teal-500/20 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-orange-500/20 rounded-full blur-2xl" />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-orange-300 uppercase tracking-widest flex items-center gap-1 bg-teal-700/50 w-fit px-2.5 py-1 rounded-full border border-teal-500/30">
                  Active Player Turn
                </span>
                <button
                  onClick={handleUndo}
                  disabled={historyStack.length === 0}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-500 text-teal-950 font-black rounded-full text-[10px] flex items-center gap-1 transition-all cursor-pointer uppercase tracking-wider shadow-xs"
                  title="Undo last score entry"
                >
                  <Undo className="w-3 h-3" />
                  Undo {historyStack.length > 0 && `(${historyStack.length})`}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <div className={`w-4 h-4 rounded-full ${activePlayer.color.split(' ')[0]} ring-2 ring-white`} />
                <h2 className="text-2xl font-black tracking-tight uppercase">
                  {activePlayer.name}'s Score Entry
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/10 border border-white/20 px-5 py-3 rounded-2xl backdrop-blur-md">
              <div className="text-right">
                <div className="text-[9px] text-teal-100 font-bold uppercase tracking-widest">Player Total</div>
                <div className="font-mono text-xl font-black text-yellow-300">
                  {gameState.scores[activePlayer.id] || 0} / {gameState.targetScore}
                </div>
              </div>
            </div>
          </div>

          {/* Target Score Progress Bar */}
          <div className="mt-6 pt-4 border-t border-teal-500/30">
            <div className="flex justify-between text-xs text-teal-100 mb-1.5 font-bold uppercase tracking-wider">
              <span>Target: {gameState.targetScore} pts</span>
              <span>{Math.round(((gameState.scores[activePlayer.id] || 0) / gameState.targetScore) * 100)}% to win</span>
            </div>
            <div className="w-full h-2.5 bg-teal-800/80 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300 bg-yellow-400"
                style={{
                  width: `${Math.min(
                    100,
                    ((gameState.scores[activePlayer.id] || 0) / gameState.targetScore) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Scoring Pad */}
        <div className="bg-white rounded-[32px] shadow-sm border-2 border-orange-100 p-6 space-y-6">
          <div>
            <h3 className="text-[10px] font-black text-teal-800 uppercase tracking-widest mb-3">
              Quick Point Buttons
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, -5, -10].map(val => (
                <button
                  key={val}
                  onClick={() => addScore(activePlayer.id, val)}
                  className={`py-3 px-1 rounded-2xl text-sm font-mono font-black transition-all cursor-pointer border-2 ${
                    val < 0
                      ? 'bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-300 text-rose-700'
                      : 'bg-orange-50/30 border-orange-100/60 hover:bg-orange-100 text-orange-800 hover:border-orange-300'
                  }`}
                >
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-orange-100">
            <h3 className="text-[10px] font-black text-teal-800 uppercase tracking-widest mb-3">
              Add Custom Score
            </h3>
            <form onSubmit={(e) => handleCustomScoreSubmit(e, activePlayer.id)} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">
                  <Hash className="w-3.5 h-3.5" />
                </span>
                <input
                  type="number"
                  value={activeScoreInput}
                  onChange={(e) => setActiveScoreInput(e.target.value)}
                  placeholder="Enter score value to add or subtract..."
                  className="w-full pl-9 pr-3 py-2.5 bg-orange-50/30 border-2 border-orange-200/80 rounded-2xl text-sm font-mono font-black text-slate-950 dark:text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-orange-500 focus:bg-white focus:text-black focus:ring-2 focus:ring-orange-400/30 transition-all shadow-2xs"
                />
              </div>
              <button
                type="submit"
                disabled={!activeScoreInput}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-full text-sm font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
              >
                Log Score
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Area - Current Standings & Game Log */}
      <div className="landscape:col-span-5 md:col-span-5 lg:col-span-4 space-y-4 sm:space-y-6">
        {/* Leaderboard */}
        <div className="bg-white rounded-[32px] shadow-sm border-2 border-orange-100 p-6">
          <h3 className="text-[10px] font-black text-teal-800 uppercase tracking-widest mb-4 flex items-center justify-between">
            <span>Standings</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={historyStack.length === 0}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white font-black text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer uppercase tracking-wider"
                title="Undo last action"
              >
                <Undo className="w-3.5 h-3.5" />
                Undo
              </button>
              <button
                onClick={resetGame}
                className="text-xs text-red-500 hover:text-red-600 font-black uppercase tracking-wider cursor-pointer transition-colors"
              >
                Reset Game
              </button>
            </div>
          </h3>

          <div className="space-y-3">
            {[...gameState.players]
              .sort((a, b) => (gameState.scores[b.id] || 0) - (gameState.scores[a.id] || 0))
              .map((player, idx) => {
                const score = gameState.scores[player.id] || 0;
                const isCurrent = player.id === gameState.activePlayerId;
                const colorClass = player.color.split(' ')[0];

                return (
                  <div
                    key={player.id}
                    className={`p-3.5 rounded-2xl border-2 transition-all ${
                      isCurrent
                        ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20'
                        : 'border-orange-100/40 bg-orange-50/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-teal-800/60">#{idx + 1}</span>
                        <div className={`w-6 h-6 rounded-full ${colorClass} ring-1 ring-black/10 flex items-center justify-center text-xs text-white font-bold shrink-0`}>
                          {player.avatar || player.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-700 text-sm uppercase tracking-tight">
                          {player.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-900 text-sm">
                          {score} / {gameState.targetScore}
                        </span>
                        {gameState.players.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removePlayerFromActiveGame(player.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove from Game"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Miniature progress bar */}
                    <div className="w-full h-1.5 bg-orange-100/80 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className={`h-full ${colorClass}`}
                        style={{ width: `${Math.min(100, (score / gameState.targetScore) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Add Player in Game Section */}
          <div className="mt-4 pt-4 border-t border-orange-100">
            {!showAddPlayerInGame ? (
              <button
                onClick={() => setShowAddPlayerInGame(true)}
                className="w-full py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Player to Game
              </button>
            ) : (
              <div className="bg-orange-50/40 border border-orange-100 rounded-2xl p-3.5 space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-orange-800 uppercase tracking-widest">
                    Add Player
                  </span>
                  <button
                    onClick={() => setShowAddPlayerInGame(false)}
                    className="p-1 hover:bg-orange-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Existing players not in game */}
                {players.filter(p => !gameState.players.some(gp => gp.id === p.id)).length > 0 && (
                  <div className="space-y-1.5">
                    <span className="block text-[8px] font-black text-teal-800 uppercase tracking-widest">
                      Quick Add Existing:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {players
                        .filter(p => !gameState.players.some(gp => gp.id === p.id))
                        .map(p => (
                          <button
                            key={p.id}
                            onClick={() => addPlayerToActiveGame(p)}
                            className="px-2.5 py-1 bg-white hover:bg-orange-100 border border-orange-200 rounded-lg text-xs font-bold text-gray-700 uppercase tracking-tight transition-colors cursor-pointer"
                          >
                            + {p.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Create brand new player */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (inGameNewPlayerName.trim()) {
                      handleCreateAndAddPlayerInGame(inGameNewPlayerName);
                      setInGameNewPlayerName('');
                      setShowAddPlayerInGame(false);
                    }
                  }}
                  className="space-y-2"
                >
                  <span className="block text-[8px] font-black text-teal-800 uppercase tracking-widest">
                    Create New Player:
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Player Name..."
                      value={inGameNewPlayerName}
                      onChange={(e) => setInGameNewPlayerName(e.target.value)}
                      maxLength={15}
                      className="flex-1 px-3 py-1.5 bg-white border-2 border-orange-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-400"
                    />
                    <button
                      type="submit"
                      disabled={!inGameNewPlayerName.trim()}
                      className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Hand Logs */}
        <div className="bg-white rounded-[32px] shadow-sm border-2 border-orange-100 p-6">
          <h3 className="text-[10px] font-black text-teal-800 uppercase tracking-widest mb-3">
            Point Log
          </h3>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {gameState.rounds.map((round, rIdx) => {
              // Each round shows which player added what score
              const [[pId, pts]] = Object.entries(round.scores);
              const ptsNum = pts as number;
              const player = gameState.players.find(p => p.id === pId);
              if (!player) return null;

              return (
                <div
                  key={rIdx}
                  className="flex items-center justify-between p-3 bg-orange-50/30 rounded-2xl border border-orange-100/60 text-xs group"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${player.color.split(' ')[0]}`} />
                    <span className="font-bold text-gray-700 uppercase tracking-tight">{player.name}</span>
                    <span className="text-teal-800/60 font-semibold uppercase text-[9px] tracking-wide">scored</span>
                    <span className={`font-mono font-black ${ptsNum < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {ptsNum > 0 ? `+${ptsNum}` : ptsNum}
                    </span>
                  </div>

                  <button
                    onClick={() => removeRound(rIdx)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-all cursor-pointer"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {gameState.rounds.length === 0 && (
              <div className="text-center py-6 text-teal-800/40 text-xs font-semibold">
                History of logged scores will appear here.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RESET GAME CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 bg-teal-950/70 flex items-center justify-center p-4 z-55 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl border-2 border-orange-100 p-8 max-w-sm w-full text-center relative overflow-hidden"
            >
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                <RotateCcw className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-teal-900 tracking-tight uppercase">
                Reset Game?
              </h2>
              <p className="text-slate-500 text-sm mt-3 font-semibold leading-relaxed">
                Are you sure you want to reset this Dominoes score sheet? All logged rounds and current standings will be lost.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmResetGame}
                  className="py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                >
                  Yes, Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REMOVE PLAYER CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {playerToRemoveId && (
          <div className="fixed inset-0 bg-teal-950/70 flex items-center justify-center p-4 z-55 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl border-2 border-orange-100 p-8 max-w-sm w-full text-center relative overflow-hidden"
            >
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                <Trash2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-teal-900 tracking-tight uppercase">
                Remove Player?
              </h2>
              <p className="text-slate-500 text-sm mt-3 font-semibold leading-relaxed">
                Are you sure you want to remove{" "}
                <strong className="font-black text-slate-800">
                  {gameState.players.find((p) => p.id === playerToRemoveId)?.name}
                </strong>{" "}
                from the active game? Their scores and history will be permanently deleted.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setPlayerToRemoveId(null)}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRemovePlayer}
                  className="py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                >
                  Yes, Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ALERT MESSAGE OVERLAY */}
      <AnimatePresence>
        {alertMessage && (
          <div className="fixed inset-0 bg-teal-950/70 flex items-center justify-center p-4 z-55 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl border-2 border-orange-100 p-8 max-w-sm w-full text-center relative overflow-hidden"
            >
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-teal-900 tracking-tight uppercase">
                Notice
              </h2>
              <p className="text-slate-500 text-sm mt-3 font-semibold leading-relaxed">
                {alertMessage}
              </p>

              <button
                type="button"
                onClick={() => setAlertMessage(null)}
                className="w-full mt-8 py-3 bg-teal-900 hover:bg-teal-950 text-white font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
              >
                Okay
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
