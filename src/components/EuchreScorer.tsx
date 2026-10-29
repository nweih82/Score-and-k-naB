import React, { useState, useEffect, useRef } from 'react';
import {
  Player,
  EuchreState,
  EuchreRound,
  EuchreGameMode,
  EuchreHouseRules,
  EuchreTeam,
  CardSuit,
} from '../types';
import { DEFAULT_EUCHRE_RULES } from '../lib/houseRules';
import {
  Play,
  RotateCcw,
  Plus,
  AlertCircle,
  Undo,
  Wifi,
  Sliders,
  Users,
  User,
  Sparkles,
  Check,
  ShieldAlert,
  Flame,
  Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, saveActiveGameToFirestore, deleteSavedGameFromFirestore } from '../lib/firebase';
import { useSound } from '../lib/SoundContext';
import { safeClone, safeJsonStringify } from '../lib/utils';

interface EuchreScorerProps {
  players: Player[];
  onGameFinished: (winnerName: string, finalScores: Record<string, number>) => void;
  onAddPlayer?: (name: string, color: string) => Player;
  externalGameState?: EuchreState | null;
  onSyncGameRoom?: (newGameState: EuchreState) => void;
  isOnlineSynced?: boolean;
  houseRules?: EuchreHouseRules;
  onOpenHouseRules?: () => void;
}

const SUIT_META: Record<
  CardSuit,
  {
    symbol: string;
    name: string;
    rightBower: string;
    leftBower: string;
    colorClass: string;
    activeBg: string;
  }
> = {
  spades: {
    symbol: '♠',
    name: 'Spades',
    rightBower: 'J♠ (Jack of Spades)',
    leftBower: 'J♣ (Jack of Clubs)',
    colorClass: 'text-slate-900 dark:text-white',
    activeBg: 'bg-slate-900 text-white border-slate-700',
  },
  hearts: {
    symbol: '♥',
    name: 'Hearts',
    rightBower: 'J♥ (Jack of Hearts)',
    leftBower: 'J♦ (Jack of Diamonds)',
    colorClass: 'text-red-600 dark:text-red-400',
    activeBg: 'bg-red-600 text-white border-red-500',
  },
  diamonds: {
    symbol: '♦',
    name: 'Diamonds',
    rightBower: 'J♦ (Jack of Diamonds)',
    leftBower: 'J♥ (Jack of Hearts)',
    colorClass: 'text-red-600 dark:text-red-400',
    activeBg: 'bg-red-600 text-white border-red-500',
  },
  clubs: {
    symbol: '♣',
    name: 'Clubs',
    rightBower: 'J♣ (Jack of Clubs)',
    leftBower: 'J♠ (Jack of Spades)',
    colorClass: 'text-slate-900 dark:text-white',
    activeBg: 'bg-slate-900 text-white border-slate-700',
  },
};

function normalizeEuchreState(raw: any, fallbackRules: EuchreHouseRules): EuchreState | null {
  if (!raw || typeof raw !== 'object') return null;
  const players: Player[] = Array.isArray(raw.players)
    ? raw.players.filter((p: any) => Boolean(p && p.id && p.name))
    : [];
  if (players.length === 0) return null;

  const rules: EuchreHouseRules = {
    ...DEFAULT_EUCHRE_RULES,
    ...fallbackRules,
    ...(raw.rules || {}),
  };

  const gameMode: EuchreGameMode = raw.gameMode === 'cutthroat' ? 'cutthroat' : 'partnership';
  const scores: Record<string, number> = {};
  players.forEach((p) => {
    scores[p.id] = Number(raw.scores?.[p.id]) || 0;
  });

  return {
    players,
    teams: Array.isArray(raw.teams) ? raw.teams : undefined,
    gameMode,
    scores,
    rounds: Array.isArray(raw.rounds) ? raw.rounds : [],
    currentHand: Math.max(1, Number(raw.currentHand) || 1),
    dealerIndex: Math.max(0, Number(raw.dealerIndex) || 0) % players.length,
    targetScore: Math.max(3, Number(raw.targetScore) || rules.targetScore || 10),
    winnerId: raw.winnerId || null,
    activePlayerId: raw.activePlayerId || players[0].id,
    rules,
  };
}

