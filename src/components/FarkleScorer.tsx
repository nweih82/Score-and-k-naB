import React, { useState, useEffect, useRef } from 'react';
import { Player, FarkleState, FarkleRound, ActionLogItem, FarkleHouseRules } from '../types';
import { Play, RotateCcw, Award, CheckCircle, Flame, AlertCircle, Plus, ChevronRight, Hash, Trash2, UserPlus, X, Edit2, Edit3, Save, Pencil, Undo, Activity, Mic, Hand, Clock, Wifi, RefreshCw, Sliders, ShieldAlert, Sparkles, Dices } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, saveActiveGameToFirestore, deleteSavedGameFromFirestore } from '../lib/firebase';
import { useSound } from '../lib/SoundContext';
import { VoiceAssistantWidget, VoiceCommandResult } from './VoiceAssistantWidget';
import { safeClone, safeJsonStringify } from '../lib/utils';
import { DEFAULT_FARKLE_RULES, loadActiveHouseRules, loadActivePresetId, loadHouseRulesPresets } from '../lib/houseRules';

interface FarkleScorerProps {
  players: Player[];
  onGameFinished: (winnerName: string, finalScores: Record<string, number>) => void;
  onAddPlayer?: (name: string, color: string) => Player;
  externalGameState?: FarkleState | null;
  externalTurnScore?: number | null;
  onSyncGameRoom?: (newGameState: FarkleState, turnScore?: number | null) => void;
  isOnlineSynced?: boolean;
  houseRules?: FarkleHouseRules;
  onOpenHouseRules?: () => void;
}

