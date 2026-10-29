import React, { useState, useEffect, useRef } from 'react';
import {
  Player,
  SpadesState,
  SpadesRound,
  SpadesBidEntry,
  SpadesGameMode,
  SpadesNilType,
  SpadesHouseRules,
  SpadesTeam,
} from '../types';
import { DEFAULT_SPADES_RULES } from '../lib/houseRules';
import {
  Play,
  RotateCcw,
  Trash2,
  Plus,
  UserPlus,
  X,
  AlertCircle,
  Undo,
  Wifi,
  Sliders,
  Users,
  User,
  Sparkles,
  ShieldAlert,
  Crown,
  Check,
  Award,
  Minus,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, saveActiveGameToFirestore, deleteSavedGameFromFirestore } from '../lib/firebase';
import { useSound } from '../lib/SoundContext';
import { safeClone, safeJsonStringify } from '../lib/utils';

interface SpadesScorerProps {
  players: Player[];
  onGameFinished: (winnerName: string, finalScores: Record<string, number>) => void;
  onAddPlayer?: (name: string, color: string) => Player;
  externalGameState?: SpadesState | null;
  onSyncGameRoom?: (newGameState: SpadesState) => void;
  isOnlineSynced?: boolean;
  houseRules?: SpadesHouseRules;
  onOpenHouseRules?: () => void;
}

function normalizeSpadesState(raw: any, fallbackRules: SpadesHouseRules): SpadesState | null {
  if (!raw || typeof raw !== 'object') return null;
  const players: Player[] = Array.isArray(raw.players)
    ? raw.players.filter((p: any) => Boolean(p && p.id && p.name))
    : [];
  if (players.length === 0) return null;

  const rules: SpadesHouseRules = {
    ...DEFAULT_SPADES_RULES,
    ...fallbackRules,
    ...(raw.rules || {}),
  };

  const gameMode: SpadesGameMode = raw.gameMode === 'cutthroat' ? 'cutthroat' : 'partnership';
  const includeJokers = typeof raw.includeJokers === 'boolean' ? raw.includeJokers : rules.includeJokers;
  const totalTricksPerHand = Number(raw.totalTricksPerHand) > 0 ? Number(raw.totalTricksPerHand) : 13;

  const scores: Record<string, number> = {};
  const bags: Record<string, number> = {};
  const totalBagsLifetime: Record<string, number> = {};

  players.forEach((p) => {
    scores[p.id] = Number(raw.scores?.[p.id]) || 0;
    bags[p.id] = Number(raw.bags?.[p.id]) || 0;
    totalBagsLifetime[p.id] = Number(raw.totalBagsLifetime?.[p.id]) || 0;
  });

  return {
    players,
    teams: Array.isArray(raw.teams) ? raw.teams : undefined,
    gameMode,
    includeJokers,
    totalTricksPerHand,
    scores,
    bags,
    totalBagsLifetime,
    rounds: Array.isArray(raw.rounds) ? raw.rounds : [],
    currentRound: Math.max(1, Number(raw.currentRound) || 1),
    dealerIndex: Math.max(0, Number(raw.dealerIndex) || 0) % players.length,
    targetScore: Math.max(50, Number(raw.targetScore) || rules.targetScore || 500),
    winnerId: raw.winnerId || null,
    activePlayerId: raw.activePlayerId || players[0].id,
    rules,
  };
}