export default function EuchreScorer({
  players,
  onGameFinished,
  onAddPlayer,
  externalGameState,
  onSyncGameRoom,
  isOnlineSynced,
  houseRules = DEFAULT_EUCHRE_RULES,
  onOpenHouseRules,
}: EuchreScorerProps) {
  const { playBank, playUndo, playFarkle } = useSound();

  const [gameState, setGameState] = useState<EuchreState | null>(() => {
    return normalizeEuchreState(externalGameState, houseRules);
  });
  const [historyStack, setHistoryStack] = useState<EuchreState[]>([]);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(() => {
    return !normalizeEuchreState(externalGameState, houseRules);
  });

  // Setup state
  const [setupMode, setSetupMode] = useState<EuchreGameMode>(houseRules.gameMode || 'partnership');
  const [setupTargetScore, setSetupTargetScore] = useState<number>(houseRules.targetScore || 10);
  const [setupStickDealer, setSetupStickDealer] = useState<boolean>(houseRules.stickTheDealer ?? true);
  const [setupBennyJoker, setSetupBennyJoker] = useState<boolean>(houseRules.bennyJoker ?? false);
  const [setupAlonePoints, setSetupAlonePoints] = useState<number>(houseRules.aloneMarchPoints || 4);

  // Cutthroat player selection (default 3 players for 3-handed Cutthroat Euchre, or 4)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Partnership team setup
  const [team1Name, setTeam1Name] = useState('Bower Rangers');
  const [team2Name, setTeam2Name] = useState('Trump Makers');
  const [team1Members, setTeam1Members] = useState<string[]>([]);
  const [team2Members, setTeam2Members] = useState<string[]>([]);

  useEffect(() => {
    if (isSettingUp) {
      setSetupMode(houseRules.gameMode || 'partnership');
      setSetupTargetScore(houseRules.targetScore || 10);
      setSetupStickDealer(houseRules.stickTheDealer ?? true);
      setSetupBennyJoker(houseRules.bennyJoker ?? false);
      setSetupAlonePoints(houseRules.aloneMarchPoints || 4);
    }
  }, [houseRules, isSettingUp]);

  useEffect(() => {
    if (players.length > 0 && selectedPlayerIds.length === 0) {
      setSelectedPlayerIds(players.slice(0, 3).map((p) => p.id));
    }
    if (players.length >= 2 && team1Members.length === 0 && team2Members.length === 0) {
      setTeam1Members(players.slice(0, 2).map((p) => p.id));
      setTeam2Members(players.slice(2, 4).map((p) => p.id));
    }
  }, [players]);

  // Active Hand Scoring Controls
  const [selectedTrump, setSelectedTrump] = useState<CardSuit>('spades');
  const [selectedMakerId, setSelectedMakerId] = useState<string>('');
  const [wentAlone, setWentAlone] = useState<boolean>(false);
  const [makerTricks, setMakerTricks] = useState<number>(3);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [customAdjustEntityId, setCustomAdjustEntityId] = useState<string | null>(null);
  const [customAdjustAmount, setCustomAdjustAmount] = useState('');

  // Keep selectedMakerId valid when gameState loads
  useEffect(() => {
    if (gameState && gameState.players.length > 0) {
      if (!selectedMakerId || !gameState.players.some((p) => p.id === selectedMakerId)) {
        setSelectedMakerId(gameState.players[0].id);
      }
    }
  }, [gameState?.players, selectedMakerId]);

  const pushStateToHistory = () => {
    if (gameState) {
      setHistoryStack((prev) => [...prev, safeClone(gameState)]);
    }
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    playUndo();
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, prev.length - 1));
    setGameState(previous);
  };

  // Load saved game on mount (only offline/solo mode)
  useEffect(() => {
    if (
      isOnlineSynced ||
      (externalGameState && Array.isArray(externalGameState.players) && externalGameState.players.length > 0)
    ) {
      return;
    }
    const saved = localStorage.getItem('scorekeeper_saved_euchre');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const normalized = normalizeEuchreState(parsed?.gameState, houseRules);
        if (normalized) {
          setGameState(normalized);
          setIsSettingUp(false);
        }
      } catch (err) {
        console.error('Error loading saved Euchre game:', err);
      }
    }
  }, [isOnlineSynced]);

  const isIncomingSyncRef = useRef<boolean>(false);
  const lastReceivedExternalJsonRef = useRef<string>(
    externalGameState && Array.isArray(externalGameState.players) && externalGameState.players.length > 0
      ? safeJsonStringify({ gameState: externalGameState })
      : ''
  );

  // Listen to external online room updates
  useEffect(() => {
    const normalized = normalizeEuchreState(externalGameState, houseRules);
    if (!normalized) return;

    const incomingJson = safeJsonStringify({ gameState: normalized });
    if (incomingJson === lastReceivedExternalJsonRef.current) return;

    const currentJson = safeJsonStringify({ gameState });
    if (incomingJson === currentJson) {
      lastReceivedExternalJsonRef.current = incomingJson;
      return;
    }

    isIncomingSyncRef.current = true;
    lastReceivedExternalJsonRef.current = incomingJson;
    setGameState(normalized);
    setIsSettingUp(false);
  }, [externalGameState]);

  // Save game progress automatically whenever gameState changes
  useEffect(() => {
    if (gameState && Array.isArray(gameState.players) && gameState.players.length > 0) {
      if (isIncomingSyncRef.current) {
        isIncomingSyncRef.current = false;
        return;
      }

      if (!isOnlineSynced) {
        if (gameState.winnerId) {
          localStorage.removeItem('scorekeeper_saved_euchre');
          if (auth.currentUser) {
            deleteSavedGameFromFirestore(auth.currentUser.uid, 'euchre');
          }
        } else {
          const savedData = {
            gameType: 'euchre' as const,
            gameState,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem('scorekeeper_saved_euchre', safeJsonStringify(savedData));
          if (auth.currentUser) {
            saveActiveGameToFirestore(auth.currentUser.uid, 'euchre', savedData);
          }
        }
      }

      if (isOnlineSynced && onSyncGameRoom) {
        const currentJson = safeJsonStringify({ gameState });
        if (currentJson !== lastReceivedExternalJsonRef.current) {
          lastReceivedExternalJsonRef.current = currentJson;
          onSyncGameRoom(gameState);
        }
      }
    }
  }, [gameState, isOnlineSynced]);

  const toggleCutthroatPlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const assignPlayerToTeam = (playerId: string, teamNum: 1 | 2) => {
    if (teamNum === 1) {
      setTeam2Members((prev) => prev.filter((id) => id !== playerId));
      setTeam1Members((prev) =>
        prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
      );
    } else {
      setTeam1Members((prev) => prev.filter((id) => id !== playerId));
      setTeam2Members((prev) =>
        prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
      );
    }
  };

  const startNewGame = () => {
    const activeRules: EuchreHouseRules = {
      ...houseRules,
      targetScore: setupTargetScore,
      gameMode: setupMode,
      stickTheDealer: setupStickDealer,
      bennyJoker: setupBennyJoker,
      aloneMarchPoints: setupAlonePoints,
    };

    let competitors: Player[] = [];
    let teams: EuchreTeam[] | undefined = undefined;

    if (setupMode === 'partnership') {
      const t1Players = players.filter((p) => team1Members.includes(p.id));
      const t2Players = players.filter((p) => team2Members.includes(p.id));

      const t1Display =
        team1Name.trim() ||
        (t1Players.length > 0 ? t1Players.map((p) => p.name).join(' & ') : 'Team 1');
      const t2Display =
        team2Name.trim() ||
        (t2Players.length > 0 ? t2Players.map((p) => p.name).join(' & ') : 'Team 2');

      teams = [
        {
          id: 'euchre-team-1',
          name: t1Display,
          color: 'bg-emerald-600 text-white',
          avatar: '🃏',
          memberIds: t1Players.map((p) => p.id),
          memberNames: t1Players.map((p) => p.name),
        },
        {
          id: 'euchre-team-2',
          name: t2Display,
          color: 'bg-amber-500 text-white',
          avatar: '👑',
          memberIds: t2Players.map((p) => p.id),
          memberNames: t2Players.map((p) => p.name),
        },
      ];

      competitors = teams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        avatar: t.avatar,
      }));
    } else {
      const chosen = players.filter((p) => selectedPlayerIds.includes(p.id));
      if (chosen.length < 2) {
        setAlertMessage('Please select at least 2 players (3 recommended) for Cutthroat Euchre!');
        return;
      }
      competitors = chosen;
    }

    const initialScores: Record<string, number> = {};
    competitors.forEach((c) => {
      initialScores[c.id] = 0;
    });

    setSelectedMakerId(competitors[0].id);
    setWentAlone(false);
    setMakerTricks(3);
    setHistoryStack([]);
    setGameState({
      players: competitors,
      teams,
      gameMode: setupMode,
      scores: initialScores,
      rounds: [],
      currentHand: 1,
      dealerIndex: 0,
      targetScore: setupTargetScore,
      winnerId: null,
      activePlayerId: competitors[0].id,
      rules: activeRules,
    });
    setIsSettingUp(false);
  };

  // Compute hand outcome preview based on current Maker, Alone toggle, and Tricks Won (0-5)
  const computeHandPreview = (tricks: number, alone: boolean, makerId: string) => {
    if (!gameState) {
      return { deltas: {}, isEuchred: false, summary: '' };
    }
    const rules = gameState.rules || DEFAULT_EUCHRE_RULES;
    const euchrePts = rules.euchrePoints || 2;
    const alonePts = rules.aloneMarchPoints || 4;
    const makerObj = gameState.players.find((p) => p.id === makerId) || gameState.players[0];

    const deltas: Record<string, number> = {};
    gameState.players.forEach((p) => {
      deltas[p.id] = 0;
    });

    let isEuchred = false;
    let summary = '';

    if (tricks >= 5) {
      const pts = alone ? alonePts : 2;
      deltas[makerObj.id] = pts;
      summary = alone
        ? `${makerObj.name} Went Alone & Swept all 5 tricks! (+${pts} pts)`
        : `${makerObj.name} Marched all 5 tricks! (+${pts} pts)`;
    } else if (tricks >= 3) {
      deltas[makerObj.id] = 1;
      summary = `${makerObj.name} made the point (${tricks}/5 tricks) (+1 pt)`;
    } else {
      // Maker was Euchred (< 3 tricks)! Defenders score euchrePoints (+2 pts)
      isEuchred = true;
      const defenders = gameState.players.filter((p) => p.id !== makerObj.id);
      defenders.forEach((def) => {
        deltas[def.id] = euchrePts;
      });
      const defNames = defenders.map((d) => d.name).join(' & ');
      summary = `${makerObj.name} was EUCHRED (${tricks}/5 tricks)! ${defNames} +${euchrePts} pts`;
    }

    return { deltas, isEuchred, summary };
  };

  const commitHandScore = (overrideTricks?: number, overrideAlone?: boolean) => {
    if (!gameState) return;
    pushStateToHistory();

    const tricksToUse = overrideTricks !== undefined ? overrideTricks : makerTricks;
    const aloneToUse = overrideAlone !== undefined ? overrideAlone : wentAlone;
    const activeMakerId = selectedMakerId || gameState.players[0].id;

    const { deltas, isEuchred, summary } = computeHandPreview(tricksToUse, aloneToUse, activeMakerId);

    if (isEuchred) {
      playFarkle();
    } else {
      playBank();
    }

    const updatedScores = { ...gameState.scores };
    Object.entries(deltas).forEach(([id, pts]) => {
      updatedScores[id] = (updatedScores[id] || 0) + pts;
    });

    const currentDealer =
      gameState.players[gameState.dealerIndex % gameState.players.length] || gameState.players[0];

    const newRound: EuchreRound = {
      handNumber: gameState.currentHand,
      dealerId: currentDealer.id,
      trumpSuit: selectedTrump,
      makerId: activeMakerId,
      wentAlone: aloneToUse,
      tricksWonByMaker: tricksToUse,
      isEuchred,
      roundDeltas: deltas,
      summary,
    };

    // Check for winner
    let newWinnerId: string | null = null;
    const sorted = [...gameState.players].sort(
      (a, b) => (updatedScores[b.id] || 0) - (updatedScores[a.id] || 0)
    );
    if (sorted.length > 0) {
      const topScore = updatedScores[sorted[0].id] || 0;
      const secondScore = sorted.length > 1 ? (updatedScores[sorted[1].id] ?? -999) : -999;
      if (topScore >= gameState.targetScore && topScore > secondScore) {
        newWinnerId = sorted[0].id;
      }
    }

    const nextDealerIdx = (gameState.dealerIndex + 1) % gameState.players.length;
    const nextState: EuchreState = {
      ...gameState,
      scores: updatedScores,
      rounds: [newRound, ...gameState.rounds],
      currentHand: gameState.currentHand + 1,
      dealerIndex: nextDealerIdx,
      activePlayerId: gameState.players[nextDealerIdx]?.id || gameState.players[0].id,
      winnerId: newWinnerId,
    };

    setGameState(nextState);
    setWentAlone(false);
    setMakerTricks(3);

    if (newWinnerId) {
      const winnerEntity = gameState.players.find((p) => p.id === newWinnerId);
      if (winnerEntity) {
        localStorage.removeItem('scorekeeper_saved_euchre');
        const finalReportedScores: Record<string, number> = { ...updatedScores };
        if (gameState.gameMode === 'partnership' && gameState.teams) {
          gameState.teams.forEach((team) => {
            const teamScore = updatedScores[team.id] || 0;
            team.memberIds.forEach((mId) => {
              finalReportedScores[mId] = teamScore;
            });
          });
        }
        onGameFinished(winnerEntity.name, finalReportedScores);
      }
    }
  };

  const handleManualScoreAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameState || !customAdjustEntityId) return;
    const pts = parseInt(customAdjustAmount, 10);
    if (isNaN(pts) || pts === 0) return;

    pushStateToHistory();
    playBank();

    const updatedScores = {
      ...gameState.scores,
      [customAdjustEntityId]: Math.max(0, (gameState.scores[customAdjustEntityId] || 0) + pts),
    };

    setGameState({
      ...gameState,
      scores: updatedScores,
    });
    setCustomAdjustAmount('');
    setCustomAdjustEntityId(null);
  };

  const confirmResetGame = () => {
    localStorage.removeItem('scorekeeper_saved_euchre');
    if (auth.currentUser) {
      deleteSavedGameFromFirestore(auth.currentUser.uid, 'euchre');
    }
    setIsSettingUp(true);
    setGameState(null);
    setHistoryStack([]);
    setShowResetConfirm(false);
  };

  // SETUP SCREEN
  if (isSettingUp) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-md border-2 border-emerald-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
              ♣
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Euchre Scorekeeper Setup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Configure Partnership (2v2) or Cutthroat (1 vs Defenders), Stick the Dealer &amp; target points
              </p>
            </div>
          </div>

          {onOpenHouseRules && (
            <button
              type="button"
              onClick={onOpenHouseRules}
              className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              House Rules Presets
            </button>
          )}
        </div>

        {/* 1. GAME MODE: PARTNERSHIP vs CUTTHROAT */}
        <div className="space-y-2.5">
          <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            1. Select Euchre Mode (Partnership vs. Cutthroat)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSetupMode('partnership')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                setupMode === 'partnership'
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 bg-slate-50/40 dark:bg-slate-800/40'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${setupMode === 'partnership' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  Partnership (2v2 Teams)
                  {setupMode === 'partnership' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Standard 4-player team Euchre. Makers score +1 (3–4 tricks), +2 (March), +4 (Going Alone), or Defenders +2 on Euchre.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSetupMode('cutthroat')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                setupMode === 'cutthroat'
                  ? 'border-rose-600 bg-rose-50/60 dark:bg-rose-950/40 ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-rose-300 bg-slate-50/40 dark:bg-slate-800/40'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${setupMode === 'cutthroat' ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  Cutthroat (3-Handed / Solo)
                  {setupMode === 'cutthroat' && <Check className="w-4 h-4 text-rose-600 dark:text-rose-400 stroke-[3]" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Individual scoring! Whoever calls trump is the Maker (1 vs Defenders). If Euchred, each Defender earns +2 pts!
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. TEAMS OR CUTTHROAT PLAYERS */}
        {setupMode === 'partnership' ? (
          <div className="space-y-4">
            <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              2. Configure Euchre Partnership Teams (2v2)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Team 1 */}
              <div className="p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-black">
                    🃏
                  </span>
                  <input
                    type="text"
                    value={team1Name}
                    onChange={(e) => setTeam1Name(e.target.value)}
                    placeholder="Team 1 Name..."
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 mb-1.5">
                    Assign Roster Players to Team 1 (Optional):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {players.map((p) => {
                      const inTeam1 = team1Members.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => assignPlayerToTeam(p.id, 1)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            inTeam1
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          {p.avatar || '👤'} {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Team 2 */}
              <div className="p-4 rounded-2xl border-2 border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-sm font-black">
                    👑
                  </span>
                  <input
                    type="text"
                    value={team2Name}
                    onChange={(e) => setTeam2Name(e.target.value)}
                    placeholder="Team 2 Name..."
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 mb-1.5">
                    Assign Roster Players to Team 2 (Optional):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {players.map((p) => {
                      const inTeam2 = team2Members.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => assignPlayerToTeam(p.id, 2)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            inTeam2
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs font-black'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                          }`}
                        >
                          {p.avatar || '👤'} {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              2. Select Cutthroat Players ({selectedPlayerIds.length} Selected — 3 Players Classic Cutthroat)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {players.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => toggleCutthroatPlayer(player.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-rose-300 bg-slate-50/30 dark:bg-slate-800/30'
                    }`}
                  >
                    <span className="text-lg">{player.avatar || '👤'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
                      {player.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {onAddPlayer && (
              <div className="flex gap-2 max-w-sm pt-1">
                <input
                  type="text"
                  id="quick-add-euchre-player"
                  placeholder="Quick Add Player..."
                  maxLength={15}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        const newP = onAddPlayer(val, 'bg-emerald-500 text-white');
                        setSelectedPlayerIds((prev) => [...prev, newP.id]);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('quick-add-euchre-player') as HTMLInputElement;
                    const val = input?.value.trim();
                    if (val) {
                      const newP = onAddPlayer(val, 'bg-emerald-500 text-white');
                      setSelectedPlayerIds((prev) => [...prev, newP.id]);
                      if (input) input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. TARGET SCORE & VARIATIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Points to Win (Target Score)
            </label>
            <div className="flex gap-2">
              {[5, 7, 10, 11, 15].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSetupTargetScore(val)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black font-mono border-2 transition-all cursor-pointer ${
                    setupTargetScore === val
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {val} pts
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Table Variations
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSetupStickDealer((prev) => !prev)}
                className={`p-2.5 rounded-xl border-2 text-left text-xs font-black transition-all cursor-pointer ${
                  setupStickDealer
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <div>Stick the Dealer</div>
                <div className="text-[10px] font-normal opacity-80">
                  {setupStickDealer ? 'Active (Forced Call)' : 'Off'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSetupBennyJoker((prev) => !prev)}
                className={`p-2.5 rounded-xl border-2 text-left text-xs font-black transition-all cursor-pointer ${
                  setupBennyJoker
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <div>🃏 Benny (Joker)</div>
                <div className="text-[10px] font-normal opacity-80">
                  {setupBennyJoker ? 'Joker Top Trump' : 'Standard 24-Card'}
                </div>
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={startNewGame}
          data-tv-action="primary"
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer uppercase tracking-wider"
        >
          <Play className="w-4 h-4 fill-current" />
          Start Euchre Match ({setupMode === 'partnership' ? 'Partnership 2v2' : 'Cutthroat Solo'} • {setupTargetScore} Pts)
        </button>
      </div>
    );
  }

  if (!gameState || !gameState.players || gameState.players.length === 0) {
    if (isOnlineSynced) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/80 border-2 border-emerald-500/30 rounded-3xl text-center space-y-4 max-w-md mx-auto my-12 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Wifi className="w-7 h-7 animate-pulse" />
          </div>
          <h3 className="text-xl font-black text-white">Synchronizing Euchre Match...</h3>
          <p className="text-sm text-slate-400">Connecting devices and syncing hands and trump calls in real-time.</p>
        </div>
      );
    }
    return null;
  }

  const currentDealer =
    gameState.players[gameState.dealerIndex % gameState.players.length] || gameState.players[0];
  const activeMakerId = selectedMakerId || gameState.players[0].id;
  const activePreview = computeHandPreview(makerTricks, wentAlone, activeMakerId);
  const currentSuitMeta = SUIT_META[selectedTrump];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT AREA: INTERACTIVE EUCHRE HAND SCORER */}
      <div className="lg:col-span-8 space-y-5">
        {/* TOP BANNER */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-[32px] p-6 shadow-xl border-2 border-emerald-500/30 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-black uppercase tracking-widest">
                  Hand #{gameState.currentHand}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  {gameState.gameMode === 'partnership' ? (
                    <>
                      <Users className="w-3 h-3 text-emerald-300" /> Partnership 2v2
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 text-rose-300" /> Cutthroat (1 vs Defenders)
                    </>
                  )}
                </span>
                {gameState.rules?.stickTheDealer && (
                  <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                    Stick the Dealer
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyStack.length === 0}
                  data-tv-action="undo"
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-black rounded-full text-[10px] flex items-center gap-1 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <Undo className="w-3 h-3" />
                  Undo {historyStack.length > 0 && `(${historyStack.length})`}
                </button>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase pt-1">
                ♣ Euchre Hand Scorer
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-200/90 font-medium">
                <span>
                  Current Dealer:{' '}
                  <strong className="text-amber-300 font-black">{currentDealer.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setGameState({
                      ...gameState,
                      dealerIndex: (gameState.dealerIndex + 1) % gameState.players.length,
                    })
                  }
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-wider text-white cursor-pointer"
                >
                  Rotate Dealer ↻
                </button>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-emerald-400/30 px-4 py-3 rounded-2xl text-right">
              <div className="text-[9px] text-emerald-300 font-black uppercase tracking-widest">
                Active Trump Suit
              </div>
              <div className="text-xl font-black text-white flex items-center justify-end gap-1.5">
                <span>{currentSuitMeta.symbol}</span>
                <span>{currentSuitMeta.name}</span>
              </div>
              <div className="text-[10px] text-amber-300 font-bold">
                Right: {currentSuitMeta.rightBower.split(' ')[0]} • Left: {currentSuitMeta.leftBower.split(' ')[0]}
              </div>
            </div>
          </div>
        </div>

        {/* HAND SCORING CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border-2 border-emerald-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
          {/* STEP 1: SELECT TRUMP SUIT */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                1. Select Trump Suit Called
              </label>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {gameState.rules?.bennyJoker ? '🃏 Benny > ' : ''}
                Right: {currentSuitMeta.rightBower} • Left: {currentSuitMeta.leftBower}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {(['spades', 'hearts', 'diamonds', 'clubs'] as CardSuit[]).map((suit) => {
                const meta = SUIT_META[suit];
                const isSelected = selectedTrump === suit;
                const isRed = suit === 'hearts' || suit === 'diamonds';
                return (
                  <button
                    key={suit}
                    type="button"
                    onClick={() => setSelectedTrump(suit)}
                    className={`py-3 px-2 rounded-2xl border-2 font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? isRed
                          ? 'bg-red-600 text-white border-red-500 shadow-md scale-[1.02]'
                          : 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-800 dark:border-emerald-400 shadow-md scale-[1.02]'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    <span
                      className={`text-2xl leading-none ${
                        isSelected ? 'text-white' : isRed ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {meta.symbol}
                    </span>
                    <span className="text-xs uppercase tracking-wider">{meta.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: SELECT MAKER & GOING ALONE */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                2. Who Called Trump (Maker)?
              </label>

              {/* Going Alone Toggle */}
              <button
                type="button"
                onClick={() => setWentAlone((prev) => !prev)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                  wentAlone
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-2 ring-amber-400/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Flame className="w-3.5 h-3.5 fill-current" />
                {wentAlone
                  ? `Going Alone: ON (Sweep = +${gameState.rules?.aloneMarchPoints || 4} pts)`
                  : 'Going Alone? (Click to Enable)'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {gameState.players.map((comp) => {
                const isMaker = activeMakerId === comp.id;
                const teamObj = gameState.teams?.find((t) => t.id === comp.id);
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => setSelectedMakerId(comp.id)}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                      isMaker
                        ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl">{comp.avatar || '🃏'}</span>
                      <div className="min-w-0">
                        <div className="font-black text-sm text-slate-900 dark:text-white truncate uppercase">
                          {comp.name}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {isMaker
                            ? '★ Maker (Called Trump)'
                            : gameState.gameMode === 'cutthroat'
                            ? 'Defender (vs Maker)'
                            : teamObj?.memberNames.join(' & ') || 'Defender'}
                        </div>
                      </div>
                    </div>
                    {isMaker && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase shrink-0">
                        Maker
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: QUICK OUTCOME BUTTONS OR TRICKS WON (0-5) */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                3. Tricks Won by Maker ({makerTricks} / 5 Tricks)
              </label>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                {activePreview.summary}
              </span>
            </div>

            {/* 0 to 5 Tricks Selector Buttons */}
            <div className="grid grid-cols-6 gap-2">
              {[0, 1, 2, 3, 4, 5].map((t) => {
                const isSelected = makerTricks === t;
                const isEuchreCount = t < 3;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMakerTricks(t)}
                    className={`py-3 rounded-2xl font-mono font-black text-base border-2 transition-all cursor-pointer flex flex-col items-center ${
                      isSelected
                        ? isEuchreCount
                          ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                          : 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{t}</span>
                    <span className="text-[9px] font-sans uppercase tracking-wider opacity-85">
                      {t < 3 ? 'Euchred' : t === 5 ? 'March!' : 'Made'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ONE-TAP QUICK SCORE SHORTCUT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => commitHandScore(3, false)}
                className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 text-left transition-all cursor-pointer"
              >
                <div className="font-black text-xs text-emerald-900 dark:text-emerald-200 uppercase">
                  Made Point (3–4)
                </div>
                <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  +1 pt Maker
                </div>
              </button>

              <button
                type="button"
                onClick={() => commitHandScore(5, false)}
                className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-300 dark:border-teal-800 text-left transition-all cursor-pointer"
              >
                <div className="font-black text-xs text-teal-900 dark:text-teal-200 uppercase">
                  March (All 5)
                </div>
                <div className="font-mono text-sm font-black text-teal-600 dark:text-teal-400 mt-0.5">
                  +2 pts Maker
                </div>
              </button>

              <button
                type="button"
                onClick={() => commitHandScore(5, true)}
                className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800 text-left transition-all cursor-pointer"
              >
                <div className="font-black text-xs text-amber-900 dark:text-amber-200 uppercase">
                  Alone Sweep (5)
                </div>
                <div className="font-mono text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  +{gameState.rules?.aloneMarchPoints || 4} pts Maker
                </div>
              </button>

              <button
                type="button"
                onClick={() => commitHandScore(2, wentAlone)}
                data-tv-action="danger"
                className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-300 dark:border-rose-800 text-left transition-all cursor-pointer"
              >
                <div className="font-black text-xs text-rose-900 dark:text-rose-200 uppercase">
                  Euchred! (&lt;3)
                </div>
                <div className="font-mono text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  +{gameState.rules?.euchrePoints || 2} pts Defenders
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => commitHandScore()}
              data-tv-action="primary"
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              Log Hand #{gameState.currentHand} ({activePreview.summary})
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT AREA: STANDINGS & HAND LOG */}
      <div className="lg:col-span-4 space-y-5">
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border-2 border-emerald-100 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
              Euchre Standings (Target {gameState.targetScore})
            </h3>
            <div className="flex items-center gap-2">
              {onOpenHouseRules && (
                <button
                  type="button"
                  onClick={onOpenHouseRules}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-black uppercase cursor-pointer"
                >
                  Rules
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-rose-500 hover:text-rose-600 font-black uppercase cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {[...gameState.players]
              .sort((a, b) => (gameState.scores[b.id] || 0) - (gameState.scores[a.id] || 0))
              .map((comp, idx) => {
                const score = gameState.scores[comp.id] || 0;
                const pct = Math.min(100, Math.max(0, Math.round((score / gameState.targetScore) * 100)));

                return (
                  <div
                    key={comp.id}
                    className="p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                        <span className="text-lg">{comp.avatar || '♣'}</span>
                        <div>
                          <div className="font-black text-sm text-slate-900 dark:text-white uppercase">
                            {comp.name}
                          </div>
                          {score === gameState.targetScore - 1 && (
                            <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">
                              ★ In the Barn ({score}/{gameState.targetScore})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-black text-xl text-emerald-950 dark:text-emerald-200">
                          {score} <span className="text-xs font-normal text-slate-400">/ {gameState.targetScore}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomAdjustEntityId(customAdjustEntityId === comp.id ? null : comp.id)
                          }
                          className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                        >
                          Adjust
                        </button>
                      </div>
                    </div>

                    {customAdjustEntityId === comp.id && (
                      <form onSubmit={handleManualScoreAdjust} className="flex gap-1.5 pt-1">
                        <input
                          type="number"
                          value={customAdjustAmount}
                          onChange={(e) => setCustomAdjustAmount(e.target.value)}
                          placeholder="+/- pts (e.g. 1 or -1)"
                          className="flex-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 bg-emerald-600 text-white text-xs font-black rounded-lg uppercase cursor-pointer"
                        >
                          Apply
                        </button>
                      </form>
                    )}

                    {/* Visual Pip Counter Dots (Up to 10-15 pts) */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {Array.from({ length: Math.min(20, gameState.targetScore) }).map((_, pipIdx) => (
                        <span
                          key={pipIdx}
                          className={`h-2 flex-1 rounded-full transition-all ${
                            pipIdx < score
                              ? 'bg-emerald-500'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* HAND HISTORY LOG */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border-2 border-emerald-100 dark:border-slate-800 p-6 space-y-3">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
            Euchre Hand Log ({gameState.rounds.length})
          </h3>
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {gameState.rounds.map((r) => {
              const suitMeta = SUIT_META[r.trumpSuit] || SUIT_META.spades;
              return (
                <div
                  key={r.handNumber}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-black text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                    <span>Hand #{r.handNumber}</span>
                    <span className={suitMeta.colorClass}>
                      Trump: {suitMeta.symbol} {suitMeta.name}
                    </span>
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{r.summary}</div>
                </div>
              );
            })}
            {gameState.rounds.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                Completed Euchre hands will appear here.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RESET MODAL */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-55 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[36px] border-2 border-emerald-100 dark:border-slate-800 p-7 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <div className="mx-auto w-14 h-14 bg-rose-100 dark:bg-rose-950/50 rounded-2xl flex items-center justify-center text-rose-600">
                <RotateCcw className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">
                Reset Euchre Match?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                This will clear the current Euchre scoreboard and return to match setup.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmResetGame}
                  className="py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase cursor-pointer"
                >
                  Yes, Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ALERT NOTICE MODAL */}
      <AnimatePresence>
        {alertMessage && (
          <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-55 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[36px] border-2 border-amber-200 dark:border-slate-800 p-7 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{alertMessage}</p>
              <button
                type="button"
                onClick={() => setAlertMessage(null)}
                className="w-full py-2.5 rounded-full bg-emerald-600 text-white text-xs font-black uppercase cursor-pointer"
              >
                OK
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