export default function FarkleScorer({
  players,
  onGameFinished,
  onAddPlayer,
  externalGameState,
  externalTurnScore,
  onSyncGameRoom,
  isOnlineSynced,
  houseRules,
  onOpenHouseRules,
}: FarkleScorerProps) {
  const { playBank, playFarkle, playUndo } = useSound();
  const [gameState, setGameState] = useState<FarkleState | null>(() => {
    if (externalGameState && Array.isArray(externalGameState.players) && externalGameState.players.length > 0) {
      return externalGameState;
    }
    return null;
  });
  const [historyStack, setHistoryStack] = useState<FarkleState[]>([]);
  const [targetScoreInput, setTargetScoreInput] = useState(() => {
    if (externalGameState?.targetScore) return externalGameState.targetScore;
    const rules = houseRules || loadActiveHouseRules().farkle;
    return rules.targetScore || 10000;
  });
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [houseRuleAlert, setHouseRuleAlert] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(() => {
    if (externalGameState && Array.isArray(externalGameState.players) && externalGameState.players.length > 0) {
      return false;
    }
    return true;
  });

  // Auto-dismiss house rule alerts
  useEffect(() => {
    if (houseRuleAlert) {
      const timer = setTimeout(() => setHouseRuleAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [houseRuleAlert]);

  const pushStateToHistory = () => {
    if (gameState) {
      setHistoryStack(prev => [...prev, safeClone(gameState)]);
    }
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    playUndo();
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, prev.length - 1));
    setGameState(previous);
    setTurnScore(0);
    setCustomScoreInput('');
  };

  // Custom confirmation modals state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [playerToRemoveId, setPlayerToRemoveId] = useState<string | null>(null);

  // Active game player management state
  const [showAddPlayerInGame, setShowAddPlayerInGame] = useState(false);
  const [inGameNewPlayerName, setInGameNewPlayerName] = useState('');

  // Turn scratchpad
  const [turnScore, setTurnScore] = useState<number>(() => {
    if (typeof externalTurnScore === 'number') {
      return externalTurnScore;
    }
    return 0;
  });
  const [customScoreInput, setCustomScoreInput] = useState('');

  // Score Editing States
  const [editingScorePlayer, setEditingScorePlayer] = useState<{ id: string; name: string; currentScore: number } | null>(null);
  const [manualScoreValue, setManualScoreValue] = useState<string>('');

  const [isEditingTurnScore, setIsEditingTurnScore] = useState(false);
  const [manualTurnScoreInput, setManualTurnScoreInput] = useState<string>('');

  const [editingRoundData, setEditingRoundData] = useState<{ roundIdx: number; playerId: string; playerName: string; currentRoundScore: number } | null>(null);
  const [manualRoundScoreVal, setManualRoundScoreVal] = useState<string>('');

  // Automatically select all players by default
  useEffect(() => {
    if (players.length > 0 && selectedPlayers.length === 0) {
      setSelectedPlayers(players.map(p => p.id));
    }
  }, [players]);

  // Check for saved game on mount (ONLY for local/offline mode, not when connected to an online room)
  useEffect(() => {
    if (isOnlineSynced || (externalGameState && Array.isArray(externalGameState.players) && externalGameState.players.length > 0)) {
      return;
    }
    const saved = localStorage.getItem('scorekeeper_saved_farkle');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.gameState) {
          setGameState(parsed.gameState);
          if (parsed.turnScore !== undefined) setTurnScore(parsed.turnScore);
          setIsSettingUp(false);
        }
      } catch (err) {
        console.error("Error loading saved Farkle game", err);
      }
    }
  }, [isOnlineSynced]);

  const isIncomingSyncRef = useRef<boolean>(false);
  const lastReceivedExternalJsonRef = useRef<string>(
    externalGameState && Array.isArray(externalGameState.players) && externalGameState.players.length > 0
      ? safeJsonStringify({ gameState: externalGameState, turnScore: externalTurnScore ?? 0 })
      : ''
  );

  // Listen to external online game room updates
  useEffect(() => {
    if (!externalGameState || !Array.isArray(externalGameState.players) || externalGameState.players.length === 0) {
      return;
    }

    const incomingJson = safeJsonStringify({
      gameState: externalGameState,
      turnScore: externalTurnScore ?? 0,
    });

    // If identical to what we already recorded as the external state, ignore
    if (incomingJson === lastReceivedExternalJsonRef.current) {
      return;
    }

    // Also compare against current state to avoid setting identical state
    const currentJson = safeJsonStringify({
      gameState,
      turnScore: turnScore ?? 0,
    });
    if (incomingJson === currentJson) {
      lastReceivedExternalJsonRef.current = incomingJson;
      return;
    }

    // Mark as incoming sync so the local change effect will NOT echo back to Firestore
    isIncomingSyncRef.current = true;
    lastReceivedExternalJsonRef.current = incomingJson;

    setGameState(externalGameState);
    setIsSettingUp(false);
    if (externalTurnScore !== undefined && externalTurnScore !== null) {
      setTurnScore(externalTurnScore);
    }
  }, [externalGameState, externalTurnScore]);

  // Save game progress automatically whenever gameState or turnScore changes
  useEffect(() => {
    if (gameState && Array.isArray(gameState.players) && gameState.players.length > 0) {
      // If this state update was received from the external room, do not echo back or overwrite local solo save
      if (isIncomingSyncRef.current) {
        isIncomingSyncRef.current = false;
        return;
      }

      if (!isOnlineSynced) {
        if (gameState.winnerId) {
          localStorage.removeItem('scorekeeper_saved_farkle');
          if (auth.currentUser) {
            deleteSavedGameFromFirestore(auth.currentUser.uid, 'farkle');
          }
        } else {
          const savedData = {
            gameType: 'farkle' as const,
            gameState,
            turnScore,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem('scorekeeper_saved_farkle', safeJsonStringify(savedData));
          if (auth.currentUser) {
            saveActiveGameToFirestore(auth.currentUser.uid, 'farkle', savedData);
          }
        }
      }

      // Check if this update came from external sync before echoing to Firestore
      if (isOnlineSynced && onSyncGameRoom) {
        const currentJson = safeJsonStringify({
          gameState,
          turnScore: turnScore ?? 0,
        });
        if (currentJson !== lastReceivedExternalJsonRef.current) {
          lastReceivedExternalJsonRef.current = currentJson;
          onSyncGameRoom(gameState, turnScore);
        }
      }
    }
  }, [gameState, turnScore, isOnlineSynced]);

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

    const activeRules = houseRules || loadActiveHouseRules().farkle;
    setHistoryStack([]);
    setGameState({
      players: gamePlayers,
      scores: initialScores,
      rounds: [],
      currentRound: 1,
      targetScore: targetScoreInput,
      winnerId: null,
      activePlayerId: gamePlayers[0].id,
      turnHistory: [],
      rules: activeRules,
      consecutiveFarkles: {},
    });

    setTurnScore(0);
    setCustomScoreInput('');
    setIsSettingUp(false);
  };

  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);

  const toggleVoiceListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceFeedback('Voice recognition not supported in browser');
      setTimeout(() => setVoiceFeedback(null), 3000);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceFeedback('Listening... Say e.g. "Bank 500" or "Farkle"');
      };

      recognition.onresult = (event: any) => {
        setIsListening(false);
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        setVoiceFeedback(`Heard: "${transcript}"`);
        setTimeout(() => setVoiceFeedback(null), 3500);

        if (transcript.includes('farkle') || transcript.includes('zero') || transcript.includes('bust')) {
          handleFarkle('voice');
        } else if (transcript.includes('bank')) {
          const match = transcript.match(/\d+/);
          if (match) {
            const amount = parseInt(match[0], 10);
            if (amount > 0) bankPoints(amount, 'voice');
          } else if (turnScore > 0) {
            bankPoints(turnScore, 'voice');
          }
        } else if (transcript.includes('add') || transcript.includes('plus')) {
          const match = transcript.match(/\d+/);
          if (match) {
            const amount = parseInt(match[0], 10);
            if (amount > 0) {
              addCustomPoints(amount);
              setVoiceFeedback(`Added ${amount} pts to turn`);
            }
          }
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceFeedback('Speech not recognized. Try again!');
        setTimeout(() => setVoiceFeedback(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceFeedback('Unable to start mic');
      setTimeout(() => setVoiceFeedback(null), 3000);
    }
  };

  const bankPoints = (amountToBank: number, sourceInput?: any) => {
    if (!gameState) return;
    if (amountToBank <= 0) return;

    const activeRules = gameState.rules || houseRules || loadActiveHouseRules().farkle;
    const { activePlayerId, scores, rounds, players: gamePlayers, targetScore, finalRoundState } = gameState;
    const currentScore = scores[activePlayerId] || 0;

    // Validate opening minimum house rule
    if (currentScore === 0 && activeRules.openingMinimum > 0 && amountToBank < activeRules.openingMinimum) {
      playFarkle();
      setHouseRuleAlert(
        `House Rule: Opening minimum is ${activeRules.openingMinimum.toLocaleString()} pts! Turn score was ${amountToBank.toLocaleString()} pts. Must score at least ${activeRules.openingMinimum.toLocaleString()} pts on a single turn to get on the board.`
      );
      return;
    }

    const source: 'manual' | 'voice' = sourceInput === 'voice' ? 'voice' : 'manual';

    pushStateToHistory();
    playBank();

    const activePlayer = gamePlayers.find(p => p.id === activePlayerId);
    const newScore = currentScore + amountToBank;

    // Reset consecutive farkles for this player on a banked turn
    const updatedConsecutiveFarkles = {
      ...(gameState.consecutiveFarkles || {}),
      [activePlayerId]: 0,
    };

    const actionItem: ActionLogItem = {
      id: Date.now().toString() + Math.random().toString().substring(2, 5),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      playerId: activePlayerId,
      playerName: activePlayer?.name || 'Player',
      playerColor: activePlayer?.color,
      actionType: 'bank',
      description: `Banked +${amountToBank.toLocaleString()} pts`,
      points: amountToBank,
      source,
    };
    const updatedRecentActions = [actionItem, ...(gameState.recentActions || [])].slice(0, 20);

    // Save score
    const updatedScores = {
      ...scores,
      [activePlayerId]: newScore,
    };

    // Log the round
    const activeIndex = gamePlayers.findIndex(p => p.id === activePlayerId);
    let updatedRounds = [...rounds];
    
    // Find or create current round entry
    let currentRoundObj = updatedRounds[gameState.currentRound - 1];
    if (!currentRoundObj) {
      currentRoundObj = { scores: {}, farkles: {} };
      updatedRounds.push(currentRoundObj);
    }
    
    currentRoundObj.scores[activePlayerId] = amountToBank;
    currentRoundObj.farkles[activePlayerId] = false;

    let newFinalRoundState = finalRoundState ? { ...finalRoundState } : null;
    let newWinnerId: string | null = null;

    if (!newFinalRoundState) {
      // Final round not active yet
      if (newScore >= targetScore) {
        if (gamePlayers.length === 1) {
          // Single player: win immediately
          newWinnerId = activePlayerId;
        } else {
          // Trigger Final Round ("Beat the Score")!
          const pending: string[] = [];
          for (let i = 1; i < gamePlayers.length; i++) {
            pending.push(gamePlayers[(activeIndex + i) % gamePlayers.length].id);
          }
          newFinalRoundState = {
            leaderId: activePlayerId,
            highScoreToBeat: newScore,
            playersPendingTurn: pending,
          };
        }
      }
    } else {
      // Final round IS already active
      if (newScore > newFinalRoundState.highScoreToBeat) {
        const newPending: string[] = [];
        for (let i = 1; i < gamePlayers.length; i++) {
          newPending.push(gamePlayers[(activeIndex + i) % gamePlayers.length].id);
        }
        newFinalRoundState = {
          leaderId: activePlayerId,
          highScoreToBeat: newScore,
          playersPendingTurn: newPending,
        };
      } else {
        const remainingPending = newFinalRoundState.playersPendingTurn.filter(id => id !== activePlayerId);
        if (remainingPending.length === 0) {
          newWinnerId = newFinalRoundState.leaderId;
          newFinalRoundState = null;
        } else {
          newFinalRoundState.playersPendingTurn = remainingPending;
        }
      }
    }

    // Determine next player
    let nextPlayerId = activePlayerId;
    if (!newWinnerId) {
      if (newFinalRoundState && newFinalRoundState.playersPendingTurn.length > 0) {
        nextPlayerId = newFinalRoundState.playersPendingTurn[0];
      } else {
        const nextIndex = (activeIndex + 1) % gamePlayers.length;
        nextPlayerId = gamePlayers[nextIndex].id;
      }
    }

    const isNewRound = (activeIndex + 1) % gamePlayers.length === 0;
    const nextRound = isNewRound ? gameState.currentRound + 1 : gameState.currentRound;

    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        scores: updatedScores,
        rounds: updatedRounds,
        currentRound: nextRound,
        activePlayerId: nextPlayerId,
        winnerId: newWinnerId,
        finalRoundState: newFinalRoundState,
        recentActions: updatedRecentActions,
        consecutiveFarkles: updatedConsecutiveFarkles,
      };
    });

    if (newWinnerId) {
      const winner = gamePlayers.find(p => p.id === newWinnerId);
      if (winner) {
        localStorage.removeItem('scorekeeper_saved_farkle');
        onGameFinished(winner.name, updatedScores);
      }
    }

    setTurnScore(0);
    setCustomScoreInput('');
  };

  const handleBank = () => {
    bankPoints(turnScore);
  };

  const handleFarkle = (sourceInput?: any) => {
    if (!gameState) return;
    const source: 'manual' | 'voice' = sourceInput === 'voice' ? 'voice' : 'manual';

    pushStateToHistory();
    playFarkle();
    const { activePlayerId, rounds, players: gamePlayers, finalRoundState } = gameState;
    const activePlayer = gamePlayers.find(p => p.id === activePlayerId);
    const activeIndex = gamePlayers.findIndex(p => p.id === activePlayerId);

    const activeRules = gameState.rules || houseRules || loadActiveHouseRules().farkle;
    const currentConsecutive = (gameState.consecutiveFarkles?.[activePlayerId] || 0) + 1;
    let penaltyDeduction = 0;
    let updatedConsecutiveFarkles = {
      ...(gameState.consecutiveFarkles || {}),
      [activePlayerId]: currentConsecutive,
    };
    let newScore = gameState.scores[activePlayerId] || 0;

    if (currentConsecutive >= 3 && activeRules.threeFarklesPenalty > 0) {
      penaltyDeduction = activeRules.threeFarklesPenalty;
      newScore = Math.max(0, newScore - penaltyDeduction);
      updatedConsecutiveFarkles[activePlayerId] = 0; // reset streak after penalty
      setHouseRuleAlert(
        `⚠️ 3 Consecutive Farkles! Penalty of -${penaltyDeduction.toLocaleString()} pts applied to ${activePlayer?.name || 'Player'}.`
      );
    } else if (currentConsecutive === 2 && activeRules.threeFarklesPenalty > 0) {
      setHouseRuleAlert(
        `⚠️ Warning: ${activePlayer?.name || 'Player'} has 2 consecutive Farkles! 1 more will trigger a -${activeRules.threeFarklesPenalty.toLocaleString()} pt penalty.`
      );
    }

    const actionItem: ActionLogItem = {
      id: Date.now().toString() + Math.random().toString().substring(2, 5),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      playerId: activePlayerId,
      playerName: activePlayer?.name || 'Player',
      playerColor: activePlayer?.color,
      actionType: 'farkle',
      description: penaltyDeduction > 0
        ? `Farkled 3 in a row! Penalty: -${penaltyDeduction.toLocaleString()} pts`
        : `Farkled (0 pts)`,
      points: penaltyDeduction > 0 ? -penaltyDeduction : 0,
      source,
    };
    const updatedRecentActions = [actionItem, ...(gameState.recentActions || [])].slice(0, 20);

    const updatedScores = penaltyDeduction > 0
      ? { ...gameState.scores, [activePlayerId]: newScore }
      : gameState.scores;

    // Record 0 points and Farkle
    let updatedRounds = [...rounds];
    let currentRoundObj = updatedRounds[gameState.currentRound - 1];
    if (!currentRoundObj) {
      currentRoundObj = { scores: {}, farkles: {} };
      updatedRounds.push(currentRoundObj);
    }
    currentRoundObj.scores[activePlayerId] = 0;
    currentRoundObj.farkles[activePlayerId] = true;

    let newFinalRoundState = finalRoundState ? { ...finalRoundState } : null;
    let newWinnerId: string | null = null;

    if (newFinalRoundState) {
      const remainingPending = newFinalRoundState.playersPendingTurn.filter(id => id !== activePlayerId);
      if (remainingPending.length === 0) {
        newWinnerId = newFinalRoundState.leaderId;
        newFinalRoundState = null;
      } else {
        newFinalRoundState.playersPendingTurn = remainingPending;
      }
    }

    let nextPlayerId = activePlayerId;
    if (!newWinnerId) {
      if (newFinalRoundState && newFinalRoundState.playersPendingTurn.length > 0) {
        nextPlayerId = newFinalRoundState.playersPendingTurn[0];
      } else {
        const nextIndex = (activeIndex + 1) % gamePlayers.length;
        nextPlayerId = gamePlayers[nextIndex].id;
      }
    }

    const isNewRound = (activeIndex + 1) % gamePlayers.length === 0;
    const nextRound = isNewRound ? gameState.currentRound + 1 : gameState.currentRound;

    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        scores: updatedScores,
        rounds: updatedRounds,
        currentRound: nextRound,
        activePlayerId: nextPlayerId,
        winnerId: newWinnerId,
        finalRoundState: newFinalRoundState,
        recentActions: updatedRecentActions,
        consecutiveFarkles: updatedConsecutiveFarkles,
      };
    });

    if (newWinnerId) {
      const winner = gamePlayers.find(p => p.id === newWinnerId);
      if (winner) {
        localStorage.removeItem('scorekeeper_saved_farkle');
        onGameFinished(winner.name, updatedScores);
      }
    }

    setTurnScore(0);
    setCustomScoreInput('');
  };

  const addCustomPoints = (points: number) => {
    setTurnScore(prev => prev + points);
  };

  const handleQuickAddAndBank = (pts: number) => {
    bankPoints(turnScore + pts);
  };

  const handleCustomScoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(customScoreInput);
    if (!isNaN(pts) && pts > 0) {
      bankPoints(turnScore + pts);
    }
  };

  // Score Editing Handlers
  const handleSavePlayerTotalScore = () => {
    if (!editingScorePlayer || !gameState) return;
    pushStateToHistory();
    const newScore = Math.max(0, parseInt(manualScoreValue) || 0);

    const actionItem: ActionLogItem = {
      id: Date.now().toString() + Math.random().toString().substring(2, 5),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      playerId: editingScorePlayer.id,
      playerName: editingScorePlayer.name,
      actionType: 'edit_score',
      description: `Total score edited to ${newScore.toLocaleString()} pts`,
      points: newScore,
      source: 'manual',
    };
    const updatedRecentActions = [actionItem, ...(gameState.recentActions || [])].slice(0, 20);

    const updatedScores = {
      ...gameState.scores,
      [editingScorePlayer.id]: newScore,
    };

    let newWinnerId = gameState.winnerId;
    if (newScore >= gameState.targetScore) {
      newWinnerId = editingScorePlayer.id;
    } else if (newWinnerId === editingScorePlayer.id && newScore < gameState.targetScore) {
      newWinnerId = null;
    }

    setGameState(prev => prev ? {
      ...prev,
      scores: updatedScores,
      winnerId: newWinnerId,
      recentActions: updatedRecentActions,
    } : null);

    setEditingScorePlayer(null);
  };

  const handleQuickAdjustTotalScore = (delta: number) => {
    const currentVal = parseInt(manualScoreValue) || 0;
    const newVal = Math.max(0, currentVal + delta);
    setManualScoreValue(newVal.toString());
  };

  const handleSaveTurnScore = () => {
    const val = Math.max(0, parseInt(manualTurnScoreInput) || 0);
    setTurnScore(val);
    setIsEditingTurnScore(false);
  };

  const handleSaveRoundScore = () => {
    if (!editingRoundData || !gameState) return;
    pushStateToHistory();
    const { roundIdx, playerId, currentRoundScore } = editingRoundData;
    const newScore = Math.max(0, parseInt(manualRoundScoreVal) || 0);

    const updatedRounds = [...gameState.rounds];
    if (updatedRounds[roundIdx]) {
      const diff = newScore - currentRoundScore;

      updatedRounds[roundIdx] = {
        ...updatedRounds[roundIdx],
        scores: {
          ...updatedRounds[roundIdx].scores,
          [playerId]: newScore,
        },
        farkles: {
          ...updatedRounds[roundIdx].farkles,
          [playerId]: newScore === 0,
        },
      };

      const currentTotal = gameState.scores[playerId] || 0;
      const updatedTotal = Math.max(0, currentTotal + diff);

      const actionItem: ActionLogItem = {
        id: Date.now().toString() + Math.random().toString().substring(2, 5),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        playerId: playerId,
        playerName: editingRoundData.playerName,
        actionType: 'edit_score',
        description: `Round ${roundIdx + 1} score edited to ${newScore.toLocaleString()} pts`,
        points: newScore,
        source: 'manual',
      };
      const updatedRecentActions = [actionItem, ...(gameState.recentActions || [])].slice(0, 20);

      setGameState(prev => prev ? {
        ...prev,
        rounds: updatedRounds,
        scores: {
          ...prev.scores,
          [playerId]: updatedTotal,
        },
        recentActions: updatedRecentActions,
      } : null);
    }
    setEditingRoundData(null);
  };



  // Reset Game Helper
  const resetGame = () => {
    setShowResetConfirm(true);
  };

  const confirmResetGame = () => {
    localStorage.removeItem('scorekeeper_saved_farkle');
    setIsSettingUp(true);
    setGameState(null);
    setHistoryStack([]);
    setShowResetConfirm(false);
  };

  const removePlayerFromActiveGame = (playerId: string) => {
    if (!gameState) return;
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
      setTurnScore(0);
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

  if (isSettingUp) {
    return (
      <div className="bg-white rounded-[32px] shadow-sm border-2 border-orange-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
          <h2 className="text-xl font-black text-teal-900 uppercase tracking-tight">
            Farkle Scoring Setup
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
                  id="quick-add-farkle-player"
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
                    const input = document.getElementById('quick-add-farkle-player') as HTMLInputElement;
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

          {/* Step 2: Game Options */}
          <div>
            <label className="block text-[10px] font-black text-teal-800 uppercase tracking-widest mb-2">
              Target Score (Points to win)
            </label>
            <div className="flex gap-2">
              {[2500, 5000, 10000].map(val => (
                <button
                  key={val}
                  onClick={() => setTargetScoreInput(val)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                    targetScoreInput === val
                      ? 'bg-orange-500 border-orange-500 text-white shadow-xs'
                      : 'bg-white border-orange-100 text-teal-900 hover:bg-orange-50/30'
                  }`}
                >
                  {val.toLocaleString()}
                </button>
              ))}
              <div className="relative flex-1">
                <input
                  type="number"
                  value={targetScoreInput}
                  onChange={(e) => setTargetScoreInput(Math.max(100, parseInt(e.target.value) || 0))}
                  className="w-full h-full px-3 text-xs font-black text-slate-950 dark:text-slate-900 border-2 border-orange-100 rounded-xl focus:outline-none focus:border-orange-400 focus:text-black"
                  placeholder="Custom"
                />
              </div>
            </div>
          </div>

          {/* Step 3: House Rules Configuration */}
          <div className="p-4 bg-orange-50/50 rounded-2xl border-2 border-orange-100/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-600" />
                <span className="text-[10px] font-black text-teal-900 uppercase tracking-widest">
                  Active House Rules
                </span>
              </div>
              {onOpenHouseRules && (
                <button
                  type="button"
                  onClick={onOpenHouseRules}
                  className="px-2.5 py-1 bg-white hover:bg-orange-100/60 text-orange-700 border border-orange-200 text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Sliders className="w-3 h-3" /> Customize Rules
                </button>
              )}
            </div>
            {(() => {
              const rules = houseRules || loadActiveHouseRules().farkle;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className="bg-white/80 p-2 rounded-xl border border-orange-100/70">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Opening Min:</span>
                    <span className="font-extrabold text-slate-800">
                      {rules.openingMinimum > 0 ? `${rules.openingMinimum.toLocaleString()} pts` : 'None'}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-orange-100/70">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">3 Farkles Penalty:</span>
                    <span className="font-extrabold text-slate-800">
                      {rules.threeFarklesPenalty > 0 ? `-${rules.threeFarklesPenalty.toLocaleString()} pts` : 'None'}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-orange-100/70">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">3 Pairs Combo:</span>
                    <span className="font-extrabold text-slate-800">
                      {rules.threePairsScore > 0 ? `${rules.threePairsScore.toLocaleString()} pts` : 'Disabled'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Start Button */}
          <button
            onClick={startNewGame}
            disabled={selectedPlayers.length === 0}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 text-white font-black rounded-full text-sm flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer uppercase tracking-wider"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Farkle Game
          </button>
        </div>
      </div>
    );
  }

  const handleVoiceCommandInFarkle = (result: VoiceCommandResult) => {
    if (!gameState || gameState.winnerId) return;

    if (result.actionType === 'bank') {
      if (typeof result.points === 'number' && result.points > 0) {
        bankPoints(result.points, 'voice');
        setTurnScore(0);
      } else if (turnScore > 0) {
        bankPoints(turnScore, 'voice');
        setTurnScore(0);
      }
    } else if (result.actionType === 'farkle') {
      handleFarkle();
    } else if (result.actionType === 'add_turn_points' && typeof result.points === 'number') {
      setTurnScore(prev => prev + result.points);
    } else if (result.actionType === 'undo') {
      handleUndo();
    }
  };

  if (!gameState || !gameState.players || gameState.players.length === 0) {
    if (isOnlineSynced) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/80 border-2 border-emerald-500/30 rounded-3xl text-center space-y-4 max-w-md mx-auto my-12 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Wifi className="w-7 h-7 animate-pulse" />
          </div>
          <h3 className="text-xl font-black text-white">Synchronizing Farkle Match...</h3>
          <p className="text-sm text-slate-400">Connecting devices and syncing players and scores in real-time.</p>
        </div>
      );
    }
    return null;
  }

  const activePlayer = (gameState.players && gameState.players.find(p => p.id === gameState.activePlayerId)) ||
    gameState.players[0] || { id: 'p1', name: 'Player 1', color: 'bg-emerald-500 text-white', avatar: '🍁' };
  const winner = gameState.winnerId ? gameState.players.find(p => p.id === gameState.winnerId) : null;

  const farkleGameSummaryText = (() => {
    const sorted = [...(gameState.players || [])].sort((a, b) => (gameState.scores?.[b.id] || 0) - (gameState.scores?.[a.id] || 0));
    const leader = sorted[0];
    return `${leader?.name || 'Leader'} is in first place with ${(gameState.scores?.[leader?.id] || 0).toLocaleString()} points. It is currently ${activePlayer?.name || 'Player'}'s turn!`;
  })();

  return (
    <div className="space-y-6">
      {/* Integrated Voice Assistant */}
      <VoiceAssistantWidget
        gameType="farkle"
        activePlayerName={activePlayer.name}
        gameSummaryText={farkleGameSummaryText}
        onExecuteCommand={handleVoiceCommandInFarkle}
      />

      {/* Final Round "Beat the Score" Banner */}
      {gameState.finalRoundState && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white rounded-[32px] p-5 sm:p-6 shadow-xl border-2 border-amber-300/40 relative overflow-hidden"
        >
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-yellow-300/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="bg-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Flame className="w-3.5 h-3.5 fill-current text-red-600 animate-pulse" />
                  Final Round - Beat The Score!
                </span>
                <span className="text-xs text-amber-100 font-bold">
                  Target: {(Number(gameState.targetScore) || 10000).toLocaleString()} pts
                </span>
              </div>

              {(() => {
                const leader = gameState.players.find(p => p.id === gameState.finalRoundState!.leaderId);
                const isCurrentLeader = gameState.activePlayerId === gameState.finalRoundState!.leaderId;
                const safeTurn = Number(turnScore) || 0;
                const activePlayerCurrentScore = (Number(gameState.scores[gameState.activePlayerId]) || 0) + safeTurn;
                const highScoreToBeat = Number(gameState.finalRoundState!.highScoreToBeat) || 0;
                const pointsNeeded = Math.max(1, highScoreToBeat - activePlayerCurrentScore + 1);

                return (
                  <div>
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight flex flex-wrap items-center gap-2">
                      <span>👑 Score to Beat:</span>
                      <span className="text-yellow-300 font-black">{leader?.name} ({highScoreToBeat.toLocaleString()} pts)</span>
                    </h3>
                    <p className="text-xs font-bold text-amber-100 mt-1">
                      {isCurrentLeader ? (
                        <span className="text-yellow-200 bg-black/20 px-2.5 py-1 rounded-lg inline-block border border-yellow-300/30">
                          ⭐ You hold the high score! Waiting for remaining players to take their turn...
                        </span>
                      ) : (
                        <span className="bg-black/20 px-2.5 py-1 rounded-lg inline-block border border-yellow-300/30">
                          🎯 <strong className="text-yellow-300">{activePlayer.name}</strong> needs <strong className="text-yellow-300 font-mono text-sm">{pointsNeeded.toLocaleString()} pts</strong> on this turn to take the lead!
                        </span>
                      )}
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="bg-black/30 border border-white/20 rounded-2xl p-3.5 text-left md:text-right w-full md:w-auto shrink-0">
              <span className="text-[9px] uppercase tracking-widest text-amber-200 font-black block mb-1.5">
                Final Turns Remaining ({gameState.finalRoundState.playersPendingTurn.length}):
              </span>
              <div className="flex flex-wrap gap-1.5 justify-start md:justify-end">
                {gameState.players.map(p => {
                  const isLeader = p.id === gameState.finalRoundState!.leaderId;
                  const isPending = gameState.finalRoundState!.playersPendingTurn.includes(p.id);
                  const isCurrent = p.id === gameState.activePlayerId;

                  if (isLeader) {
                    return (
                      <span key={p.id} className="text-[10px] font-black bg-yellow-400 text-slate-950 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        👑 {p.name}
                      </span>
                    );
                  }
                  return (
                    <span
                      key={p.id}
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all ${
                        isPending
                          ? isCurrent
                            ? 'bg-orange-500 text-white font-black ring-2 ring-yellow-300 scale-105'
                            : 'bg-white/20 text-white'
                          : 'bg-black/30 text-amber-200/50 line-through'
                      }`}
                    >
                      {p.name} {isPending ? '⏳' : '✓'}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* House Rule Alerts */}
      <AnimatePresence>
        {houseRuleAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-amber-500 text-amber-950 border-2 border-amber-600/30 rounded-2xl text-xs font-black shadow-md flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-950" />
              <span>{houseRuleAlert}</span>
            </div>
            <button
              onClick={() => setHouseRuleAlert(null)}
              className="p-1 hover:bg-amber-600/20 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn Banner */}
      <div className="bg-teal-600 text-white rounded-[32px] p-6 shadow-lg border-2 border-teal-500/20 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-orange-500/20 rounded-full blur-2xl" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-[10px] font-black text-orange-300 uppercase tracking-widest flex items-center gap-1 bg-teal-700/50 w-fit px-2.5 py-1 rounded-full border border-teal-500/30">
                <Flame className="w-3.5 h-3.5 fill-current" />
                Active Turn - Round {gameState.currentRound}
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
              {onOpenHouseRules && (
                <button
                  onClick={onOpenHouseRules}
                  className="px-2.5 py-1 bg-teal-700/70 hover:bg-teal-700 text-teal-100 font-bold rounded-full text-[10px] flex items-center gap-1 transition-all cursor-pointer border border-teal-500/30"
                  title="View or modify active House Rules"
                >
                  <Sliders className="w-3 h-3 text-amber-300" />
                  House Rules
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <div className={`w-4 h-4 rounded-full ${activePlayer.color.split(' ')[0]} ring-2 ring-white`} />
              <h2 className="text-2xl font-black tracking-tight uppercase">
                {activePlayer.name}'s Roll
              </h2>
            </div>
            {(() => {
              const activeRules = gameState.rules || houseRules || loadActiveHouseRules().farkle;
              const streak = gameState.consecutiveFarkles?.[gameState.activePlayerId] || 0;
              if (streak >= 2 && activeRules.threeFarklesPenalty > 0) {
                return (
                  <div className="mt-2 px-3 py-1 bg-red-500/30 border border-red-300/40 rounded-xl text-[11px] font-black text-red-100 flex items-center gap-1.5 w-fit">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-300" />
                    <span>Warning: 2 consecutive Farkles! Next Farkle costs -{activeRules.threeFarklesPenalty.toLocaleString()} pts.</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="flex items-center gap-3 bg-white/10 border border-white/20 px-5 py-3 rounded-2xl backdrop-blur-md">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-[9px] text-teal-100 font-bold uppercase tracking-widest">
                <span>Unbanked Turn Score</span>
                <button
                  onClick={() => {
                    setManualTurnScoreInput(turnScore.toString());
                    setIsEditingTurnScore(true);
                  }}
                  className="p-1 text-yellow-300 hover:text-white rounded transition-colors cursor-pointer"
                  title="Edit current turn score"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
              {isEditingTurnScore ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={manualTurnScoreInput}
                    onChange={(e) => setManualTurnScoreInput(e.target.value)}
                    className="w-24 px-2 py-1 bg-teal-900/90 text-yellow-300 font-mono text-lg font-black border border-yellow-300 rounded-lg focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTurnScore}
                    className="p-1 bg-yellow-400 hover:bg-yellow-300 text-teal-950 font-black rounded-lg text-xs cursor-pointer"
                  >
                    Set
                  </button>
                  <button
                    onClick={() => setIsEditingTurnScore(false)}
                    className="p-1 bg-teal-800 text-teal-200 hover:text-white rounded-lg text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="font-mono text-3xl font-black text-yellow-300">
                  {(Number(turnScore) || 0).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Target Progress Bar */}
        {(() => {
          const target = Math.max(100, Number(gameState.targetScore) || 10000);
          const safeTurn = Number(turnScore) || 0;
          const currentTotal = (Number(gameState.scores[gameState.activePlayerId]) || 0) + safeTurn;
          const pct = Math.min(100, Math.max(0, Math.round((currentTotal / target) * 100)));
          return (
            <div className="mt-6 pt-4 border-t border-teal-500/30">
              <div className="flex justify-between text-xs text-teal-100 mb-1.5 font-bold uppercase tracking-wider">
                <span>Target: {target.toLocaleString()} pts</span>
                <span>Current Score: {currentTotal.toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 bg-teal-800/80 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300 bg-yellow-400"
                  style={{
                    width: `${pct}%`,
                  }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Main Scorer Interface */}
      <div className="grid grid-cols-1 landscape:grid-cols-12 md:grid-cols-12 gap-6">
        {/* Left: Active Controls & Interactive Scorer */}
        <div className="landscape:col-span-7 md:col-span-7 lg:col-span-8 space-y-4 sm:space-y-6">
          {/* Scorer Controls & Quick Adder */}
          <div className="bg-white rounded-[32px] shadow-sm border-2 border-orange-100 p-6 space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-teal-800 uppercase tracking-widest mb-4">
                Roll Scoring Scratchpad
              </h3>

              {/* Turn Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleBank}
                  disabled={turnScore === 0}
                  className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-black rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md uppercase tracking-wider"
                >
                  <CheckCircle className="w-4 h-4" />
                  Bank Points
                </button>

                <button
                  onClick={() => handleFarkle('manual')}
                  className="py-3.5 px-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md uppercase tracking-wider"
                >
                  <AlertCircle className="w-4 h-4" />
                  Farkle! (0 pts)
                </button>

                <button
                  onClick={() => setTurnScore(0)}
                  disabled={turnScore === 0}
                  className="col-span-2 sm:col-span-1 py-3.5 px-4 border-2 border-orange-100 hover:bg-orange-50/50 text-orange-900 font-black rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear Turn
                </button>
              </div>
            </div>

            {/* Quick point adders */}
            <div className="pt-4 border-t border-orange-100">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[10px] font-black text-teal-800 uppercase tracking-widest">
                  Quick Points Adder
                </h4>
                <span className="text-[9px] font-black text-orange-600 bg-orange-100/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Banks score & passes turn
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[50, 100, 300, 500, 1000, 1500].map(pts => (
                  <button
                    key={pts}
                    onClick={() => handleQuickAddAndBank(pts)}
                    className="px-3.5 py-2 bg-orange-50 hover:bg-orange-500 hover:text-white text-orange-950 border-2 border-orange-200/80 font-mono font-black rounded-xl text-xs transition-all cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    +{pts}
                  </button>
                ))}
              </div>

              {/* House Rule Combinations */}
              {(() => {
                const rules = gameState.rules || houseRules || loadActiveHouseRules().farkle;
                const combos = [
                  { label: '3 Pairs', pts: rules.threePairsScore },
                  { label: 'Full House', pts: rules.fullHouseScore },
                  { label: 'Straight (1-6)', pts: rules.straightScore },
                ].filter(c => c.pts > 0);

                if (combos.length === 0) return null;
                return (
                  <div className="mt-3 pt-3 border-t border-orange-100/70">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" /> House Rule Combinations
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {combos.map(c => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => addCustomPoints(c.pts)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-950 border border-amber-200 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                          title={`Add ${c.label} (${c.pts} pts) to current turn`}
                        >
                          <span>{c.label}</span>
                          <span className="font-mono font-black text-[11px]">+{c.pts}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Custom points input */}
              <form onSubmit={handleCustomScoreSubmit} className="flex gap-2 mt-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">
                    <Hash className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="number"
                    value={customScoreInput}
                    onChange={(e) => setCustomScoreInput(e.target.value)}
                    placeholder="Enter Custom Score Amount..."
                    className="w-full pl-9 pr-3 py-2.5 bg-orange-50/30 border-2 border-orange-200/80 rounded-2xl text-sm font-black text-slate-950 dark:text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-orange-500 focus:bg-white focus:text-black focus:ring-2 focus:ring-orange-400/30 transition-all shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customScoreInput || parseInt(customScoreInput) <= 0}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-full text-sm font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                >
                  Add & Bank
                </button>
              </form>
            </div>
          </div>

          {/* Recent Actions Log */}
          <div className="bg-white rounded-[32px] shadow-sm border-2 border-orange-100 p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-600" />
                <h3 className="text-[11px] font-black text-teal-800 uppercase tracking-widest">
                  Recent Actions
                </h3>
                <span className="px-2 py-0.5 bg-orange-100/70 text-orange-800 text-[9px] font-black rounded-full uppercase tracking-wider">
                  Last 3 Updates
                </span>
              </div>
              <button
                onClick={toggleVoiceListening}
                className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                  isListening
                    ? 'bg-purple-600 text-white animate-pulse ring-2 ring-purple-300'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                }`}
                title="Voice Score Input"
              >
                <Mic className="w-3.5 h-3.5" />
                {isListening ? 'Listening...' : 'Voice Update'}
              </button>
            </div>

            {voiceFeedback && (
              <div className="p-2.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold text-center">
                {voiceFeedback}
              </div>
            )}

            {(!gameState.recentActions || gameState.recentActions.length === 0) ? (
              <div className="text-center py-4 text-slate-400 text-xs font-semibold italic bg-orange-50/20 rounded-2xl border border-dashed border-orange-100">
                No score updates logged yet this game.
              </div>
            ) : (
              <div className="space-y-2">
                {gameState.recentActions.slice(0, 3).map((item) => {
                  const player = gameState.players.find(p => p.id === item.playerId);
                  const colorClass = (player?.color || item.playerColor || 'bg-orange-500').split(' ')[0];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-6 h-6 rounded-full ${colorClass} text-white font-bold text-[10px] flex items-center justify-center shrink-0`}>
                          {player?.avatar || item.playerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800 truncate">
                              {item.playerName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.timestamp}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-600 truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {item.source === 'voice' ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Mic className="w-2.5 h-2.5" />
                            Voice
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Hand className="w-2.5 h-2.5" />
                            Manual
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


        </div>

        {/* Right: Leaderboard & Game State */}
        <div className="landscape:col-span-5 md:col-span-5 lg:col-span-4 space-y-4 sm:space-y-6">
          {/* Standings */}
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
                      className={`p-3.5 rounded-2xl border-2 flex flex-col gap-1 transition-all ${
                        isCurrent
                          ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20'
                          : 'border-orange-100/40 bg-orange-50/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-black text-teal-800/60">#{idx + 1}</span>
                          <div className={`w-6 h-6 rounded-full ${colorClass} ring-1 ring-black/10 flex items-center justify-center text-xs text-white font-bold shrink-0`}>
                            {player.avatar || player.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-gray-700 text-sm uppercase tracking-tight truncate max-w-[100px] sm:max-w-[120px]">
                            {player.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-teal-900 text-sm">
                            {score.toLocaleString()}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingScorePlayer({ id: player.id, name: player.name, currentScore: score });
                              setManualScoreValue(score.toString());
                            }}
                            className="p-1 text-slate-400 hover:text-orange-600 rounded-lg hover:bg-orange-100/80 transition-colors cursor-pointer"
                            title="Edit Current Total Score"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
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

                      {gameState.finalRoundState && (
                        <div className="text-[10px] font-bold pt-1 border-t border-orange-100/60 flex items-center justify-between">
                          {player.id === gameState.finalRoundState.leaderId ? (
                            <span className="text-amber-600 dark:text-amber-400 font-black flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200">
                              👑 Leader to Beat
                            </span>
                          ) : gameState.finalRoundState.playersPendingTurn.includes(player.id) ? (
                            <span className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-200">
                              ⏳ Final Turn Pending
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium flex items-center gap-1 bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-md border border-slate-200/50">
                              ✓ Final Turn Taken
                            </span>
                          )}
                        </div>
                      )}
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

          {/* History / Logs */}
          <div className="bg-white rounded-[32px] shadow-sm border-2 border-orange-100 p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-[10px] font-black text-teal-800 uppercase tracking-widest">
                Round Scoring History
              </h3>
              {gameState.rounds.length > 0 && (
                <span className="px-2 py-0.5 bg-orange-100/70 text-orange-800 text-[9px] font-black rounded-full uppercase tracking-wider">
                  {gameState.rounds.length > 5 ? `Last 5 of ${gameState.rounds.length} Rounds` : `${gameState.rounds.length} ${gameState.rounds.length === 1 ? 'Round' : 'Rounds'}`}
                </span>
              )}
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {gameState.rounds
                .map((round, originalIdx) => ({ round, originalIdx }))
                .slice(-5)
                .reverse()
                .map(({ round, originalIdx: rIdx }) => (
                  <div key={rIdx} className="p-3.5 bg-orange-50/30 rounded-2xl border border-orange-100/60 text-xs">
                    <div className="flex items-center justify-between font-black text-orange-600 uppercase tracking-wider text-[10px] mb-1.5 pb-1 border-b border-orange-100/40">
                      <span>Round {rIdx + 1}</span>
                      {rIdx === gameState.rounds.length - 1 && (
                        <span className="text-[9px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded font-bold">Latest</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {gameState.players.map(p => {
                        const rScore = round.scores[p.id];
                        const wasFarkle = round.farkles[p.id];
                        return (
                          <div key={p.id} className="flex justify-between items-center text-gray-700 font-semibold">
                            <span className="truncate flex items-center gap-1">
                              {p.avatar && <span className="text-xs">{p.avatar}</span>}
                              <span>{p.name}:</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold">
                                {wasFarkle ? (
                                  <span className="text-red-600 bg-red-50 border border-red-100 font-black rounded-lg px-2 py-0.5 text-[9px] uppercase tracking-wider">
                                    Farkle
                                  </span>
                                ) : rScore !== undefined ? (
                                  rScore.toLocaleString()
                                ) : (
                                  '--'
                                )}
                              </span>
                              {rScore !== undefined && (
                                <button
                                  onClick={() => {
                                    setEditingRoundData({
                                      roundIdx: rIdx,
                                      playerId: p.id,
                                      playerName: p.name,
                                      currentRoundScore: rScore,
                                    });
                                    setManualRoundScoreVal(rScore.toString());
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-orange-600 rounded cursor-pointer"
                                  title="Edit Round Score"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              {gameState.rounds.length === 0 && (
                <div className="text-center py-6 text-teal-800/40 text-xs font-semibold">
                  History will appear after scores are banked or players Farkle!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PLAYER TOTAL SCORE OVERLAY */}
      <AnimatePresence>
        {editingScorePlayer && (
          <div className="fixed inset-0 bg-teal-950/70 flex items-center justify-center p-4 z-55 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl border-2 border-orange-100 p-8 max-w-sm w-full text-center relative overflow-hidden space-y-5"
            >
              <button
                onClick={() => setEditingScorePlayer(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mx-auto w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                <Edit2 className="w-7 h-7" />
              </div>

              <div>
                <h2 className="text-xl font-black text-teal-900 tracking-tight uppercase">
                  Edit Farkle Score
                </h2>
                <p className="text-slate-500 text-xs mt-1 font-bold">
                  Updating total score for <span className="text-orange-600">{editingScorePlayer.name}</span>
                </p>
              </div>

              {/* Score input & quick adjustments */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    value={manualScoreValue}
                    onChange={(e) => setManualScoreValue(e.target.value)}
                    className="w-full text-center text-3xl font-mono font-black py-3 px-4 bg-orange-50/50 border-2 border-orange-200 rounded-2xl text-teal-950 focus:outline-none focus:border-orange-500"
                    placeholder="0"
                    autoFocus
                  />
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Points</span>
                </div>

                <div className="flex flex-wrap gap-1.5 justify-center">
                  {[-1000, -500, -100, +100, +500, +1000].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => handleQuickAdjustTotalScore(delta)}
                      className="px-2.5 py-1 text-xs font-mono font-black bg-slate-100 hover:bg-orange-500 hover:text-white text-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingScorePlayer(null)}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePlayerTotalScore}
                  className="py-3 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" /> Save Score
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT ROUND SCORE OVERLAY */}
      <AnimatePresence>
        {editingRoundData && (
          <div className="fixed inset-0 bg-teal-950/70 flex items-center justify-center p-4 z-55 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl border-2 border-orange-100 p-8 max-w-sm w-full text-center relative overflow-hidden space-y-5"
            >
              <button
                onClick={() => setEditingRoundData(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mx-auto w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-700">
                <Edit3 className="w-7 h-7" />
              </div>

              <div>
                <h2 className="text-xl font-black text-teal-900 tracking-tight uppercase">
                  Edit Round {editingRoundData.roundIdx + 1}
                </h2>
                <p className="text-slate-500 text-xs mt-1 font-bold">
                  Score for <span className="text-teal-700">{editingRoundData.playerName}</span>
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="number"
                  value={manualRoundScoreVal}
                  onChange={(e) => setManualRoundScoreVal(e.target.value)}
                  className="w-full text-center text-2xl font-mono font-black py-3 px-4 bg-teal-50/50 border-2 border-teal-200 rounded-2xl text-teal-950 focus:outline-none focus:border-teal-500"
                  placeholder="0"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoundData(null)}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoundScore}
                  className="py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" /> Save Round
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                Are you sure you want to reset the current Farkle game scorecard? All current player scores and logs will be permanently deleted.
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
                from the active game? Their score and active standings will be permanently removed.
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
    </div>
  );
}