export default function SpadesScorer({
  players,
  onGameFinished,
  onAddPlayer,
  externalGameState,
  onSyncGameRoom,
  isOnlineSynced,
  houseRules = DEFAULT_SPADES_RULES,
  onOpenHouseRules,
}: SpadesScorerProps) {
  const { playBank, playUndo, playFarkle } = useSound();

  const [gameState, setGameState] = useState<SpadesState | null>(() => {
    return normalizeSpadesState(externalGameState, houseRules);
  });
  const [historyStack, setHistoryStack] = useState<SpadesState[]>([]);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(() => {
    return !normalizeSpadesState(externalGameState, houseRules);
  });

  // Setup configuration state
  const [setupMode, setSetupMode] = useState<SpadesGameMode>(houseRules.gameMode || 'partnership');
  const [setupIncludeJokers, setSetupIncludeJokers] = useState<boolean>(houseRules.includeJokers ?? false);
  const [setupTricksPerHand, setSetupTricksPerHand] = useState<number>(13);
  const [setupTargetScore, setSetupTargetScore] = useState<number>(houseRules.targetScore || 500);
  const [setupBagPenalty, setSetupBagPenalty] = useState<number>(houseRules.bagPenalty ?? 100);
  const [setupNilBonus, setSetupNilBonus] = useState<number>(houseRules.nilBonus ?? 100);
  const [setupBlindNilBonus, setSetupBlindNilBonus] = useState<number>(houseRules.blindNilBonus ?? 200);

  // Cutthroat player selection
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Partnership team setup
  const [team1Name, setTeam1Name] = useState('Spade Royals');
  const [team2Name, setTeam2Name] = useState('Trump Hunters');
  const [team1Members, setTeam1Members] = useState<string[]>([]);
  const [team2Members, setTeam2Members] = useState<string[]>([]);

  // Sync setup defaults when houseRules change
  useEffect(() => {
    if (isSettingUp) {
      setSetupMode(houseRules.gameMode || 'partnership');
      setSetupIncludeJokers(houseRules.includeJokers ?? false);
      setSetupTargetScore(houseRules.targetScore || 500);
      setSetupBagPenalty(houseRules.bagPenalty ?? 100);
      setSetupNilBonus(houseRules.nilBonus ?? 100);
      setSetupBlindNilBonus(houseRules.blindNilBonus ?? 200);
    }
  }, [houseRules, isSettingUp]);

  // Initialize player selections for setup
  useEffect(() => {
    if (players.length > 0 && selectedPlayerIds.length === 0) {
      setSelectedPlayerIds(players.slice(0, 4).map((p) => p.id));
    }
    if (players.length >= 2 && team1Members.length === 0 && team2Members.length === 0) {
      setTeam1Members(players.slice(0, 2).map((p) => p.id));
      setTeam2Members(players.slice(2, 4).map((p) => p.id));
    }
  }, [players]);

  // Automatically adjust default tricks per hand if 3-player cutthroat + jokers is toggled
  useEffect(() => {
    if (setupMode === 'cutthroat' && selectedPlayerIds.length === 3) {
      setSetupTricksPerHand(setupIncludeJokers ? 18 : 17);
    } else {
      setSetupTricksPerHand(13);
    }
  }, [setupMode, selectedPlayerIds.length, setupIncludeJokers]);

  // Current round bid & tricks input state
  const [handInputs, setHandInputs] = useState<Record<string, SpadesBidEntry>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showAddPlayerInGame, setShowAddPlayerInGame] = useState(false);
  const [inGameNewPlayerName, setInGameNewPlayerName] = useState('');
  const [customAdjustEntityId, setCustomAdjustEntityId] = useState<string | null>(null);
  const [customAdjustAmount, setCustomAdjustAmount] = useState('');

  // Initialize handInputs whenever active game players or round changes
  useEffect(() => {
    if (!gameState || !gameState.players) return;
    setHandInputs((prev) => {
      const next: Record<string, SpadesBidEntry> = {};
      const defaultBid = gameState.gameMode === 'partnership' ? 4 : 3;
      gameState.players.forEach((p) => {
        if (prev[p.id]) {
          next[p.id] = prev[p.id];
        } else {
          next[p.id] = {
            bid: defaultBid,
            nilType: 'none',
            tricksWon: defaultBid,
            partnerNilType: 'none',
            partnerNilSuccess: true,
          };
        }
      });
      return next;
    });
  }, [gameState?.players?.length, gameState?.currentRound, gameState?.gameMode]);

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
    const saved = localStorage.getItem('scorekeeper_saved_spades');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const normalized = normalizeSpadesState(parsed?.gameState, houseRules);
        if (normalized) {
          setGameState(normalized);
          setIsSettingUp(false);
        }
      } catch (err) {
        console.error('Error loading saved Spades game:', err);
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
    const normalized = normalizeSpadesState(externalGameState, houseRules);
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
          localStorage.removeItem('scorekeeper_saved_spades');
          if (auth.currentUser) {
            deleteSavedGameFromFirestore(auth.currentUser.uid, 'spades');
          }
        } else {
          const savedData = {
            gameType: 'spades' as const,
            gameState,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem('scorekeeper_saved_spades', safeJsonStringify(savedData));
          if (auth.currentUser) {
            saveActiveGameToFirestore(auth.currentUser.uid, 'spades', savedData);
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
    const activeRules: SpadesHouseRules = {
      ...houseRules,
      targetScore: setupTargetScore,
      gameMode: setupMode,
      includeJokers: setupIncludeJokers,
      bagPenalty: setupBagPenalty,
      nilBonus: setupNilBonus,
      blindNilBonus: setupBlindNilBonus,
    };

    let competitors: Player[] = [];
    let teams: SpadesTeam[] | undefined = undefined;

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
          id: 'spades-team-1',
          name: t1Display,
          color: 'bg-indigo-600 text-white',
          avatar: '♠️',
          memberIds: t1Players.map((p) => p.id),
          memberNames: t1Players.map((p) => p.name),
        },
        {
          id: 'spades-team-2',
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
        setAlertMessage('Please select at least 2 players for Cutthroat Spades!');
        return;
      }
      competitors = chosen;
    }

    const initialScores: Record<string, number> = {};
    const initialBags: Record<string, number> = {};
    const initialLifetimeBags: Record<string, number> = {};
    const initialInputs: Record<string, SpadesBidEntry> = {};

    const defaultBid = setupMode === 'partnership' ? 4 : Math.max(1, Math.floor(setupTricksPerHand / competitors.length));

    competitors.forEach((c) => {
      initialScores[c.id] = 0;
      initialBags[c.id] = 0;
      initialLifetimeBags[c.id] = 0;
      initialInputs[c.id] = {
        bid: defaultBid,
        nilType: 'none',
        tricksWon: defaultBid,
        partnerNilType: 'none',
        partnerNilSuccess: true,
      };
    });

    setHandInputs(initialInputs);
    setHistoryStack([]);
    setGameState({
      players: competitors,
      teams,
      gameMode: setupMode,
      includeJokers: setupIncludeJokers,
      totalTricksPerHand: setupTricksPerHand,
      scores: initialScores,
      bags: initialBags,
      totalBagsLifetime: initialLifetimeBags,
      rounds: [],
      currentRound: 1,
      dealerIndex: 0,
      targetScore: setupTargetScore,
      winnerId: null,
      activePlayerId: competitors[0].id,
      rules: activeRules,
    });
    setIsSettingUp(false);
  };

  // Calculate preview result for a single competitor in the current hand
  const calculateCompetitorHandOutcome = (entityId: string, entry: SpadesBidEntry) => {
    if (!gameState) {
      return { delta: 0, bagsAdded: 0, bagPenaltyTriggered: 0, breakdown: '' };
    }
    const rules = gameState.rules || DEFAULT_SPADES_RULES;
    const currentBags = Number(gameState.bags[entityId]) || 0;
    const bid = Math.max(0, Number(entry?.bid) || 0);
    const tricks = Math.max(0, Number(entry?.tricksWon) || 0);
    const nilType: SpadesNilType = entry?.nilType || 'none';
    const partnerNilType: SpadesNilType = entry?.partnerNilType || 'none';
    const partnerNilSuccess = entry?.partnerNilSuccess ?? true;

    let delta = 0;
    let bagsAdded = 0;
    let bagPenaltyTriggered = 0;
    const notes: string[] = [];

    // 1. Check primary Nil / Blind Nil bid (when competitor's own bid is Nil)
    if (nilType === 'nil' || nilType === 'blind_nil') {
      const bonusVal = nilType === 'blind_nil' ? (rules.blindNilBonus || 200) : (rules.nilBonus || 100);
      const label = nilType === 'blind_nil' ? 'Blind Nil' : 'Nil';
      if (tricks === 0) {
        delta += bonusVal;
        notes.push(`${label} Made (+${bonusVal})`);
      } else {
        delta -= bonusVal;
        bagsAdded += tricks;
        notes.push(`${label} Failed (-${bonusVal}, +${tricks} bag${tricks > 1 ? 's' : ''})`);
      }
    } else {
      // Standard trick bidding
      if (tricks >= bid) {
        const basePts = bid * 10;
        const overtricks = tricks - bid;
        bagsAdded += overtricks;
        delta += basePts + overtricks;
        notes.push(
          overtricks > 0
            ? `Made ${bid} (+${basePts}) & +${overtricks} bag${overtricks > 1 ? 's' : ''}`
            : `Exact Bid ${bid} (+${basePts})`
        );
      } else {
        const setPenalty = bid * 10;
        delta -= setPenalty;
        notes.push(`Set! ${tricks}/${bid} (-${setPenalty})`);
      }

      // Check if in Partnership mode one partner also bid Nil alongside the team bid
      if (gameState.gameMode === 'partnership' && (partnerNilType === 'nil' || partnerNilType === 'blind_nil')) {
        const pBonus = partnerNilType === 'blind_nil' ? (rules.blindNilBonus || 200) : (rules.nilBonus || 100);
        const pLabel = partnerNilType === 'blind_nil' ? 'Partner Blind Nil' : 'Partner Nil';
        if (partnerNilSuccess) {
          delta += pBonus;
          notes.push(`${pLabel} Made (+${pBonus})`);
        } else {
          delta -= pBonus;
          notes.push(`${pLabel} Failed (-${pBonus})`);
        }
      }
    }

    // 2. Check bag accumulation penalty (e.g. every 10 bags = -100 pts)
    const threshold = rules.bagThreshold || 10;
    const penaltyAmt = rules.bagPenalty ?? 100;
    if (penaltyAmt > 0 && threshold > 0 && bagsAdded > 0) {
      const totalNewBags = currentBags + bagsAdded;
      if (totalNewBags >= threshold) {
        const rollovers = Math.floor(totalNewBags / threshold);
        bagPenaltyTriggered = rollovers * penaltyAmt;
        delta -= bagPenaltyTriggered;
        notes.push(`${threshold}-Bag Penalty (-${bagPenaltyTriggered})`);
      }
    }

    return {
      delta,
      bagsAdded,
      bagPenaltyTriggered,
      breakdown: notes.join(' • '),
    };
  };

  const handleScoreHand = () => {
    if (!gameState) return;
    pushStateToHistory();

    const updatedScores = { ...gameState.scores };
    const updatedBags = { ...gameState.bags };
    const updatedLifetimeBags = { ...(gameState.totalBagsLifetime || {}) };
    const roundDeltas: Record<string, number> = {};
    const bagsAddedMap: Record<string, number> = {};
    const bagPenaltiesMap: Record<string, number> = {};
    const entriesSnapshot: Record<string, SpadesBidEntry> = {};

    const threshold = gameState.rules?.bagThreshold || 10;
    const penaltyAmt = gameState.rules?.bagPenalty ?? 100;

    let anySetOrPenalty = false;

    gameState.players.forEach((p) => {
      const entry = handInputs[p.id] || {
        bid: 4,
        nilType: 'none',
        tricksWon: 4,
        partnerNilType: 'none',
        partnerNilSuccess: true,
      };
      entriesSnapshot[p.id] = { ...entry };

      const outcome = calculateCompetitorHandOutcome(p.id, entry);
      roundDeltas[p.id] = outcome.delta;
      bagsAddedMap[p.id] = outcome.bagsAdded;
      bagPenaltiesMap[p.id] = outcome.bagPenaltyTriggered;

      if (outcome.delta < 0 || outcome.bagPenaltyTriggered > 0) {
        anySetOrPenalty = true;
      }

      updatedScores[p.id] = (updatedScores[p.id] || 0) + outcome.delta;
      const rawBags = (updatedBags[p.id] || 0) + outcome.bagsAdded;
      updatedBags[p.id] = penaltyAmt > 0 && threshold > 0 ? rawBags % threshold : rawBags;
      updatedLifetimeBags[p.id] = (updatedLifetimeBags[p.id] || 0) + outcome.bagsAdded;
    });

    if (anySetOrPenalty) {
      playFarkle();
    } else {
      playBank();
    }

    const dealerPlayer = gameState.players[gameState.dealerIndex % gameState.players.length];
    const newRound: SpadesRound = {
      roundNumber: gameState.currentRound,
      dealerId: dealerPlayer?.id,
      entries: entriesSnapshot,
      roundDeltas,
      bagsAdded: bagsAddedMap,
      bagPenalties: bagPenaltiesMap,
    };

    // Check if someone reached targetScore (and isn't tied at the top)
    let newWinnerId: string | null = null;
    const sorted = [...gameState.players].sort(
      (a, b) => (updatedScores[b.id] || 0) - (updatedScores[a.id] || 0)
    );
    if (sorted.length > 0) {
      const topScore = updatedScores[sorted[0].id] || 0;
      const secondScore = sorted.length > 1 ? (updatedScores[sorted[1].id] ?? -999999) : -999999;
      if (topScore >= gameState.targetScore && topScore > secondScore) {
        newWinnerId = sorted[0].id;
      }
    }

    const nextDealerIdx = (gameState.dealerIndex + 1) % gameState.players.length;
    const nextState: SpadesState = {
      ...gameState,
      scores: updatedScores,
      bags: updatedBags,
      totalBagsLifetime: updatedLifetimeBags,
      rounds: [newRound, ...gameState.rounds],
      currentRound: gameState.currentRound + 1,
      dealerIndex: nextDealerIdx,
      activePlayerId: gameState.players[nextDealerIdx]?.id || gameState.players[0].id,
      winnerId: newWinnerId,
    };

    setGameState(nextState);

    if (newWinnerId) {
      const winnerEntity = gameState.players.find((p) => p.id === newWinnerId);
      if (winnerEntity) {
        localStorage.removeItem('scorekeeper_saved_spades');
        // Map scores so both team/competitor IDs and any individual roster member IDs are included
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

  const updateHandEntry = (entityId: string, patch: Partial<SpadesBidEntry>) => {
    setHandInputs((prev) => {
      const existing = prev[entityId] || {
        bid: 4,
        nilType: 'none',
        tricksWon: 4,
        partnerNilType: 'none',
        partnerNilSuccess: true,
      };
      const updated = { ...existing, ...patch };
      if (patch.nilType === 'nil' || patch.nilType === 'blind_nil') {
        updated.bid = 0;
        updated.tricksWon = 0;
      } else if (patch.nilType === 'none' && existing.nilType !== 'none' && updated.bid === 0) {
        updated.bid = 1;
      }
      return { ...prev, [entityId]: updated };
    });
  };

  const fillRemainingTricksFor = (entityId: string) => {
    if (!gameState) return;
    const othersSum = gameState.players
      .filter((p) => p.id !== entityId)
      .reduce((sum, p) => sum + (Number(handInputs[p.id]?.tricksWon) || 0), 0);
    const remaining = Math.max(0, gameState.totalTricksPerHand - othersSum);
    updateHandEntry(entityId, { tricksWon: remaining });
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
      [customAdjustEntityId]: (gameState.scores[customAdjustEntityId] || 0) + pts,
    };

    setGameState({
      ...gameState,
      scores: updatedScores,
    });
    setCustomAdjustAmount('');
    setCustomAdjustEntityId(null);
  };

  const toggleJokersInActiveGame = () => {
    if (!gameState) return;
    pushStateToHistory();
    const nextJokers = !gameState.includeJokers;
    let nextTricks = gameState.totalTricksPerHand;
    if (gameState.gameMode === 'cutthroat' && gameState.players.length === 3) {
      nextTricks = nextJokers ? 18 : 17;
    }
    setGameState({
      ...gameState,
      includeJokers: nextJokers,
      totalTricksPerHand: nextTricks,
      rules: {
        ...gameState.rules,
        includeJokers: nextJokers,
      },
    });
  };

  const confirmResetGame = () => {
    localStorage.removeItem('scorekeeper_saved_spades');
    if (auth.currentUser) {
      deleteSavedGameFromFirestore(auth.currentUser.uid, 'spades');
    }
    setIsSettingUp(true);
    setGameState(null);
    setHistoryStack([]);
    setShowResetConfirm(false);
  };

  // SETUP VIEW
  if (isSettingUp) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-md border-2 border-indigo-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
              ♠
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Spades Scorekeeper Setup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Configure Partnership (2v2) or Cutthroat mode, High &amp; Low Jokers, and bag rules
              </p>
            </div>
          </div>

          {onOpenHouseRules && (
            <button
              type="button"
              onClick={onOpenHouseRules}
              className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              House Rules Presets
            </button>
          )}
        </div>

        {/* 1. GAME MODE: PARTNERSHIP vs CUTTHROAT */}
        <div className="space-y-2.5">
          <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            1. Select Spades Mode (Partnership vs. Cutthroat)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSetupMode('partnership')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                setupMode === 'partnership'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 bg-slate-50/40 dark:bg-slate-800/40'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${setupMode === 'partnership' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  Partnership (2v2 Teams)
                  {setupMode === 'partnership' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 stroke-[3]" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Classic 4-player team Spades. Partners combine bids &amp; tricks, with optional individual Partner Nil bids.
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
                  Cutthroat (Solo Free-For-All)
                  {setupMode === 'cutthroat' && <Check className="w-4 h-4 text-rose-600 dark:text-rose-400 stroke-[3]" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Every player for themselves (3, 4, or 5 players)! Individual bidding, bags, and Nil bonuses.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. HIGH & LOW JOKERS OPTION */}
        <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-300/80 dark:border-amber-700/60 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-amber-50/70 dark:from-amber-950/30 dark:via-slate-900 dark:to-amber-950/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-xl font-black shrink-0 shadow-xs">
                🃏
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Play with High &amp; Low Jokers (Big &amp; Little Joker)
                  </h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    setupIncludeJokers
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {setupIncludeJokers ? 'Jokers Enabled' : 'Standard 52-Card Deck'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Adds Big Joker (High) and Little Joker (Low) as the top two Spades trumps above the 2♠ and A♠.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSetupIncludeJokers((prev) => !prev)}
              className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-2 shadow-xs ${
                setupIncludeJokers
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400/50'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <span>🃏 {setupIncludeJokers ? 'High & Low Jokers: ON' : 'Enable High & Low Jokers'}</span>
            </button>
          </div>

          {setupIncludeJokers && (
            <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 font-mono font-bold text-amber-950 dark:text-amber-200">
                <span className="text-[10px] font-sans font-black uppercase text-amber-700 dark:text-amber-400 mr-1">
                  Trump Order:
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900/60">1. Big Joker ★</span>
                <span>&gt;</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900/60">2. Little Joker ☆</span>
                <span>&gt;</span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800">3. 2♠</span>
                <span>&gt;</span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800">4. A♠</span>
                <span>&gt;</span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800">5. K♠</span>
              </div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                {setupMode === 'cutthroat' && selectedPlayerIds.length === 3
                  ? '3-Player Joker Deck: 54 cards dealt (18 tricks/hand)'
                  : '4-Player Joker Deck: Remove 2♦ & 2♣ (13 tricks/hand)'}
              </span>
            </div>
          )}
        </div>

        {/* 3. TEAMS OR PLAYERS SELECTION */}
        {setupMode === 'partnership' ? (
          <div className="space-y-4">
            <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              2. Configure Partnership Teams (2v2)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Team 1 */}
              <div className="p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-black">
                    ♠
                  </span>
                  <input
                    type="text"
                    value={team1Name}
                    onChange={(e) => setTeam1Name(e.target.value)}
                    placeholder="Team 1 Name..."
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-indigo-800 dark:text-indigo-300 mb-1.5">
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
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
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
              2. Select Cutthroat Players ({selectedPlayerIds.length} Selected — 3 or 4 Recommended)
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
                  id="quick-add-spades-player"
                  placeholder="Quick Add Player..."
                  maxLength={15}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        const newP = onAddPlayer(val, 'bg-indigo-500 text-white');
                        setSelectedPlayerIds((prev) => [...prev, newP.id]);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('quick-add-spades-player') as HTMLInputElement;
                    const val = input?.value.trim();
                    if (val) {
                      const newP = onAddPlayer(val, 'bg-indigo-500 text-white');
                      setSelectedPlayerIds((prev) => [...prev, newP.id]);
                      if (input) input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. TARGET SCORE & TRICKS PER HAND */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Target Winning Score
            </label>
            <div className="flex flex-wrap gap-2">
              {[250, 300, 500, 750, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSetupTargetScore(val)}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black font-mono border-2 transition-all cursor-pointer ${
                    setupTargetScore === val
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Total Tricks Per Hand
            </label>
            <div className="flex gap-2">
              {[
                { tricks: 13, label: '13 Tricks (Standard)' },
                { tricks: 17, label: '17 (3P Deck)' },
                { tricks: 18, label: '18 (3P + Jokers)' },
              ].map((opt) => (
                <button
                  key={opt.tricks}
                  type="button"
                  onClick={() => setSetupTricksPerHand(opt.tricks)}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                    setupTricksPerHand === opt.tricks
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={startNewGame}
          data-tv-action="primary"
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer uppercase tracking-wider"
        >
          <Play className="w-4 h-4 fill-current" />
          Start Spades Match ({setupMode === 'partnership' ? 'Partnership 2v2' : 'Cutthroat Solo'}
          {setupIncludeJokers ? ' • High & Low Jokers' : ''})
        </button>
      </div>
    );
  }

  if (!gameState || !gameState.players || gameState.players.length === 0) {
    if (isOnlineSynced) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/80 border-2 border-indigo-500/30 rounded-3xl text-center space-y-4 max-w-md mx-auto my-12 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Wifi className="w-7 h-7 animate-pulse" />
          </div>
          <h3 className="text-xl font-black text-white">Synchronizing Spades Match...</h3>
          <p className="text-sm text-slate-400">Connecting devices and syncing bids and scores in real-time.</p>
        </div>
      );
    }
    return null;
  }

  const totalBidsOnTable = gameState.players.reduce((sum, p) => {
    const entry = handInputs[p.id];
    const bidVal = entry?.nilType && entry.nilType !== 'none' ? 0 : Number(entry?.bid) || 0;
    return sum + bidVal;
  }, 0);

  const totalTricksEntered = gameState.players.reduce((sum, p) => {
    return sum + (Number(handInputs[p.id]?.tricksWon) || 0);
  }, 0);

  const currentDealer =
    gameState.players[gameState.dealerIndex % gameState.players.length] || gameState.players[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT AREA: ACTIVE ROUND BIDDING & TRICKS SCORER */}
      <div className="lg:col-span-8 space-y-5">
        {/* TOP MATCH STATUS BANNER */}
        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white rounded-[32px] p-6 shadow-xl border-2 border-indigo-500/30 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-black uppercase tracking-widest">
                  Round #{gameState.currentRound}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  {gameState.gameMode === 'partnership' ? (
                    <>
                      <Users className="w-3 h-3 text-indigo-300" /> Partnership 2v2
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 text-rose-300" /> Cutthroat Solo
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={toggleJokersInActiveGame}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-1 ${
                    gameState.includeJokers
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                  title="Click to toggle High & Low Jokers for this match"
                >
                  🃏 {gameState.includeJokers ? 'High & Low Jokers: ON' : 'Jokers: OFF'}
                </button>
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

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase flex items-center gap-2.5 pt-1">
                <span>♠ Spades Hand Scorer</span>
              </h2>
              <p className="text-xs text-indigo-200/90 font-medium flex items-center gap-2">
                <span>
                  Current Dealer:{' '}
                  <strong className="text-amber-300 font-black">{currentDealer.name}</strong>
                </span>
                <span>•</span>
                <span>Target: {gameState.targetScore} pts</span>
              </p>
            </div>

            {/* Table Bid vs Tricks Summary Pill */}
            <div className="flex items-center gap-3 bg-slate-950/60 border border-indigo-400/30 px-4 py-3 rounded-2xl">
              <div className="text-center pr-3 border-r border-slate-700">
                <div className="text-[9px] text-indigo-300 font-black uppercase tracking-widest">
                  Table Bids
                </div>
                <div className="font-mono text-lg font-black text-white">
                  {totalBidsOnTable} / {gameState.totalTricksPerHand}
                </div>
                <div className="text-[9px] font-bold text-amber-300 uppercase">
                  {totalBidsOnTable > gameState.totalTricksPerHand
                    ? `+${totalBidsOnTable - gameState.totalTricksPerHand} Overbid`
                    : totalBidsOnTable < gameState.totalTricksPerHand
                    ? `${gameState.totalTricksPerHand - totalBidsOnTable} Underbid`
                    : 'Exact Table'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[9px] text-indigo-300 font-black uppercase tracking-widest">
                  Tricks Entered
                </div>
                <div
                  className={`font-mono text-lg font-black ${
                    totalTricksEntered === gameState.totalTricksPerHand
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {totalTricksEntered} / {gameState.totalTricksPerHand}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase">
                  {totalTricksEntered === gameState.totalTricksPerHand ? 'Ready ✓' : 'In Progress'}
                </div>
              </div>
            </div>
          </div>

          {/* HIGH & LOW JOKERS TRUMP ORDER REFERENCE BAR */}
          {gameState.includeJokers && (
            <div className="mt-4 pt-3.5 border-t border-indigo-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 font-mono">
                <span className="text-[10px] font-sans font-black uppercase tracking-wider text-amber-300 flex items-center gap-1 mr-1">
                  <Sparkles className="w-3.5 h-3.5" /> High &amp; Low Joker Trump Rank:
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-200 font-black">
                  1. Big Joker (High) ★
                </span>
                <span className="text-indigo-400">&gt;</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-100 font-bold">
                  2. Little Joker (Low) ☆
                </span>
                <span className="text-indigo-400">&gt;</span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-bold">
                  3. 2♠
                </span>
                <span className="text-indigo-400">&gt;</span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-bold">
                  4. A♠
                </span>
                <span className="text-indigo-400">&gt;</span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-bold">
                  5. K♠ ...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* COMPETITOR BID & TRICKS CARDS */}
        <div className="space-y-4">
          {gameState.players.map((competitor) => {
            const entry = handInputs[competitor.id] || {
              bid: 4,
              nilType: 'none',
              tricksWon: 4,
              partnerNilType: 'none',
              partnerNilSuccess: true,
            };
            const preview = calculateCompetitorHandOutcome(competitor.id, entry);
            const currentScore = gameState.scores[competitor.id] || 0;
            const currentBags = gameState.bags[competitor.id] || 0;
            const teamObj = gameState.teams?.find((t) => t.id === competitor.id);

            return (
              <div
                key={competitor.id}
                className="bg-white dark:bg-slate-900 rounded-[28px] border-2 border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4"
              >
                {/* Card Top Row: Name, Current Score & Live Hand Delta Preview */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl ${competitor.color.split(' ')[0]} text-white flex items-center justify-center font-black text-lg shadow-xs`}
                    >
                      {competitor.avatar || competitor.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                          {competitor.name}
                        </h3>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {currentScore} pts ({currentBags} bag{currentBags === 1 ? '' : 's'})
                        </span>
                      </div>
                      {teamObj && teamObj.memberNames.length > 0 && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                          Partners: {teamObj.memberNames.join(' & ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Live Hand Outcome Badge */}
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-sm font-black ${
                        preview.delta >= 0
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <span>{preview.delta >= 0 ? `+${preview.delta}` : preview.delta} pts</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                      {preview.breakdown}
                    </div>
                  </div>
                </div>

                {/* Bid & Tricks Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* LEFT: BID SELECTOR & NIL OPTIONS */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        Contract Bid
                      </span>
                      <div className="flex items-center gap-1">
                        {(['none', 'nil', 'blind_nil'] as SpadesNilType[]).map((nType) => (
                          <button
                            key={nType}
                            type="button"
                            onClick={() => updateHandEntry(competitor.id, { nilType: nType })}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              entry.nilType === nType
                                ? nType === 'none'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-amber-500 text-slate-950'
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            {nType === 'none' ? 'Standard' : nType === 'nil' ? 'Nil (0)' : 'Blind Nil'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {entry.nilType === 'none' ? (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateHandEntry(competitor.id, { bid: Math.max(1, entry.bid - 1) })
                          }
                          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-white hover:bg-indigo-50 cursor-pointer font-black"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="text-center">
                          <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                            {entry.bid}
                          </span>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">
                            Tricks Bid ({entry.bid * 10} pts)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateHandEntry(competitor.id, {
                              bid: Math.min(gameState.totalTricksPerHand, entry.bid + 1),
                            })
                          }
                          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-white hover:bg-indigo-50 cursor-pointer font-black"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-2 text-center bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-300">
                          {entry.nilType === 'blind_nil'
                            ? `Blind Nil Active (±${gameState.rules?.blindNilBonus || 200} pts)`
                            : `Nil Bid Active (±${gameState.rules?.nilBonus || 100} pts)`}
                        </span>
                      </div>
                    )}

                    {/* Optional Partner Nil Toggle in Partnership mode when primary bid is standard */}
                    {gameState.gameMode === 'partnership' && entry.nilType === 'none' && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Single Partner Nil?
                        </span>
                        <div className="flex items-center gap-1">
                          {(['none', 'nil', 'blind_nil'] as SpadesNilType[]).map((pNil) => (
                            <button
                              key={pNil}
                              type="button"
                              onClick={() =>
                                updateHandEntry(competitor.id, { partnerNilType: pNil })
                              }
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase cursor-pointer ${
                                (entry.partnerNilType || 'none') === pNil
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                              }`}
                            >
                              {pNil === 'none' ? 'No' : pNil === 'nil' ? '+Nil' : '+Blind'}
                            </button>
                          ))}
                        </div>
                        {entry.partnerNilType && entry.partnerNilType !== 'none' && (
                          <div className="w-full flex items-center justify-between pt-1">
                            <span className="text-[10px] font-black uppercase text-violet-600 dark:text-violet-400">
                              Did Partner Make {entry.partnerNilType === 'blind_nil' ? 'Blind Nil' : 'Nil'}?
                            </span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateHandEntry(competitor.id, { partnerNilSuccess: true })
                                }
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase cursor-pointer ${
                                  entry.partnerNilSuccess !== false
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                                }`}
                              >
                                Made ✓
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateHandEntry(competitor.id, { partnerNilSuccess: false })
                                }
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase cursor-pointer ${
                                  entry.partnerNilSuccess === false
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                                }`}
                              >
                                Set ✗
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: TRICKS WON SELECTOR */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        Actual Tricks Won
                      </span>
                      <button
                        type="button"
                        onClick={() => fillRemainingTricksFor(competitor.id)}
                        className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                        title="Fill remaining tricks from total tricks per hand"
                      >
                        Auto-Fill Remaining
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateHandEntry(competitor.id, {
                            tricksWon: Math.max(0, entry.tricksWon - 1),
                          })
                        }
                        className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-white hover:bg-emerald-50 cursor-pointer font-black"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="text-center">
                        <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                          {entry.tricksWon}
                        </span>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">
                          Tricks Taken
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateHandEntry(competitor.id, {
                            tricksWon: Math.min(gameState.totalTricksPerHand, entry.tricksWon + 1),
                          })
                        }
                        className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-white hover:bg-emerald-50 cursor-pointer font-black"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {[0, entry.bid, Math.min(gameState.totalTricksPerHand, entry.bid + 1), Math.min(gameState.totalTricksPerHand, entry.bid + 2)]
                        .filter((v, idx, arr) => arr.indexOf(v) === idx)
                        .map((quickTrick) => (
                          <button
                            key={quickTrick}
                            type="button"
                            onClick={() => updateHandEntry(competitor.id, { tricksWon: quickTrick })}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-black cursor-pointer border ${
                              entry.tricksWon === quickTrick
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            {quickTrick === entry.bid && quickTrick > 0 ? `${quickTrick} (Bid)` : `${quickTrick}T`}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* SUBMIT HAND SCORE BUTTON */}
        <button
          type="button"
          onClick={handleScoreHand}
          data-tv-action="primary"
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          Score Round #{gameState.currentRound} &amp; Advance Dealer
        </button>
      </div>

      {/* RIGHT AREA: STANDINGS, SANDBAG METER & ROUND LOG */}
      <div className="lg:col-span-4 space-y-5">
        {/* STANDINGS & SANDBAGS */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border-2 border-indigo-100 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
              Spades Standings &amp; Bags
            </h3>
            <div className="flex items-center gap-2">
              {onOpenHouseRules && (
                <button
                  type="button"
                  onClick={onOpenHouseRules}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-black uppercase cursor-pointer"
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
                const bags = gameState.bags[comp.id] || 0;
                const bagLimit = gameState.rules?.bagThreshold || 10;
                const pct = Math.min(100, Math.max(0, Math.round((score / gameState.targetScore) * 100)));

                return (
                  <div
                    key={comp.id}
                    className="p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                        <span className="text-lg">{comp.avatar || '♠'}</span>
                        <div>
                          <div className="font-black text-sm text-slate-900 dark:text-white uppercase">
                            {comp.name}
                          </div>
                          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            Sandbags: {bags} / {bagLimit}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-black text-lg text-indigo-950 dark:text-indigo-200">
                          {score} <span className="text-xs font-normal text-slate-400">/ {gameState.targetScore}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomAdjustEntityId(customAdjustEntityId === comp.id ? null : comp.id)
                          }
                          className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer"
                        >
                          Adjust Score
                        </button>
                      </div>
                    </div>

                    {customAdjustEntityId === comp.id && (
                      <form onSubmit={handleManualScoreAdjust} className="flex gap-1.5 pt-1">
                        <input
                          type="number"
                          value={customAdjustAmount}
                          onChange={(e) => setCustomAdjustAmount(e.target.value)}
                          placeholder="+/- pts (e.g. -50)"
                          className="flex-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 bg-indigo-600 text-white text-xs font-black rounded-lg uppercase cursor-pointer"
                        >
                          Apply
                        </button>
                      </form>
                    )}

                    {/* Score Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ROUND HISTORY LOG */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border-2 border-indigo-100 dark:border-slate-800 p-6 space-y-3">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
            Hand History ({gameState.rounds.length})
          </h3>
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {gameState.rounds.map((r) => (
              <div
                key={r.roundNumber}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between font-black text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                  <span>Round #{r.roundNumber}</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {gameState.players.map((p) => {
                    const entry = r.entries?.[p.id];
                    const delta = r.roundDeltas?.[p.id] || 0;
                    const bidLabel =
                      entry?.nilType === 'blind_nil'
                        ? 'Blind Nil'
                        : entry?.nilType === 'nil'
                        ? 'Nil'
                        : `Bid ${entry?.bid ?? 0}`;
                    return (
                      <div key={p.id} className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
                          {p.name}{' '}
                          <span className="text-[10px] font-mono text-slate-400">
                            ({bidLabel}, Won {entry?.tricksWon ?? 0})
                          </span>
                        </span>
                        <span
                          className={`font-mono font-black ${
                            delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                          }`}
                        >
                          {delta >= 0 ? `+${delta}` : delta}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {gameState.rounds.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                Completed Spades hands will appear here.
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
              className="bg-white dark:bg-slate-900 rounded-[36px] border-2 border-indigo-100 dark:border-slate-800 p-7 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <div className="mx-auto w-14 h-14 bg-rose-100 dark:bg-rose-950/50 rounded-2xl flex items-center justify-center text-rose-600">
                <RotateCcw className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">
                Reset Spades Match?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                This will clear the current Spades scoreboard and return to match setup.
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
                className="w-full py-2.5 rounded-full bg-indigo-600 text-white text-xs font-black uppercase cursor-pointer"
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
