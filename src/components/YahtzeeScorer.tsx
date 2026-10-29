import React, { useState, useEffect, useRef } from 'react';
import { Player, YahtzeeState, YahtzeeCategory, YahtzeePlayerScore, ActionLogItem, YahtzeeHouseRules } from '../types';
import { Play, RotateCcw, Award, Check, X, ShieldAlert, Sparkles, AlertCircle, Trash2, UserPlus, Plus, Undo, Activity, Mic, Hand, Clock, Wifi, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, saveActiveGameToFirestore, deleteSavedGameFromFirestore } from '../lib/firebase';
import { useSound } from '../lib/SoundContext';
import { VoiceAssistantWidget, VoiceCommandResult } from './VoiceAssistantWidget';
import { safeClone, safeJsonStringify } from '../lib/utils';
import { loadActiveHouseRules } from '../lib/houseRules';

interface YahtzeeScorerProps {
  players: Player[];
  onGameFinished: (winnerName: string, finalScores: Record<string, number>) => void;
  onAddPlayer?: (name: string, color: string) => Player;
  externalGameState?: YahtzeeState | null;
  onSyncGameRoom?: (newGameState: YahtzeeState) => void;
  isOnlineSynced?: boolean;
  houseRules?: YahtzeeHouseRules;
  onOpenHouseRules?: () => void;
}

const CATEGORIES: { key: YahtzeeCategory; label: string; desc: string; max?: number; isUpper: boolean }[] = [
  // Upper
  { key: 'aces', label: 'Aces ⚀', desc: 'Count & add 1s', max: 5, isUpper: true },
  { key: 'twos', label: 'Twos ⚁', desc: 'Count & add 2s', max: 10, isUpper: true },
  { key: 'threes', label: 'Threes ⚂', desc: 'Count & add 3s', max: 15, isUpper: true },
  { key: 'fours', label: 'Fours ⚃', desc: 'Count & add 4s', max: 20, isUpper: true },
  { key: 'fives', label: 'Fives ⚄', desc: 'Count & add 5s', max: 25, isUpper: true },
  { key: 'sixes', label: 'Sixes ⚅', desc: 'Count & add 6s', max: 30, isUpper: true },
  // Lower
  { key: 'threeOfAKind', label: '3 of a Kind', desc: 'Sum of all dice', max: 30, isUpper: false },
  { key: 'fourOfAKind', label: '4 of a Kind', desc: 'Sum of all dice', max: 30, isUpper: false },
  { key: 'fullHouse', label: 'Full House', desc: 'Three of one, pair of another (25 pts)', max: 25, isUpper: false },
  { key: 'smallStraight', label: 'Sm. Straight', desc: 'Sequence of 4 dice (30 pts)', max: 30, isUpper: false },
  { key: 'largeStraight', label: 'Lg. Straight', desc: 'Sequence of 5 dice (40 pts)', max: 40, isUpper: false },
  { key: 'yahtzee', label: 'YAHTZEE', desc: '5 of a kind (50 pts)', max: 50, isUpper: false },
  { key: 'chance', label: 'Chance', desc: 'Sum of any dice', max: 30, isUpper: false },
];

const createEmptyScoreSheet = (): YahtzeePlayerScore => ({
  aces: null,
  twos: null,
  threes: null,
  fours: null,
  fives: null,
  sixes: null,
  threeOfAKind: null,
  fourOfAKind: null,
  fullHouse: null,
  smallStraight: null,
  largeStraight: null,
  yahtzee: null,
  chance: null,
  yahtzeeBonusCount: 0,
});

export default function YahtzeeScorer({
  players,
  onGameFinished,
  onAddPlayer,
  externalGameState,
  onSyncGameRoom,
  isOnlineSynced,
  houseRules,
  onOpenHouseRules,
}: YahtzeeScorerProps) {
  const { playBank, playFarkle, playUndo } = useSound();
  const [gameState, setGameState] = useState<YahtzeeState | null>(() => {
    if (externalGameState && Array.isArray(externalGameState.players) && externalGameState.players.length > 0) {
      return externalGameState;
    }
    return null;
  });
  const [historyStack, setHistoryStack] = useState<YahtzeeState[]>([]);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(() => {
    if (externalGameState && Array.isArray(externalGameState.players) && externalGameState.players.length > 0) {
      return false;
    }
    return true;
  });
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const getActiveRules = (): YahtzeeHouseRules => {
    return gameState?.rules || houseRules || loadActiveHouseRules().yahtzee;
  };

  const getCategoryDescription = (catKey: YahtzeeCategory, rules: YahtzeeHouseRules): string => {
    switch (catKey) {
      case 'fullHouse': return `Three of one, pair of another (${rules.fullHouseScore ?? 25} pts)`;
      case 'smallStraight': return `Sequence of 4 dice (${rules.smallStraightScore ?? 30} pts)`;
      case 'largeStraight': return `Sequence of 5 dice (${rules.largeStraightScore ?? 40} pts)`;
      case 'yahtzee': return `5 of a kind (${rules.yahtzeeScore ?? 50} pts)`;
      default: {
        const found = CATEGORIES.find(c => c.key === catKey);
        return found?.desc || '';
      }
    }
  };

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
    setEditingCell(null);
  };

  // Custom confirmation modals state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [playerToRemoveId, setPlayerToRemoveId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Active game player management state
  const [showAddPlayerInGame, setShowAddPlayerInGame] = useState(false);
  const [inGameNewPlayerName, setInGameNewPlayerName] = useState('');

  // Dialog / Input overlay state
  const [editingCell, setEditingCell] = useState<{
    playerId: string;
    category: YahtzeeCategory;
  } | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Check for saved game on mount (ONLY for local/offline mode, not when connected to an online room)
  useEffect(() => {
    if (isOnlineSynced || (externalGameState && Array.isArray(externalGameState.players) && externalGameState.players.length > 0)) {
      return;
    }
    const saved = localStorage.getItem('scorekeeper_saved_yahtzee');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.gameState) {
          setGameState(parsed.gameState);
          setIsSettingUp(false);
        }
      } catch (err) {
        console.error("Error loading saved Yahtzee game", err);
      }
    }
  }, [isOnlineSynced]);

  const isIncomingSyncRef = useRef<boolean>(false);
  const lastReceivedExternalJsonRef = useRef<string>(
    externalGameState && Array.isArray(externalGameState.players) && externalGameState.players.length > 0
      ? safeJsonStringify({ gameState: externalGameState })
      : ''
  );

  // Listen to external online game room updates
  useEffect(() => {
    if (!externalGameState || !Array.isArray(externalGameState.players) || externalGameState.players.length === 0) {
      return;
    }

    const incomingJson = safeJsonStringify({ gameState: externalGameState });

    // If identical to what we already recorded as the external state, ignore
    if (incomingJson === lastReceivedExternalJsonRef.current) {
      return;
    }

    // Also compare against current local state to avoid setting identical state
    const currentJson = safeJsonStringify({ gameState });
    if (incomingJson === currentJson) {
      lastReceivedExternalJsonRef.current = incomingJson;
      return;
    }

    // Mark as incoming sync so the local change effect will NOT echo back to Firestore
    isIncomingSyncRef.current = true;
    lastReceivedExternalJsonRef.current = incomingJson;

    setGameState(externalGameState);
    setIsSettingUp(false);
  }, [externalGameState]);

  // Save game progress automatically whenever gameState changes
  useEffect(() => {
    if (gameState && Array.isArray(gameState.players) && gameState.players.length > 0) {
      // If this state update was received from the external room, do not echo back or overwrite local solo save
      if (isIncomingSyncRef.current) {
        isIncomingSyncRef.current = false;
        return;
      }

      if (!isOnlineSynced) {
        if (gameState.isCompleted || gameState.winnerId) {
          localStorage.removeItem('scorekeeper_saved_yahtzee');
          if (auth.currentUser) {
            deleteSavedGameFromFirestore(auth.currentUser.uid, 'yahtzee');
          }
        } else {
          const savedData = {
            gameType: 'yahtzee' as const,
            gameState,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem('scorekeeper_saved_yahtzee', safeJsonStringify(savedData));
          if (auth.currentUser) {
            saveActiveGameToFirestore(auth.currentUser.uid, 'yahtzee', savedData);
          }
        }
      }

      // Check if this update came from external sync before echoing to Firestore
      if (isOnlineSynced && onSyncGameRoom) {
        const currentJson = safeJsonStringify({ gameState });
        if (currentJson !== lastReceivedExternalJsonRef.current) {
          lastReceivedExternalJsonRef.current = currentJson;
          onSyncGameRoom(gameState);
        }
      }
    }
  }, [gameState, isOnlineSynced]);

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
        [player.id]: createEmptyScoreSheet(),
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

    const initialScores: Record<string, YahtzeePlayerScore> = {};
    gamePlayers.forEach(p => {
      initialScores[p.id] = createEmptyScoreSheet();
    });

    const activeRules = houseRules || loadActiveHouseRules().yahtzee;

    setHistoryStack([]);
    setGameState({
      players: gamePlayers,
      scores: initialScores,
      activePlayerId: gamePlayers[0].id,
      winnerId: null,
      isCompleted: false,
      rules: activeRules,
    });

    setIsSettingUp(false);
    setEditingCell(null);
  };

  const calculateSubtotal = (scoreSheet?: YahtzeePlayerScore | null): number => {
    if (!scoreSheet) return 0;
    let sum = 0;
    const keys: (keyof YahtzeePlayerScore)[] = ['aces', 'twos', 'threes', 'fours', 'fives', 'sixes'];
    keys.forEach(k => {
      const v = Number(scoreSheet[k]);
      if (!isNaN(v) && scoreSheet[k] !== null && scoreSheet[k] !== undefined) {
        sum += v;
      }
    });
    return isNaN(sum) ? 0 : sum;
  };

  const calculateBonus = (scoreSheet?: YahtzeePlayerScore | null): number => {
    const subtotal = calculateSubtotal(scoreSheet);
    const rules = getActiveRules();
    const threshold = rules.upperBonusThreshold ?? 63;
    const bonus = rules.upperBonusAmount ?? 35;
    return subtotal >= threshold ? bonus : 0;
  };

  const calculateUpperTotal = (scoreSheet?: YahtzeePlayerScore | null): number => {
    return calculateSubtotal(scoreSheet) + calculateBonus(scoreSheet);
  };

  const calculateLowerTotal = (scoreSheet?: YahtzeePlayerScore | null): number => {
    if (!scoreSheet) return 0;
    let sum = 0;
    const keys: (keyof YahtzeePlayerScore)[] = [
      'threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'
    ];
    keys.forEach(k => {
      const v = Number(scoreSheet[k]);
      if (!isNaN(v) && scoreSheet[k] !== null && scoreSheet[k] !== undefined) {
        sum += v;
      }
    });
    const bonusCount = Number(scoreSheet.yahtzeeBonusCount);
    if (!isNaN(bonusCount) && bonusCount > 0) {
      const rules = getActiveRules();
      sum += bonusCount * (rules.extraYahtzeeBonus ?? 100);
    }
    return isNaN(sum) ? 0 : sum;
  };

  const calculateGrandTotal = (scoreSheet?: YahtzeePlayerScore | null): number => {
    const total = calculateUpperTotal(scoreSheet) + calculateLowerTotal(scoreSheet);
    return isNaN(total) ? 0 : total;
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
        setVoiceFeedback('Listening... Say e.g. "Full house 25" or "Aces 3"');
      };

      recognition.onresult = (event: any) => {
        setIsListening(false);
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        setVoiceFeedback(`Heard: "${transcript}"`);
        setTimeout(() => setVoiceFeedback(null), 3500);

        if (!gameState) return;
        const activePlayerId = gameState.activePlayerId;

        let matchedCategory: YahtzeeCategory | null = null;
        if (transcript.includes('ace') || transcript.includes('one')) matchedCategory = 'aces';
        else if (transcript.includes('two')) matchedCategory = 'twos';
        else if (transcript.includes('three') && !transcript.includes('kind')) matchedCategory = 'threes';
        else if (transcript.includes('four') && !transcript.includes('kind')) matchedCategory = 'fours';
        else if (transcript.includes('five')) matchedCategory = 'fives';
        else if (transcript.includes('six')) matchedCategory = 'sixes';
        else if (transcript.includes('full house')) matchedCategory = 'fullHouse';
        else if (transcript.includes('small straight')) matchedCategory = 'smallStraight';
        else if (transcript.includes('large straight')) matchedCategory = 'largeStraight';
        else if (transcript.includes('yahtzee')) matchedCategory = 'yahtzee';
        else if (transcript.includes('three of a kind') || transcript.includes('3 of a kind')) matchedCategory = 'threeOfAKind';
        else if (transcript.includes('four of a kind') || transcript.includes('4 of a kind')) matchedCategory = 'fourOfAKind';
        else if (transcript.includes('chance')) matchedCategory = 'chance';

        const matchNum = transcript.match(/\d+/);
        const scoreVal = matchNum ? parseInt(matchNum[0], 10) : (transcript.includes('zero') || transcript.includes('scratch') ? 0 : null);

        if (matchedCategory && scoreVal !== null) {
          pushStateToHistory();
          if (scoreVal === 0) playFarkle();
          else playBank();

          const player = gameState.players.find(p => p.id === activePlayerId);
          const catObj = CATEGORIES.find(c => c.key === matchedCategory);
          const desc = scoreVal === 0 
            ? `Zeroed out ${catObj?.label || matchedCategory}`
            : `Scored +${scoreVal} pts in ${catObj?.label || matchedCategory}`;

          const actionItem: ActionLogItem = {
            id: Date.now().toString() + Math.random().toString().substring(2, 5),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            playerId: activePlayerId,
            playerName: player?.name || 'Player',
            playerColor: player?.color,
            actionType: 'edit_score',
            description: desc,
            points: scoreVal,
            source: 'voice',
          };
          const updatedRecentActions = [actionItem, ...(gameState.recentActions || [])].slice(0, 20);

          const updatedSheet = {
            ...gameState.scores[activePlayerId],
            [matchedCategory]: scoreVal,
          };
          const updatedScores = {
            ...gameState.scores,
            [activePlayerId]: updatedSheet,
          };

          const activeIdx = gameState.players.findIndex(p => p.id === activePlayerId);
          const nextIdx = (activeIdx + 1) % gameState.players.length;
          const nextPlayerId = gameState.players[nextIdx].id;

          setGameState({
            ...gameState,
            scores: updatedScores,
            activePlayerId: nextPlayerId,
            recentActions: updatedRecentActions,
          });
          setEditingCell(null);
          setVoiceFeedback(`Logged ${scoreVal} pts for ${catObj?.label} (Voice)!`);
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

  const handleCellClick = (playerId: string, category: YahtzeeCategory) => {
    if (!gameState || gameState.isCompleted) return;
    
    const existingVal = gameState.scores[playerId][category] as number | null;
    setEditingCell({ playerId, category });
    setInputValue(existingVal !== null ? existingVal.toString() : '');
  };

  const handleSaveScore = (val: number | null, sourceInput?: any) => {
    if (!gameState || !editingCell) return;
    const source: 'manual' | 'voice' = sourceInput === 'voice' ? 'voice' : 'manual';
    pushStateToHistory();
    if (val === 0) {
      playFarkle();
    } else if (val !== null) {
      playBank();
    }
    const { playerId, category } = editingCell;
    const player = gameState.players.find(p => p.id === playerId);
    const catObj = CATEGORIES.find(c => c.key === category);

    const desc = val === 0 
      ? `Zeroed out ${catObj?.label || category}`
      : `Scored +${val} pts in ${catObj?.label || category}`;

    const actionItem: ActionLogItem = {
      id: Date.now().toString() + Math.random().toString().substring(2, 5),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      playerId,
      playerName: player?.name || 'Player',
      playerColor: player?.color,
      actionType: 'edit_score',
      description: desc,
      points: val || 0,
      source,
    };
    const updatedRecentActions = [actionItem, ...(gameState.recentActions || [])].slice(0, 20);

    // Update individual score
    const updatedSheet = {
      ...gameState.scores[playerId],
      [category]: val,
    };

    const updatedScores = {
      ...gameState.scores,
      [playerId]: updatedSheet,
    };

    // Calculate game progress/completion
    let allCompleted = true;
    const totals: Record<string, number> = {};

    gameState.players.forEach(p => {
      const sheet = updatedScores[p.id];
      const itemsFilled = CATEGORIES.every(cat => sheet[cat.key] !== null);
      if (!itemsFilled) {
        allCompleted = false;
      }
      totals[p.id] = calculateGrandTotal(sheet);
    });

    let winnerId = null;
    if (allCompleted) {
      let highestScore = -1;
      gameState.players.forEach(p => {
        if (totals[p.id] > highestScore) {
          highestScore = totals[p.id];
          winnerId = p.id;
        }
      });
    }

    // Cycle to next player whose turn it might be
    const activeIdx = gameState.players.findIndex(p => p.id === gameState.activePlayerId);
    const nextIdx = (activeIdx + 1) % gameState.players.length;
    const nextPlayerId = gameState.players[nextIdx].id;

    const newGameState = {
      ...gameState,
      scores: updatedScores,
      activePlayerId: nextPlayerId,
      winnerId,
      isCompleted: allCompleted,
      recentActions: updatedRecentActions,
    };

    setGameState(newGameState);
    setEditingCell(null);

    if (allCompleted && winnerId) {
      const winPlayer = gameState.players.find(p => p.id === winnerId);
      if (winPlayer) {
        localStorage.removeItem('scorekeeper_saved_yahtzee');
        onGameFinished(winPlayer.name, totals);
      }
    }
  };

  const handleYahtzeeBonusChange = (playerId: string, increment: boolean) => {
    if (!gameState || gameState.isCompleted) return;
    pushStateToHistory();

    const player = gameState.players.find(p => p.id === playerId);
    const sheet = gameState.scores[playerId];
    const currentCount = sheet.yahtzeeBonusCount;
    const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);

    const rules = getActiveRules();
    const bonusMultiplier = rules.extraYahtzeeBonus ?? 100;

    const desc = increment
      ? `Added Yahtzee Bonus (+${bonusMultiplier} pts)`
      : `Removed Yahtzee Bonus (-${bonusMultiplier} pts)`;

    const actionItem: ActionLogItem = {
      id: Date.now().toString() + Math.random().toString().substring(2, 5),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      playerId,
      playerName: player?.name || 'Player',
      playerColor: player?.color,
      actionType: 'edit_score',
      description: desc,
      points: increment ? bonusMultiplier : -bonusMultiplier,
      source: 'manual',
    };
    const updatedRecentActions = [actionItem, ...(gameState.recentActions || [])].slice(0, 20);

    const updatedSheet = {
      ...sheet,
      yahtzeeBonusCount: newCount,
    };

    setGameState({
      ...gameState,
      scores: {
        ...gameState.scores,
        [playerId]: updatedSheet,
      },
      recentActions: updatedRecentActions,
    });
  };

  const resetGame = () => {
    setShowResetConfirm(true);
  };

  const confirmResetGame = () => {
    localStorage.removeItem('scorekeeper_saved_yahtzee');
    setIsSettingUp(true);
    setGameState(null);
    setHistoryStack([]);
    setShowResetConfirm(false);
  };

  // Quick select presets based on category
  const getPresetsForCategory = (category: YahtzeeCategory) => {
    const rules = getActiveRules();
    switch (category) {
      case 'fullHouse': return [rules.fullHouseScore ?? 25, 0];
      case 'smallStraight': return [rules.smallStraightScore ?? 30, 0];
      case 'largeStraight': return [rules.largeStraightScore ?? 40, 0];
      case 'yahtzee': return [rules.yahtzeeScore ?? 50, 0];
      case 'aces': return [1, 2, 3, 4, 5, 0];
      case 'twos': return [2, 4, 6, 8, 10, 0];
      case 'threes': return [3, 6, 9, 12, 15, 0];
      case 'fours': return [4, 8, 12, 16, 20, 0];
      case 'fives': return [5, 10, 15, 20, 25, 0];
      case 'sixes': return [6, 12, 18, 24, 30, 0];
      default: return null;
    }
  };

  if (isSettingUp) {
    return (
      <div className="bg-white rounded-[32px] shadow-sm border-2 border-orange-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-6 h-6 text-orange-500 animate-pulse" />
          <h2 className="text-xl font-black text-teal-900 uppercase tracking-tight">
            Yahtzee Scorecard Setup
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
                  id="quick-add-yahtzee-player"
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
                    const input = document.getElementById('quick-add-yahtzee-player') as HTMLInputElement;
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

          {/* Step 2: Active House Rules */}
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
              const rules = getActiveRules();
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="bg-white/80 p-2 rounded-xl border border-orange-100/70">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Upper Bonus:</span>
                    <span className="font-extrabold text-slate-800">
                      +{rules.upperBonusAmount} (≥{rules.upperBonusThreshold})
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-orange-100/70">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Extra Yahtzee:</span>
                    <span className="font-extrabold text-slate-800">
                      +{rules.extraYahtzeeBonus} pts
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-orange-100/70">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Full House:</span>
                    <span className="font-extrabold text-slate-800">
                      {rules.fullHouseScore} pts
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-orange-100/70">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Lg Straight:</span>
                    <span className="font-extrabold text-slate-800">
                      {rules.largeStraightScore} pts
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
            data-tv-action="primary"
            className="w-full py-3.5 yz-accent-bg hover:opacity-90 disabled:opacity-50 text-white font-black rounded-full text-sm flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer uppercase tracking-wider"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Yahtzee Game
          </button>
        </div>
      </div>
    );
  }

  const handleVoiceCommandInYahtzee = (result: VoiceCommandResult) => {
    if (!gameState || gameState.isCompleted) return;

    if (result.actionType === 'score_category' && result.category) {
      const activePlayerId = gameState.activePlayerId;
      const matchedCategory = result.category as YahtzeeCategory;
      const scoreVal = result.points !== undefined && result.points !== null ? result.points : 0;

      pushStateToHistory();
      if (scoreVal === 0) playFarkle();
      else playBank();

      const player = gameState.players.find(p => p.id === activePlayerId);
      const catObj = CATEGORIES.find(c => c.key === matchedCategory);
      const desc = scoreVal === 0 
        ? `Zeroed out ${catObj?.label || matchedCategory}`
        : `Scored +${scoreVal} pts in ${catObj?.label || matchedCategory}`;

      const actionItem: ActionLogItem = {
        id: Date.now().toString() + Math.random().toString().substring(2, 5),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        playerId: activePlayerId,
        playerName: player?.name || 'Player',
        playerColor: player?.color,
        actionType: 'edit_score',
        description: desc,
        points: scoreVal,
        source: 'voice',
      };
      const updatedRecentActions = [actionItem, ...(gameState.recentActions || [])].slice(0, 20);

      const updatedSheet = {
        ...gameState.scores[activePlayerId],
        [matchedCategory]: scoreVal,
      };
      const updatedScores = {
        ...gameState.scores,
        [activePlayerId]: updatedSheet,
      };

      const activeIdx = gameState.players.findIndex(p => p.id === activePlayerId);
      const nextIdx = (activeIdx + 1) % gameState.players.length;
      const nextPlayerId = gameState.players[nextIdx].id;

      setGameState({
        ...gameState,
        scores: updatedScores,
        activePlayerId: nextPlayerId,
        recentActions: updatedRecentActions,
      });
      setEditingCell(null);
    } else if (result.actionType === 'yahtzee_bonus') {
      handleYahtzeeBonusChange(gameState.activePlayerId, true);
    } else if (result.actionType === 'undo') {
      handleUndo();
    }
  };

  if (!gameState || !gameState.players || gameState.players.length === 0) {
    if (isOnlineSynced) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/80 border-2 border-indigo-500/30 rounded-3xl text-center space-y-4 max-w-md mx-auto my-12 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Wifi className="w-7 h-7 animate-pulse" />
          </div>
          <h3 className="text-xl font-black text-white">Synchronizing Yahtzee Match...</h3>
          <p className="text-sm text-slate-400">Connecting devices and syncing scorecards in real-time.</p>
        </div>
      );
    }
    return null;
  }

  const activePlayerObj = (gameState.players && gameState.players.find(p => p.id === gameState.activePlayerId)) ||
    gameState.players[0] || { id: 'p1', name: 'Player 1', color: 'bg-emerald-500 text-white', avatar: '🎲' };

  const yahtzeeGameSummaryText = (() => {
    const sorted = [...(gameState.players || [])].sort((a, b) => calculateGrandTotal(gameState.scores?.[b.id]) - calculateGrandTotal(gameState.scores?.[a.id]));
    const leader = sorted[0];
    const topScore = calculateGrandTotal(gameState.scores?.[leader?.id]);
    return `${leader?.name || 'Leader'} is leading with ${topScore} points. It is currently ${activePlayerObj?.name || 'Player'}'s turn!`;
  })();

  return (
    <div className="space-y-6">
      {/* Integrated AI Voice Assistant */}
      <VoiceAssistantWidget
        gameType="yahtzee"
        activePlayerName={activePlayerObj?.name || 'Player'}
        gameSummaryText={yahtzeeGameSummaryText}
        onExecuteCommand={handleVoiceCommandInYahtzee}
      />

      {/* Top Bar info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 yz-themed-card p-5 rounded-[32px] border-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 yz-accent-text" />
          <h2 className="text-lg font-black yz-primary-text uppercase tracking-tight">
            Interactive Yahtzee Scorecard
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 yz-themed-header border px-3 py-1.5 rounded-full shadow-2xs">
            <span className="text-[10px] sm:text-xs yz-muted-text font-bold uppercase tracking-wider shrink-0">
              Active Turn:
            </span>
            <select
              value={gameState.activePlayerId}
              onChange={(e) => {
                const newId = e.target.value;
                if (newId && newId !== gameState.activePlayerId) {
                  pushStateToHistory();
                  setGameState(prev => prev ? { ...prev, activePlayerId: newId } : null);
                }
              }}
              className="bg-transparent text-xs sm:text-sm font-black yz-accent-text focus:outline-none cursor-pointer uppercase tracking-wide pr-1"
              title="Click to switch active player's turn"
            >
              {gameState.players.map(p => (
                <option key={p.id} value={p.id} className="text-slate-800 font-bold">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {onOpenHouseRules && (
            <button
              onClick={onOpenHouseRules}
              data-tv-action="rules"
              className="px-3.5 py-2 yz-themed-header border yz-row-border hover:opacity-80 yz-primary-text font-black rounded-full text-xs flex items-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
              title="View or modify Yahtzee House Rules"
            >
              <Sliders className="w-3.5 h-3.5 yz-accent-text" />
              <span>House Rules</span>
            </button>
          )}

          <button
            onClick={handleUndo}
            disabled={historyStack.length === 0}
            data-tv-action="undo"
            className="px-3.5 py-2 yz-accent-bg hover:opacity-90 disabled:opacity-40 text-white font-black rounded-full text-xs flex items-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider shadow-xs ml-auto sm:ml-0"
            title="Undo last score entry"
          >
            <Undo className="w-3.5 h-3.5" />
            Undo {historyStack.length > 0 && `(${historyStack.length})`}
          </button>
          <button
            onClick={resetGame}
            data-tv-action="danger"
            className="px-4 py-2 border-2 yz-row-border yz-themed-header hover:opacity-80 yz-primary-text font-black rounded-full text-xs flex items-center gap-1 transition-colors cursor-pointer uppercase tracking-wider"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Scorecard
          </button>
        </div>
      </div>

      {/* Recent Actions Log */}
      <div className="yz-themed-card p-5 rounded-[32px] border-2 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 yz-accent-text" />
            <h3 className="text-[11px] font-black yz-primary-text uppercase tracking-widest">
              Recent Actions
            </h3>
            <span className="px-2 py-0.5 yz-themed-header text-[9px] font-black yz-muted-text rounded-full uppercase tracking-wider border yz-row-border">
              Last 3 Updates
            </span>
          </div>
          <button
            onClick={toggleVoiceListening}
            className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
              isListening
                ? 'bg-purple-600 text-white animate-pulse ring-2 ring-purple-300'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50'
            }`}
            title="Voice Score Input"
          >
            <Mic className="w-3.5 h-3.5" />
            {isListening ? 'Listening...' : 'Voice Update'}
          </button>
        </div>

        {voiceFeedback && (
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800/50 rounded-xl text-xs font-bold text-center">
            {voiceFeedback}
          </div>
        )}

        {(!gameState.recentActions || gameState.recentActions.length === 0) ? (
          <div className="text-center py-4 yz-muted-text text-xs font-semibold italic yz-themed-header rounded-2xl border border-dashed yz-row-border">
            No score updates logged yet this game.
          </div>
        ) : (
          <div className="space-y-2">
            {gameState.recentActions.slice(0, 3).map((item) => {
              const player = gameState.players.find(p => p.id === item.playerId);
              const colorClass = (player?.color || item.playerColor || 'bg-amber-500').split(' ')[0];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 yz-themed-header hover:opacity-90 rounded-2xl border yz-row-border transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-full ${colorClass} text-white font-bold text-[10px] flex items-center justify-center shrink-0`}>
                      {player?.avatar || item.playerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs yz-primary-text truncate">
                          {item.playerName}
                        </span>
                        <span className="text-[10px] font-mono yz-muted-text">
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="text-xs font-semibold yz-primary-text opacity-80 truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.source === 'voice' ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Mic className="w-2.5 h-2.5" />
                        Voice
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
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

      {/* Grid Layout of Scorecard */}
      <div className="yz-themed-card rounded-[32px] shadow-sm border-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[600px]">
            <thead>
              <tr className="yz-table-header-row border-b">
                <th className="p-4 text-[10px] font-black yz-table-header-text uppercase tracking-widest w-[240px]">
                  Scoring Categories
                </th>
                {gameState.players.map(player => {
                  const isActive = player.id === gameState.activePlayerId;
                  return (
                    <th
                      key={player.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Select ${player.name}'s turn`}
                      onClick={() => {
                        if (!isActive) {
                          pushStateToHistory();
                          setGameState(prev => prev ? { ...prev, activePlayerId: player.id } : null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!isActive) {
                            pushStateToHistory();
                            setGameState(prev => prev ? { ...prev, activePlayerId: player.id } : null);
                          }
                        }
                      }}
                      className={`p-4 text-center w-[120px] transition-all relative cursor-pointer select-none group/th ${
                        isActive ? 'yz-active-column' : 'hover:opacity-80'
                      }`}
                      title={isActive ? "Active player's turn" : `Click to set ${player.name}'s turn`}
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full ${player.color.split(' ')[0]} text-xs font-black flex items-center justify-center text-white mb-1 shadow-sm ring-1 ring-black/10`}
                        >
                          {player.avatar || player.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-black yz-primary-text truncate max-w-full uppercase tracking-tight">
                          {player.name}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          {gameState.players.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removePlayerFromActiveGame(player.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove from scorecard"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {isActive ? (
                          <span className="text-[9px] yz-badge font-black uppercase px-2 py-0.5 rounded-full absolute top-2 right-2 shadow-2xs">
                            Turn
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase px-1.5 py-0.5 rounded-full opacity-0 group-hover/th:opacity-100 transition-opacity absolute top-2 right-2">
                            Select
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* UPPER SECTION */}
              <tr className="yz-section-row">
                <td colSpan={gameState.players.length + 1} className="px-4 py-2.5 text-[10px] font-black yz-section-text uppercase tracking-widest border-y yz-row-border">
                  Upper Section
                </td>
              </tr>
              {(() => {
                const currentRules = getActiveRules();
                return (
                  <>
                    {CATEGORIES.filter(c => c.isUpper).map(cat => (
                      <tr key={cat.key} className="border-b yz-row-border hover:opacity-90 group transition-colors">
                        <td className="p-3 pl-5">
                          <div className="font-bold yz-primary-text text-sm uppercase tracking-tight">{cat.label}</div>
                          <div className="text-xs yz-muted-text font-medium opacity-80">{getCategoryDescription(cat.key, currentRules)}</div>
                        </td>
                        {gameState.players.map(player => {
                          const val = gameState.scores[player.id]?.[cat.key];
                          const isActive = player.id === gameState.activePlayerId;
                          return (
                            <td
                              key={player.id}
                              tabIndex={0}
                              role="button"
                              aria-label={`${player.name} ${cat.label}: ${typeof val === 'number' && !isNaN(val) ? val + ' points' : 'Empty, press OK to score'}`}
                              onClick={() => handleCellClick(player.id, cat.key)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleCellClick(player.id, cat.key);
                                }
                              }}
                              className={`p-3 text-center cursor-pointer transition-all ${
                                isActive ? 'yz-active-column' : ''
                              }`}
                            >
                              {typeof val === 'number' && !isNaN(val) ? (
                                <span className="font-mono text-base font-black yz-primary-text">
                                  {val}
                                </span>
                              ) : (
                                <span className="text-xs font-black yz-muted-text opacity-30 group-hover:opacity-100 transition-colors font-mono">
                                  --
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* UPPER SECTION SUBTOTALS */}
                    <tr className="border-b-2 yz-row-border yz-section-row font-bold">
                      <td className="p-3 pl-4">
                        <div className="font-black yz-primary-text text-sm uppercase tracking-tight">Upper Subtotal</div>
                        <div className="text-xs yz-muted-text font-medium opacity-80">
                          Target ≥ {currentRules.upperBonusThreshold ?? 63} for bonus
                        </div>
                      </td>
                      {gameState.players.map(player => {
                        const sub = calculateSubtotal(gameState.scores[player.id]);
                        return (
                          <td key={player.id} className="p-3 text-center font-mono font-black yz-primary-text text-sm">
                            {sub} / {currentRules.upperBonusThreshold ?? 63}
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b-2 yz-row-border yz-section-row font-bold">
                      <td className="p-3 pl-4">
                        <div className="font-black yz-primary-text text-sm uppercase tracking-tight">Upper Bonus</div>
                        <div className="text-xs yz-muted-text font-medium opacity-80">
                          +{currentRules.upperBonusAmount ?? 35} points if subtotal ≥ {currentRules.upperBonusThreshold ?? 63}
                        </div>
                      </td>
                      {gameState.players.map(player => {
                        const bonus = calculateBonus(gameState.scores[player.id]);
                        return (
                          <td key={player.id} className="p-3 text-center">
                            {bonus > 0 ? (
                              <span className="px-2.5 py-0.5 bg-emerald-500 text-white font-mono font-black text-xs rounded-full shadow-sm">
                                +{bonus}
                              </span>
                            ) : (
                              <span className="font-mono yz-muted-text text-sm">0</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* LOWER SECTION */}
                    <tr className="yz-section-row">
                      <td colSpan={gameState.players.length + 1} className="px-4 py-2.5 text-[10px] font-black yz-section-text uppercase tracking-widest border-y yz-row-border">
                        Lower Section
                      </td>
                    </tr>
                    {CATEGORIES.filter(c => !c.isUpper).map(cat => (
                      <tr key={cat.key} className="border-b yz-row-border hover:opacity-90 group transition-colors">
                        <td className="p-3 pl-5">
                          <div className="font-bold yz-primary-text text-sm uppercase tracking-tight">{cat.label}</div>
                          <div className="text-xs yz-muted-text font-medium opacity-80">{getCategoryDescription(cat.key, currentRules)}</div>
                        </td>
                        {gameState.players.map(player => {
                          const val = gameState.scores[player.id]?.[cat.key];
                          const isActive = player.id === gameState.activePlayerId;
                          return (
                            <td
                              key={player.id}
                              tabIndex={0}
                              role="button"
                              aria-label={`${player.name} ${cat.label}: ${typeof val === 'number' && !isNaN(val) ? val + ' points' : 'Empty, press OK to score'}`}
                              onClick={() => handleCellClick(player.id, cat.key)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleCellClick(player.id, cat.key);
                                }
                              }}
                              className={`p-3 text-center cursor-pointer transition-all ${
                                isActive ? 'yz-active-column' : ''
                              }`}
                            >
                              {typeof val === 'number' && !isNaN(val) ? (
                                <span className="font-mono text-base font-black yz-primary-text">
                                  {val}
                                </span>
                              ) : (
                                <span className="text-xs font-black yz-muted-text opacity-30 group-hover:opacity-100 transition-colors font-mono">
                                  --
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* YAHTZEE BONUS COUNTER */}
                    <tr className="border-b yz-row-border transition-colors">
                      <td className="p-3 pl-5">
                        <div className="font-bold yz-primary-text text-sm uppercase tracking-tight">Yahtzee Bonus</div>
                        <div className="text-xs yz-muted-text font-medium opacity-80">
                          +{currentRules.extraYahtzeeBonus ?? 100} points per extra Yahtzee
                        </div>
                      </td>
                      {gameState.players.map(player => {
                        const sheet = gameState.scores[player.id];
                        const bonusCount = Number(sheet?.yahtzeeBonusCount) || 0;
                        return (
                          <td key={player.id} className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleYahtzeeBonusChange(player.id, false)}
                                className="w-5 h-5 yz-themed-header border yz-row-border yz-primary-text font-black rounded-md flex items-center justify-center text-xs hover:opacity-80 transition-colors cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-mono font-black yz-primary-text text-sm">
                                {bonusCount}
                              </span>
                              <button
                                onClick={() => handleYahtzeeBonusChange(player.id, true)}
                                className="w-5 h-5 yz-accent-bg text-white font-black rounded-md flex items-center justify-center text-xs hover:opacity-90 transition-colors cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            {bonusCount > 0 && (
                              <div className="text-[10px] yz-accent-text font-bold mt-1 uppercase tracking-wider">
                                +{bonusCount * (currentRules.extraYahtzeeBonus ?? 100)} pts
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </>
                );
              })()}

              {/* GRAND TOTAL ROW */}
              <tr className="yz-grand-total-row font-bold border-t-4 border-black/10">
                <td className="p-4 pl-4">
                  <div className="font-black text-base uppercase tracking-wider text-white">Grand Total</div>
                  <div className="text-xs opacity-90 font-bold uppercase tracking-wider text-white">Sum of all sections</div>
                </td>
                {gameState.players.map(player => {
                  const gTotal = calculateGrandTotal(gameState.scores[player.id]);
                  const isActive = player.id === gameState.activePlayerId;
                  return (
                    <td
                      key={player.id}
                      className={`p-4 text-center font-mono text-xl font-black transition-all ${
                        isActive ? 'ring-2 ring-white/40 bg-black/10' : ''
                      }`}
                    >
                      {gTotal}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Player in Game Section */}
      <div className="yz-themed-card rounded-[32px] shadow-sm border-2 p-6">
        {!showAddPlayerInGame ? (
          <button
            onClick={() => setShowAddPlayerInGame(true)}
            className="w-full py-3 yz-themed-header border-2 yz-row-border yz-primary-text font-black rounded-2xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 text-xs hover:opacity-80"
          >
            <UserPlus className="w-4 h-4 yz-accent-text" />
            Add Participant to Scorecard
          </button>
        ) : (
          <div className="yz-themed-header border-2 yz-row-border rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black yz-primary-text uppercase tracking-widest flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 yz-accent-text" />
                Add Player to Scorecard
              </span>
              <button
                onClick={() => setShowAddPlayerInGame(false)}
                className="p-1.5 hover:bg-black/10 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing players not in game */}
            {players.filter(p => !gameState.players.some(gp => gp.id === p.id)).length > 0 && (
              <div className="space-y-2">
                <span className="block text-[10px] font-black yz-muted-text uppercase tracking-widest">
                  Quick Add Existing Players:
                </span>
                <div className="flex flex-wrap gap-2">
                  {players
                    .filter(p => !gameState.players.some(gp => gp.id === p.id))
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => addPlayerToActiveGame(p)}
                        className="px-4 py-2 yz-themed-card hover:opacity-80 border-2 yz-row-border rounded-xl text-xs font-bold yz-primary-text uppercase tracking-tight transition-colors cursor-pointer"
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
              <span className="block text-[10px] font-black yz-muted-text uppercase tracking-widest">
                Create New Player:
              </span>
              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Player Name..."
                  value={inGameNewPlayerName}
                  onChange={(e) => setInGameNewPlayerName(e.target.value)}
                  maxLength={15}
                  className="flex-1 px-4 py-2 yz-themed-card border-2 yz-row-border rounded-xl text-xs font-bold yz-primary-text focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inGameNewPlayerName.trim()}
                  className="px-5 py-2 yz-accent-bg hover:opacity-90 disabled:opacity-50 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Enter score overlay modal */}
      <AnimatePresence>
        {editingCell && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="yz-themed-card rounded-[32px] sm:rounded-[40px] shadow-2xl max-w-sm w-full border-2 yz-row-border overflow-hidden max-h-[90vh] max-h-[90dvh] overflow-y-auto my-auto"
            >
              {/* Header */}
              <div className="yz-themed-header border-b-2 yz-row-border px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] yz-muted-text font-black uppercase tracking-widest">
                    Score Entry
                  </div>
                  <h3 className="text-base font-black yz-primary-text uppercase tracking-tight">
                    {gameState.players.find(p => p.id === editingCell.playerId)?.name}
                    {' - '}
                    {CATEGORIES.find(c => c.key === editingCell.category)?.label}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingCell(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Presets Panel */}
              <div className="p-6 space-y-4">
                {getPresetsForCategory(editingCell.category) && (
                  <div>
                    <label className="block text-[10px] font-black yz-muted-text uppercase tracking-widest mb-2">
                      Quick Selection Presets
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {getPresetsForCategory(editingCell.category)!.map(pVal => (
                        <button
                          key={pVal}
                          onClick={() => handleSaveScore(pVal)}
                          className="py-2.5 px-3 yz-themed-header border-2 yz-row-border hover:opacity-80 rounded-2xl text-sm font-black yz-primary-text transition-all cursor-pointer"
                        >
                          {pVal === 0 ? 'Scratch (0)' : `${pVal} pts`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom input */}
                <div>
                  <label className="block text-[10px] font-black yz-muted-text uppercase tracking-widest mb-2">
                    Enter Custom Value
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="e.g. 15"
                      className="flex-1 px-4 py-2.5 yz-themed-card border-2 yz-row-border rounded-2xl text-slate-950 dark:text-slate-900 font-mono font-black placeholder:text-slate-400 focus:outline-none focus:text-black"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveScore(inputValue === '' ? null : parseInt(inputValue) || 0)}
                      className="px-5 py-2.5 yz-accent-bg hover:opacity-90 text-white rounded-full text-sm font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="flex justify-between gap-2 pt-2 border-t border-orange-100">
                  <button
                    onClick={() => handleSaveScore(0)}
                    className="flex-1 py-2.5 border-2 border-red-200 text-red-600 font-black hover:bg-red-50 rounded-full text-xs transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Scratch (0 pts)
                  </button>
                  <button
                    onClick={() => handleSaveScore(null)}
                    className="flex-1 py-2.5 border-2 border-orange-100 bg-orange-50/30 hover:bg-orange-50 text-teal-800 font-black rounded-full text-xs transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Clear (--)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESET GAME CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 bg-teal-950/70 flex items-center justify-center p-4 z-55 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl border-2 border-orange-100 p-6 sm:p-8 max-w-sm w-full text-center relative overflow-hidden max-h-[90vh] max-h-[90dvh] overflow-y-auto my-auto"
            >
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                <RotateCcw className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-teal-900 tracking-tight uppercase">
                Reset Scorecard?
              </h2>
              <p className="text-slate-500 text-sm mt-3 font-semibold leading-relaxed">
                Are you sure you want to reset this Yahtzee scorecard? All current category scores will be wiped clean.
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
                  {gameState?.players.find((p) => p.id === playerToRemoveId)?.name}
                </strong>{" "}
                from the scorecard? Their sheet will be deleted.
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
