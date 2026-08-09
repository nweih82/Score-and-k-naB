import React, { useState, useEffect } from 'react';
import { Player, GameType, GameHistoryEntry, SavedGameData, FarkleState, YahtzeeState, DominoesState, YahtzeePlayerScore } from './types';

function getYahtzeePlayerTotal(sheet: YahtzeePlayerScore): number {
  if (!sheet) return 0;
  const upperKeys: (keyof YahtzeePlayerScore)[] = ['aces', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  const lowerKeys: (keyof YahtzeePlayerScore)[] = ['threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'];
  
  const upperSum = upperKeys.reduce((sum, key) => sum + ((sheet[key] as number) || 0), 0);
  const upperBonus = upperSum >= 63 ? 35 : 0;
  const lowerSum = lowerKeys.reduce((sum, key) => sum + ((sheet[key] as number) || 0), 0);
  const bonusYahtzee = (sheet.yahtzeeBonusCount || 0) * 100;
  
  return upperSum + upperBonus + lowerSum + bonusYahtzee;
}

function getYahtzeeFilledCount(sheet: YahtzeePlayerScore): number {
  if (!sheet) return 0;
  const categories: (keyof YahtzeePlayerScore)[] = [
    'aces', 'twos', 'threes', 'fours', 'fives', 'sixes',
    'threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'
  ];
  return categories.reduce((count, key) => count + (sheet[key] !== null && sheet[key] !== undefined ? 1 : 0), 0);
}

function getFarkleProgress(savedGame?: SavedGameData | null) {
  if (!savedGame || !savedGame.gameState) return null;
  const state = savedGame.gameState as FarkleState;
  const target = state.targetScore || 10000;
  const scores = state.scores || {};
  const maxScore = Math.max(...Object.values(scores), 0);
  const percent = Math.min(100, Math.max(0, Math.round((maxScore / target) * 100)));
  
  const leaderId = Object.keys(scores).find(id => scores[id] === maxScore);
  const leader = state.players?.find(p => p.id === leaderId);

  return {
    leaderName: leader ? `${leader.avatar || '👤'} ${leader.name}` : 'Leader',
    maxScore,
    target,
    percent,
  };
}

function getYahtzeeProgress(savedGame?: SavedGameData | null) {
  if (!savedGame || !savedGame.gameState) return null;
  const state = savedGame.gameState as YahtzeeState;
  const players = state.players || [];
  const scores = state.scores || {};

  let maxScore = 0;
  let maxFilledBoxes = 0;
  let leaderName = 'Leader';

  players.forEach(p => {
    const sheet = scores[p.id];
    if (sheet) {
      const total = getYahtzeePlayerTotal(sheet);
      const filled = getYahtzeeFilledCount(sheet);
      if (total >= maxScore) {
        maxScore = total;
        leaderName = `${p.avatar || '👤'} ${p.name}`;
      }
      if (filled > maxFilledBoxes) {
        maxFilledBoxes = filled;
      }
    }
  });

  const targetBoxes = 13;
  const percent = Math.min(100, Math.max(0, Math.round((maxFilledBoxes / targetBoxes) * 100)));

  return {
    leaderName,
    maxScore,
    filledCategories: maxFilledBoxes,
    totalCategories: targetBoxes,
    percent,
  };
}

function getDominoesProgress(savedGame?: SavedGameData | null) {
  if (!savedGame || !savedGame.gameState) return null;
  const state = savedGame.gameState as DominoesState;
  const target = state.targetScore || 200;
  const scores = state.scores || {};
  const maxScore = Math.max(...Object.values(scores), 0);
  const percent = Math.min(100, Math.max(0, Math.round((maxScore / target) * 100)));

  const leaderId = Object.keys(scores).find(id => scores[id] === maxScore);
  const leader = state.players?.find(p => p.id === leaderId);

  return {
    leaderName: leader ? `${leader.avatar || '👤'} ${leader.name}` : 'Leader',
    maxScore,
    target,
    percent,
  };
}
import PlayerManager from './components/PlayerManager';
import FarkleScorer from './components/FarkleScorer';
import FarkleGuide from './components/FarkleGuide';
import YahtzeeScorer from './components/YahtzeeScorer';
import DominoesScorer from './components/DominoesScorer';
import PlayerStatistics from './components/PlayerStatistics';
import { HallOfFame } from './components/HallOfFame';
import ThemeSelectorModal from './components/ThemeSelectorModal';
import { ConfettiCelebration } from './components/ConfettiCelebration';
import { OnlineRoomModal } from './components/OnlineRoomModal';
import { OnlineSyncBar } from './components/OnlineSyncBar';
import { AuthModal } from './components/AuthModal';
import { COLOR_THEMES } from './theme';
import { FarkleLogo, YahtzeeLogo, DominoesLogo, BankAndScoreLogo, BankAndScoreHorizontalLogo } from './components/GameLogos';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Flame, Sparkles, HelpCircle, History, RefreshCw, X, Check, Gamepad2, Users, ScrollText, BarChart3, Save, BookmarkCheck, Play, Trash2, Clock, Sun, Moon, Palette, LogIn, LogOut, Cloud, CloudOff, Volume2, VolumeX, Tv, Wifi, Crown, Maximize2, Minimize2 } from 'lucide-react';
import { useSound } from './lib/SoundContext';
import { useTv } from './lib/TvContext';
import { TvRemoteBar } from './components/TvRemoteBar';
import { GameRoomData, HighScoreRecord } from './types';
import {
  auth,
  loginWithGoogle,
  logoutFirebase,
  testConnection,
  checkRedirectResultOnLoad,
  subscribeToPlayers,
  savePlayerToFirestore,
  deletePlayerFromFirestore,
  subscribeToGameHistory,
  saveGameHistoryToFirestore,
  clearGameHistoryInFirestore,
  subscribeToSavedGames,
  deleteSavedGameFromFirestore,
  subscribeToGameRoomInFirestore,
  updateGameRoomStateInFirestore,
  leaveGameRoomInFirestore,
  subscribeToHallOfFame,
  saveHighScoreToHallOfFame,
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

const DEFAULT_PLAYERS: Player[] = [
  { id: '1', name: 'Nicholas', color: 'bg-rose-500 text-white' },
  { id: '2', name: 'Alice', color: 'bg-sky-500 text-white' },
  { id: '3', name: 'Bob', color: 'bg-emerald-500 text-white' },
];

const launcherContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const launcherCardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function App() {
  const { isMuted, toggleMute, playWin } = useSound();
  const { isTvMode, toggleTvMode } = useTv();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('bank_and_score_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [colorTheme, setColorTheme] = useState<string>(() => {
    return localStorage.getItem('bank_and_score_color_theme') || 'amber';
  });

  const [showThemeModal, setShowThemeModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('bank_and_score_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('bank_and_score_color_theme', colorTheme);
    COLOR_THEMES.forEach(t => {
      document.documentElement.classList.remove(t.themeClass);
    });
    const currentObj = COLOR_THEMES.find(t => t.id === colorTheme);
    if (currentObj) {
      document.documentElement.classList.add(currentObj.themeClass);
    }
  }, [colorTheme]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle notice:', err);
    }
  };

  // Test connection and check redirect auth result on mount
  useEffect(() => {
    testConnection();
    checkRedirectResultOnLoad();
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('scorekeeper_players');
    return saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
  });

  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [lobbyTab, setLobbyTab] = useState<'stats' | 'history' | 'hallOfFame'>('hallOfFame');
  
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>(() => {
    const saved = localStorage.getItem('scorekeeper_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [globalHallOfFame, setGlobalHallOfFame] = useState<HighScoreRecord[]>([]);

  // Subscribe to real-time global Hall of Fame records
  useEffect(() => {
    const unsubFame = subscribeToHallOfFame(records => {
      setGlobalHallOfFame(records);
    });
    return () => unsubFame();
  }, []);

  const [showFarkleGuide, setShowFarkleGuide] = useState(false);
  const [winnerCelebration, setWinnerCelebration] = useState<{
    winnerName: string;
    gameType: GameType;
    scores: Record<string, number>;
  } | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);

  // Saved Games State
  const [savedGames, setSavedGames] = useState<{
    farkle?: SavedGameData | null;
    yahtzee?: SavedGameData | null;
    dominoes?: SavedGameData | null;
  }>({});

  // Device & Online Room Multiplayer State
  const [deviceId] = useState<string>(() => {
    let id = localStorage.getItem('scorekeeper_device_id');
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('scorekeeper_device_id', id);
    }
    return id;
  });

  const [activeRoom, setActiveRoom] = useState<GameRoomData | null>(null);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState<boolean>(false);
  const [roomExternalGameState, setRoomExternalGameState] = useState<any>(null);
  const [roomExternalTurnScore, setRoomExternalTurnScore] = useState<number | null>(null);

  // Check URL params for room invite code (?room=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setIsOnlineModalOpen(true);
    }
  }, []);

  // Subscribe to real-time updates for active room
  useEffect(() => {
    if (!activeRoom) {
      setRoomExternalGameState(null);
      setRoomExternalTurnScore(null);
      return;
    }

    const unsub = subscribeToGameRoomInFirestore(activeRoom.code, (roomData) => {
      if (roomData) {
        setActiveRoom(roomData);
        if (roomData.gameType && roomData.gameType !== activeGame) {
          setActiveGame(roomData.gameType);
        }
        if (roomData.gameState) {
          setRoomExternalGameState(roomData.gameState);
        }
        if (roomData.turnScore !== undefined) {
          setRoomExternalTurnScore(roomData.turnScore);
        }
      } else {
        setActiveRoom(null);
        setRoomExternalGameState(null);
      }
    });

    return () => unsub();
  }, [activeRoom?.code]);

  const handleSyncGameRoom = (newGameState: any, turnScore?: number | null) => {
    if (!activeRoom) return;
    const currentPlayer = players.find(p => p.id === deviceId) || players[0];
    const actionBy = currentPlayer ? `${currentPlayer.name} updated score` : 'Score updated';
    updateGameRoomStateInFirestore(activeRoom.code, newGameState, turnScore ?? null, actionBy);
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    await leaveGameRoomInFirestore(activeRoom.code, deviceId);
    setActiveRoom(null);
    setRoomExternalGameState(null);
  };

  // Firestore Realtime Subscriptions
  useEffect(() => {
    if (!currentUser) return;

    // 1. Subscribe to Players
    const unsubPlayers = subscribeToPlayers(currentUser.uid, fsPlayers => {
      if (fsPlayers.length > 0) {
        setPlayers(fsPlayers);
      } else if (players.length > 0) {
        // First-time sync: push existing local players to Firestore
        players.forEach(p => savePlayerToFirestore(currentUser.uid, p));
      }
    });

    // 2. Subscribe to Game History
    const unsubHistory = subscribeToGameHistory(currentUser.uid, fsHistory => {
      if (fsHistory.length > 0) {
        setGameHistory(fsHistory);
      } else if (gameHistory.length > 0) {
        // First-time sync: push existing local history to Firestore
        gameHistory.forEach(h => saveGameHistoryToFirestore(currentUser.uid, h));
      }
    });

    // 3. Subscribe to Saved Games
    const unsubSaved = subscribeToSavedGames(currentUser.uid, fsSaved => {
      setSavedGames(fsSaved);
    });

    return () => {
      unsubPlayers();
      unsubHistory();
      unsubSaved();
    };
  }, [currentUser?.uid]);

  const refreshSavedGames = () => {
    if (currentUser) return; // Handled by Firestore listener
    try {
      const farkleRaw = localStorage.getItem('scorekeeper_saved_farkle');
      const yahtzeeRaw = localStorage.getItem('scorekeeper_saved_yahtzee');
      const dominoesRaw = localStorage.getItem('scorekeeper_saved_dominoes');

      setSavedGames({
        farkle: farkleRaw ? JSON.parse(farkleRaw) : null,
        yahtzee: yahtzeeRaw ? JSON.parse(yahtzeeRaw) : null,
        dominoes: dominoesRaw ? JSON.parse(dominoesRaw) : null,
      });
    } catch (e) {
      console.error('Error parsing saved games:', e);
    }
  };

  useEffect(() => {
    if (!activeGame) {
      refreshSavedGames();
    }
  }, [activeGame]);

  const discardSavedGame = (gameType: GameType) => {
    localStorage.removeItem(`scorekeeper_saved_${gameType}`);
    if (currentUser) {
      deleteSavedGameFromFirestore(currentUser.uid, gameType);
    }
    refreshSavedGames();
  };

  const startNewMatch = (gameType: GameType) => {
    localStorage.removeItem(`scorekeeper_saved_${gameType}`);
    if (currentUser) {
      deleteSavedGameFromFirestore(currentUser.uid, gameType);
    }
    refreshSavedGames();
    setActiveGame(gameType);
  };

  const resumeMatch = (gameType: GameType) => {
    setActiveGame(gameType);
  };

  // Sync players to localStorage
  useEffect(() => {
    localStorage.setItem('scorekeeper_players', JSON.stringify(players));
  }, [players]);

  // Sync history to localStorage
  useEffect(() => {
    localStorage.setItem('scorekeeper_history', JSON.stringify(gameHistory));
  }, [gameHistory]);

  const handleAddPlayer = (name: string, color: string, avatar?: string) => {
    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
      color,
      avatar,
    };
    setPlayers(prev => [...prev, newPlayer]);
    if (currentUser) {
      savePlayerToFirestore(currentUser.uid, newPlayer);
    }
    return newPlayer;
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    if (currentUser) {
      deletePlayerFromFirestore(currentUser.uid, id);
    }
  };

  const handleUpdatePlayer = (id: string, name: string, color: string, avatar?: string) => {
    const updated: Player = { id, name, color, avatar };
    setPlayers(prev =>
      prev.map(p => (p.id === id ? updated : p))
    );
    if (currentUser) {
      savePlayerToFirestore(currentUser.uid, updated);
    }
  };

  const handleGameFinished = (winnerName: string, scores: Record<string, number>) => {
    if (!activeGame) return;

    // Save game to history
    const newEntry: GameHistoryEntry = {
      id: Date.now().toString(),
      gameType: activeGame,
      players: players.filter(p => scores[p.id] !== undefined),
      winner: winnerName,
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      scores,
    };

    setGameHistory(prev => [newEntry, ...prev]);
    if (currentUser) {
      saveGameHistoryToFirestore(currentUser.uid, newEntry);
    }

    // Post top scores to global Hall of Fame
    Object.entries(scores).forEach(([playerId, score]) => {
      const pObj = players.find(p => p.id === playerId);
      if (pObj && score > 0) {
        saveHighScoreToHallOfFame({
          id: `fame-${newEntry.id}-${playerId}`,
          playerName: pObj.name,
          playerAvatar: pObj.avatar || '🎲',
          playerColor: pObj.color || 'bg-emerald-500',
          score: score,
          gameType: activeGame,
          date: newEntry.date,
          isWinner: winnerName === pObj.name,
        });
      }
    });

    setWinnerCelebration({
      winnerName,
      gameType: activeGame,
      scores,
    });
    playWin();
  };

  const clearHistory = () => {
    setShowClearHistoryConfirm(true);
  };

  const confirmClearHistory = () => {
    if (currentUser && gameHistory.length > 0) {
      clearGameHistoryInFirestore(currentUser.uid, gameHistory.map(h => h.id));
    }
    setGameHistory([]);
    setShowClearHistoryConfirm(false);
  };

  const closeCelebration = () => {
    setWinnerCelebration(null);
    setActiveGame(null); // Return to lobby
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden flex flex-col justify-between text-slate-800 dark:text-slate-100 pb-12 font-sans selection:bg-amber-500/20 transition-colors duration-200">
      {/* HEADER BAR */}
      <header className="bg-slate-900 border-b border-slate-800 py-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => activeGame && setShowQuitConfirm(true)}>
            <div className="flex items-center">
              <BankAndScoreHorizontalLogo size="md" />
            </div>
            <div className="hidden md:block pl-2 border-l border-slate-700/80">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                Farkle • Yahtzee • Dominoes
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end">
            {/* Firebase Auth Controls */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-full py-1 px-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-5 h-5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="hidden sm:inline text-xs font-bold text-slate-200 max-w-[100px] truncate">
                  {currentUser.displayName || currentUser.email || 'Cloud Sync'}
                </span>
                <span className="flex h-2 w-2 relative" title="Realtime Firestore Connected">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <button
                  onClick={logoutFirebase}
                  className="ml-1 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-full transition-all cursor-pointer shadow-sm border border-emerald-500/50"
                title="Sign in with Google, Email, or Guest Sync to sync scores across devices"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cloud Sync / Login</span>
              </button>
            )}

            <button
              onClick={toggleMute}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${
                isMuted ? 'bg-slate-800 text-slate-400' : 'bg-slate-800 text-slate-200'
              } hover:bg-slate-700 font-bold text-xs rounded-full transition-all cursor-pointer border border-slate-700/80 shadow-sm`}
              title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
              aria-label="Toggle Sound Effects"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline text-slate-400">Sound</span>
                  <span className="px-1.5 py-0.5 text-[10px] tracking-wide uppercase font-extrabold rounded-md bg-slate-700/80 text-slate-400 border border-slate-600/50">
                    OFF
                  </span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-slate-200">Sound</span>
                  <span className="px-1.5 py-0.5 text-[10px] tracking-wide uppercase font-extrabold rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ON
                  </span>
                </>
              )}
            </button>

            <button
              onClick={toggleTvMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${
                isTvMode ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-200 border-slate-700/80'
              } hover:bg-slate-700 font-bold text-xs rounded-full transition-all cursor-pointer border shadow-sm`}
              title="Toggle Android TV D-Pad Navigation Mode"
              aria-label="Toggle Android TV Mode"
            >
              <Tv className={`w-3.5 h-3.5 ${isTvMode ? 'text-white' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">TV Mode</span>
            </button>

            <button
              onClick={() => setShowThemeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-full transition-all cursor-pointer border border-slate-700/80 shadow-sm"
              title="Choose Color Palette & Theme"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Theme</span>
            </button>

            <button
              onClick={() => setIsOnlineModalOpen(true)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 ${
                activeRoom ? 'bg-teal-600 text-white border-teal-400 shadow-md' : 'bg-slate-800 text-slate-200 border-slate-700/80'
              } hover:bg-teal-600 hover:text-white font-black text-xs rounded-full transition-all cursor-pointer border shadow-sm`}
              title="Online Live Multiplayer Sync Across Devices"
            >
              <Wifi className={`w-3.5 h-3.5 ${activeRoom ? 'text-emerald-300 animate-pulse' : 'text-teal-400'}`} />
              <span className="hidden sm:inline">{activeRoom ? `Online (${activeRoom.code})` : 'Online Play'}</span>
              {activeRoom && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-full transition-all cursor-pointer border border-slate-700/80 shadow-sm"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${
                isFullscreen ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' : 'bg-slate-800 text-slate-200 border-slate-700/80'
              } hover:bg-indigo-600 hover:text-white font-bold text-xs rounded-full transition-all cursor-pointer border shadow-sm`}
              title={isFullscreen ? 'Exit Full Screen Mode' : 'Enter Full Screen Mode'}
              aria-label="Toggle Full Screen"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>

            {activeGame === 'farkle' && (
              <button
                onClick={() => setShowFarkleGuide(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm rounded-full transition-all cursor-pointer border border-white/30"
              >
                <HelpCircle className="w-4 h-4" />
                Scoring Guide
              </button>
            )}

            {activeGame && (
              <button
                onClick={() => setShowQuitConfirm(true)}
                className="px-5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-orange-905 font-black text-xs sm:text-sm rounded-full transition-all cursor-pointer shadow-md"
              >
                Quit Game
              </button>
            )}
          </div>
        </div>
      </header>

      {activeRoom && (
        <OnlineSyncBar
          room={activeRoom}
          onOpenModal={() => setIsOnlineModalOpen(true)}
          onLeaveRoom={handleLeaveRoom}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* LOBBY / GAMES SELECTOR SHEET */}
        {!activeGame && (
          <div className="space-y-8">
            {/* Top Layout Grid: Game launch cards & Player management side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Launcher Cards column */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-[32px] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border-2 border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center sm:text-left z-10">
                    <span className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                      Official Scorekeeper
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                      Bank & Score!
                    </h2>
                    <p className="text-slate-300 font-medium text-xs sm:text-sm max-w-md leading-relaxed">
                      Instant score banking, automatic tallying, interactive scoring sheets, and match history tracking.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center justify-center p-2 bg-slate-950/40 rounded-3xl border border-slate-800/80 shadow-inner">
                    <BankAndScoreLogo size="lg" className="sm:hidden" />
                    <BankAndScoreLogo size="xl" className="hidden sm:block" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    Select Your Game
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 font-medium text-xs sm:text-sm mt-0.5">
                    Ready to play? Choose an interactive scoring sheet below or resume a saved match.
                  </p>
                </div>

                {/* SAVED GAMES IN PROGRESS BANNER */}
                {(savedGames.farkle || savedGames.yahtzee || savedGames.dominoes) && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-teal-900 to-teal-950 text-white p-6 rounded-[32px] shadow-md border-2 border-teal-800/60 relative overflow-hidden space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-teal-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                          <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                          Saved Games in Progress
                        </h3>
                      </div>
                      <p className="text-xs text-teal-200/80 font-medium">
                        Resume your active game sessions anytime
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {savedGames.farkle && (
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5 text-orange-300 font-black uppercase text-xs">
                              <Flame className="w-4 h-4 fill-current text-orange-400" />
                              Farkle
                            </div>
                            <span className="text-[10px] text-teal-200/70 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {savedGames.farkle.updatedAt ? new Date(savedGames.farkle.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Saved'}
                            </span>
                          </div>
                          <div className="text-xs text-teal-100/90 font-medium">
                            Round {(savedGames.farkle.gameState as any).currentRound || 1} • Target {(savedGames.farkle.gameState as any).targetScore?.toLocaleString() || '10,000'} pts
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => resumeMatch('farkle')}
                              className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-teal-950 font-black text-xs rounded-xl uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Resume
                            </button>
                            <button
                              onClick={() => discardSavedGame('farkle')}
                              className="p-2 text-red-300 hover:text-red-200 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                              title="Discard saved match"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {savedGames.yahtzee && (
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5 text-teal-300 font-black uppercase text-xs">
                              <Sparkles className="w-4 h-4 fill-current text-teal-300" />
                              Yahtzee
                            </div>
                            <span className="text-[10px] text-teal-200/70 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {savedGames.yahtzee.updatedAt ? new Date(savedGames.yahtzee.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Saved'}
                            </span>
                          </div>
                          <div className="text-xs text-teal-100/90 font-medium">
                            {(savedGames.yahtzee.gameState as any).players?.length || 0} Players active
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => resumeMatch('yahtzee')}
                              className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-teal-950 font-black text-xs rounded-xl uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Resume
                            </button>
                            <button
                              onClick={() => discardSavedGame('yahtzee')}
                              className="p-2 text-red-300 hover:text-red-200 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                              title="Discard saved match"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {savedGames.dominoes && (
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5 text-pink-300 font-black uppercase text-xs">
                              <ScrollText className="w-4 h-4 text-pink-300" />
                              Dominoes
                            </div>
                            <span className="text-[10px] text-teal-200/70 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {savedGames.dominoes.updatedAt ? new Date(savedGames.dominoes.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Saved'}
                            </span>
                          </div>
                          <div className="text-xs text-teal-100/90 font-medium">
                            Target {(savedGames.dominoes.gameState as any).targetScore || 200} pts • {(savedGames.dominoes.gameState as any).players?.length || 0} Players
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => resumeMatch('dominoes')}
                              className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-teal-950 font-black text-xs rounded-xl uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Resume
                            </button>
                            <button
                              onClick={() => discardSavedGame('dominoes')}
                              className="p-2 text-red-300 hover:text-red-200 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                              title="Discard saved match"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STAGGERED GAME LAUNCHER CARDS GRID */}
                <motion.div
                  variants={launcherContainerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-3 gap-6"
                >
                  {/* FARKLE CARD */}
                  <motion.div variants={launcherCardVariants}>
                    <div className="bg-white dark:bg-slate-900 border-2 border-orange-100 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500/50 p-6 rounded-[32px] shadow-sm text-left flex flex-col justify-between min-h-[300px] group transition-all hover:shadow-lg hover:ring-4 hover:ring-orange-400/20 relative overflow-hidden">
                      {savedGames.farkle && (
                        <span className="absolute top-4 right-4 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 z-10">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Saved Match
                        </span>
                      )}
                      <div>
                        <div className="h-20 flex items-center justify-start mb-2 group-hover:scale-105 transition-transform origin-left">
                          <FarkleLogo size="md" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Includes dynamic roll builders, automated combination scoring, and quick adders. Plays to 10,000 points.
                        </p>
                      </div>

                      {/* ANIMATED PROGRESS BAR */}
                      {(() => {
                        const prog = getFarkleProgress(savedGames.farkle);
                        if (prog) {
                          return (
                            <div className="my-3 p-3 bg-orange-50/80 dark:bg-slate-800/80 rounded-2xl border border-orange-200/60 dark:border-slate-700/80 space-y-1.5 shadow-xs">
                              <div className="flex items-center justify-between text-[11px] font-black text-orange-950 dark:text-orange-200">
                                <span className="truncate max-w-[130px] flex items-center gap-1" title={prog.leaderName}>
                                  <span>🏆</span>
                                  <span className="truncate">{prog.leaderName}</span>
                                </span>
                                <span className="font-mono text-orange-600 dark:text-orange-400 font-extrabold">
                                  {prog.maxScore.toLocaleString()} / {prog.target.toLocaleString()} pts
                                </span>
                              </div>
                              <div className="w-full bg-orange-200/60 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden p-0.5">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${prog.percent}%` }}
                                  transition={{ duration: 0.9, ease: 'easeOut' }}
                                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full shadow-xs"
                                />
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                                <span>Saved Game Progress</span>
                                <span className="font-mono text-orange-600 dark:text-orange-400 font-extrabold">{prog.percent}%</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="my-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                            <span>Target Goal</span>
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-400">10,000 pts</span>
                          </div>
                        );
                      })()}

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        {savedGames.farkle ? (
                          <>
                            <button
                              onClick={() => resumeMatch('farkle')}
                              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Resume
                            </button>
                            <button
                              onClick={() => startNewMatch('farkle')}
                              className="py-2.5 px-3 text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-800 text-[11px] font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              New
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startNewMatch('farkle')}
                            className="w-full py-2.5 text-xs font-black text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 flex items-center justify-between uppercase tracking-wider cursor-pointer group/btn"
                          >
                            <span>Start Match</span>
                            <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* YAHTZEE CARD */}
                  <motion.div variants={launcherCardVariants}>
                    <div className="bg-white dark:bg-slate-900 border-2 border-teal-100 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-500/50 p-6 rounded-[32px] shadow-sm text-left flex flex-col justify-between min-h-[300px] group transition-all hover:shadow-lg hover:ring-4 hover:ring-teal-400/20 relative overflow-hidden">
                      {savedGames.yahtzee && (
                        <span className="absolute top-4 right-4 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 z-10">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Saved Match
                        </span>
                      )}
                      <div>
                        <div className="h-20 flex items-center justify-start mb-2 group-hover:scale-105 transition-transform origin-left">
                          <YahtzeeLogo size="md" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Interactive 13-category scorecard sheet with subtotal markers, bonus triggers, and extra-Yahtzee credits.
                        </p>
                      </div>

                      {/* ANIMATED PROGRESS BAR */}
                      {(() => {
                        const prog = getYahtzeeProgress(savedGames.yahtzee);
                        if (prog) {
                          return (
                            <div className="my-3 p-3 bg-teal-50/80 dark:bg-slate-800/80 rounded-2xl border border-teal-200/60 dark:border-slate-700/80 space-y-1.5 shadow-xs">
                              <div className="flex items-center justify-between text-[11px] font-black text-teal-950 dark:text-teal-200">
                                <span className="truncate max-w-[130px] flex items-center gap-1" title={prog.leaderName}>
                                  <span>🏆</span>
                                  <span className="truncate">{prog.leaderName}</span>
                                </span>
                                <span className="font-mono text-teal-600 dark:text-teal-400 font-extrabold">
                                  {prog.maxScore} pts ({prog.filledCategories}/13)
                                </span>
                              </div>
                              <div className="w-full bg-teal-200/60 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden p-0.5">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${prog.percent}%` }}
                                  transition={{ duration: 0.9, ease: 'easeOut' }}
                                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full shadow-xs"
                                />
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                                <span>Saved Game Progress</span>
                                <span className="font-mono text-teal-600 dark:text-teal-400 font-extrabold">{prog.percent}%</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="my-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                            <span>Target Goal</span>
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-400">13 Categories</span>
                          </div>
                        );
                      })()}

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        {savedGames.yahtzee ? (
                          <>
                            <button
                              onClick={() => resumeMatch('yahtzee')}
                              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Resume
                            </button>
                            <button
                              onClick={() => startNewMatch('yahtzee')}
                              className="py-2.5 px-3 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 text-[11px] font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              New
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startNewMatch('yahtzee')}
                            className="w-full py-2.5 text-xs font-black text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 flex items-center justify-between uppercase tracking-wider cursor-pointer group/btn"
                          >
                            <span>Start Match</span>
                            <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* DOMINOES CARD */}
                  <motion.div variants={launcherCardVariants}>
                    <div className="bg-white dark:bg-slate-900 border-2 border-pink-100 dark:border-slate-800 hover:border-pink-300 dark:hover:border-pink-500/50 p-6 rounded-[32px] shadow-sm text-left flex flex-col justify-between min-h-[300px] group transition-all hover:shadow-lg hover:ring-4 hover:ring-pink-400/20 relative overflow-hidden">
                      {savedGames.dominoes && (
                        <span className="absolute top-4 right-4 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 z-10">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Saved Match
                        </span>
                      )}
                      <div>
                        <div className="h-20 flex items-center justify-start mb-2 group-hover:scale-105 transition-transform origin-left">
                          <DominoesLogo size="md" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Simple, fast log lists with quick adder pads for increments of 5. Tracks targeted end-game standings easily.
                        </p>
                      </div>

                      {/* ANIMATED PROGRESS BAR */}
                      {(() => {
                        const prog = getDominoesProgress(savedGames.dominoes);
                        if (prog) {
                          return (
                            <div className="my-3 p-3 bg-pink-50/80 dark:bg-slate-800/80 rounded-2xl border border-pink-200/60 dark:border-slate-700/80 space-y-1.5 shadow-xs">
                              <div className="flex items-center justify-between text-[11px] font-black text-pink-950 dark:text-pink-200">
                                <span className="truncate max-w-[130px] flex items-center gap-1" title={prog.leaderName}>
                                  <span>🏆</span>
                                  <span className="truncate">{prog.leaderName}</span>
                                </span>
                                <span className="font-mono text-pink-600 dark:text-pink-400 font-extrabold">
                                  {prog.maxScore.toLocaleString()} / {prog.target.toLocaleString()} pts
                                </span>
                              </div>
                              <div className="w-full bg-pink-200/60 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden p-0.5">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${prog.percent}%` }}
                                  transition={{ duration: 0.9, ease: 'easeOut' }}
                                  className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full shadow-xs"
                                />
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                                <span>Saved Game Progress</span>
                                <span className="font-mono text-pink-600 dark:text-pink-400 font-extrabold">{prog.percent}%</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="my-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                            <span>Target Goal</span>
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-400">200 pts</span>
                          </div>
                        );
                      })()}

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        {savedGames.dominoes ? (
                          <>
                            <button
                              onClick={() => resumeMatch('dominoes')}
                              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Resume
                            </button>
                            <button
                              onClick={() => startNewMatch('dominoes')}
                              className="py-2.5 px-3 text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-slate-800 text-[11px] font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              New
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startNewMatch('dominoes')}
                            className="w-full py-2.5 text-xs font-black text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 flex items-center justify-between uppercase tracking-wider cursor-pointer group/btn"
                          >
                            <span>Start Match</span>
                            <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>


                {/* LOBBY TABS & CONTENT (HALL OF FAME / PLAYER STATISTICS / GAME HISTORY) */}
                <div className="space-y-4">
                  {/* Tab Navigation Controls */}
                  <div className="flex flex-wrap items-center justify-between bg-orange-100/50 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-orange-200/80 dark:border-slate-800 gap-2">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                      <button
                        onClick={() => setLobbyTab('hallOfFame')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          lobbyTab === 'hallOfFame'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'text-teal-900/80 dark:text-slate-300 hover:text-teal-950 dark:hover:text-white hover:bg-orange-200/50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Crown className="w-4 h-4 text-amber-950 dark:text-amber-400 fill-current" />
                        Hall of Fame 🏆
                      </button>
                      <button
                        onClick={() => setLobbyTab('stats')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          lobbyTab === 'stats'
                            ? 'bg-teal-900 dark:bg-emerald-600 text-white shadow-sm'
                            : 'text-teal-900/80 dark:text-slate-300 hover:text-teal-950 dark:hover:text-white hover:bg-orange-200/50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4 text-orange-400" />
                        Player Statistics
                      </button>
                      <button
                        onClick={() => setLobbyTab('history')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          lobbyTab === 'history'
                            ? 'bg-teal-900 dark:bg-emerald-600 text-white shadow-sm'
                            : 'text-teal-900/80 dark:text-slate-300 hover:text-teal-950 dark:hover:text-white hover:bg-orange-200/50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <History className="w-4 h-4 text-orange-400" />
                        Game History ({gameHistory.length})
                      </button>
                    </div>

                    {lobbyTab === 'history' && gameHistory.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="hidden sm:block text-xs font-black text-red-600 dark:text-red-400 hover:text-red-700 cursor-pointer uppercase tracking-wider px-3"
                      >
                        Clear History
                      </button>
                    )}
                  </div>

                  {/* ACTIVE LOBBY TAB CONTENT */}
                  {lobbyTab === 'hallOfFame' && (
                    <HallOfFame gameHistory={gameHistory} globalRecords={globalHallOfFame} />
                  )}

                  {lobbyTab === 'stats' && (
                    <PlayerStatistics players={players} gameHistory={gameHistory} />
                  )}

                  {lobbyTab === 'history' && (
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] border-2 border-orange-100 dark:border-slate-800 p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-black text-teal-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                          <History className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          Game Logs & History
                        </h3>
                        {gameHistory.length > 0 && (
                          <button
                            onClick={clearHistory}
                            className="sm:hidden text-xs font-black text-red-600 dark:text-red-400 hover:text-red-700 cursor-pointer uppercase tracking-wider"
                          >
                            Clear History
                          </button>
                        )}
                      </div>

                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {gameHistory.map(entry => (
                          <div
                            key={entry.id}
                            className="p-4 bg-orange-50/40 dark:bg-slate-800/60 rounded-2xl border border-orange-100/60 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-sm"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-gray-700 dark:text-slate-200 uppercase tracking-tight">
                                  {entry.gameType === 'farkle' ? 'Farkle' : entry.gameType}
                                </span>
                                <span className="text-[10px] bg-orange-100 dark:bg-slate-700 font-bold px-2.5 py-0.5 rounded-full text-orange-700 dark:text-orange-300">
                                  {entry.date}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Participants:{' '}
                                <strong className="font-bold text-slate-600 dark:text-slate-300">
                                  {entry.players.map(p => p.name).join(', ')}
                                </strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-orange-100 dark:border-slate-700">
                              <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
                              <div className="text-xs">
                                Winner: <strong className="font-black text-teal-700 dark:text-teal-400 uppercase">{entry.winner}</strong>
                              </div>
                            </div>
                          </div>
                        ))}

                        {gameHistory.length === 0 && (
                          <div className="text-center py-8 text-teal-800/40 text-sm font-semibold">
                            No games logged yet. Complete a scoreboard to record history.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Player Management Sidebar Column */}
              <div className="lg:col-span-4">
                <PlayerManager
                  players={players}
                  onAddPlayer={handleAddPlayer}
                  onRemovePlayer={handleRemovePlayer}
                  onUpdatePlayer={handleUpdatePlayer}
                />
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE SCORER CONTAINER */}
        {activeGame && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-12">
              <AnimatePresence mode="wait">
                {activeGame === 'farkle' && (
                  <motion.div
                    key="farkle"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                  >
                    <FarkleScorer
                      players={players}
                      onGameFinished={handleGameFinished}
                      onAddPlayer={handleAddPlayer}
                      externalGameState={roomExternalGameState}
                      externalTurnScore={roomExternalTurnScore}
                      onSyncGameRoom={handleSyncGameRoom}
                      isOnlineSynced={!!activeRoom}
                    />
                  </motion.div>
                )}

                {activeGame === 'yahtzee' && (
                  <motion.div
                    key="yahtzee"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                  >
                    <YahtzeeScorer
                      players={players}
                      onGameFinished={handleGameFinished}
                      onAddPlayer={handleAddPlayer}
                      externalGameState={roomExternalGameState}
                      onSyncGameRoom={handleSyncGameRoom}
                      isOnlineSynced={!!activeRoom}
                    />
                  </motion.div>
                )}

                {activeGame === 'dominoes' && (
                  <motion.div
                    key="dominoes"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                  >
                    <DominoesScorer
                      players={players}
                      onGameFinished={handleGameFinished}
                      onAddPlayer={handleAddPlayer}
                      externalGameState={roomExternalGameState}
                      onSyncGameRoom={handleSyncGameRoom}
                      isOnlineSynced={!!activeRoom}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* FARKLE RULES MODAL DIALOG */}
      <AnimatePresence>
        {showFarkleGuide && (
          <div
            onClick={() => setShowFarkleGuide(false)}
            className="fixed inset-0 bg-teal-950/70 flex items-start sm:items-center justify-center p-4 z-50 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-2xl w-full my-8 sm:my-auto"
            >
              <FarkleGuide onClose={() => setShowFarkleGuide(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WINNER CELEBRATION MODAL OVERLAY */}
      <AnimatePresence>
        {winnerCelebration && (
          <div className="fixed inset-0 bg-teal-950/70 flex items-center justify-center p-4 z-55 backdrop-blur-md overflow-y-auto">
            <ConfettiCelebration />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] shadow-2xl border-2 border-orange-100 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full text-center relative overflow-hidden max-h-[90vh] max-h-[90dvh] overflow-y-auto my-auto"
            >
              {/* Confetti-like ambient gradient */}
              <div className="absolute inset-0 bg-radial-gradient(ellipse_at_center,rgba(249,115,22,0.1),transparent) pointer-events-none" />

              <motion.div
                initial={{ scale: 0, rotate: -18 }}
                animate={{
                  scale: [0, 1.3, 0.9, 1.1, 1],
                  rotate: [0, -12, 12, -8, 8, -3, 3, 0],
                }}
                transition={{
                  duration: 0.85,
                  ease: "easeOut",
                }}
                className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-800/70 rounded-3xl flex items-center justify-center text-orange-500 dark:text-orange-400 mb-6 relative shadow-lg shadow-orange-500/15 border border-orange-200/60 dark:border-slate-700"
              >
                <motion.div
                  animate={{
                    rotate: [0, -5, 5, -5, 5, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    repeatDelay: 1.5,
                    duration: 1.8,
                    ease: "easeInOut",
                    delay: 0.9,
                  }}
                >
                  <Trophy className="w-10 h-10 fill-amber-400/30 text-orange-500 dark:text-orange-400 drop-shadow-sm" />
                </motion.div>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full animate-ping" />
                <Sparkles className="w-4 h-4 text-amber-500 absolute -bottom-1 -left-1 animate-pulse" />
              </motion.div>

              <h2 className="text-3xl font-black text-teal-900 dark:text-slate-100 tracking-tight uppercase">
                Victory!
              </h2>
              <p className="text-teal-700/80 dark:text-teal-400 text-sm mt-1.5 font-bold uppercase tracking-wider">
                We have a champion!
              </p>

              <div className="my-6 p-5 bg-orange-50/70 dark:bg-slate-800/80 border border-orange-100 dark:border-slate-700 rounded-3xl">
                <div className="text-2xl font-black text-orange-600 dark:text-orange-400 uppercase tracking-tight">
                  {winnerCelebration.winnerName}
                </div>
                <div className="text-xs font-black text-teal-800 dark:text-teal-300 mt-1 uppercase tracking-widest">
                  Won {winnerCelebration.gameType === 'farkle' ? 'Farkle' : winnerCelebration.gameType}!
                </div>
              </div>

              {/* Score results summary */}
              <div className="space-y-2 mb-8 text-left bg-orange-50/30 dark:bg-slate-800/40 p-4 rounded-3xl border border-orange-100/60 dark:border-slate-700/60">
                <h4 className="text-[10px] font-black text-teal-800 dark:text-teal-400 uppercase tracking-widest border-b border-orange-100 dark:border-slate-700 pb-1.5 mb-2">
                  Final Scores Standings
                </h4>
                {Object.entries(winnerCelebration.scores)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([pId, score]) => {
                    const pl = players.find(p => p.id === pId);
                    if (!pl) return null;
                    return (
                      <div key={pId} className="flex justify-between items-center text-xs text-gray-700 dark:text-slate-300 font-semibold">
                        <span>{pl.name}</span>
                        <span className="font-mono font-bold text-teal-900 dark:text-teal-300">{score.toLocaleString()} pts</span>
                      </div>
                    );
                  })}
              </div>

              <button
                onClick={closeCelebration}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-full text-sm transition-colors shadow-md cursor-pointer uppercase tracking-wider"
              >
                Return to Game Lobby
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUIT CONFIRMATION MODAL OVERLAY */}
      <AnimatePresence>
        {showQuitConfirm && (
          <div className="fixed inset-0 bg-teal-950/70 flex items-center justify-center p-4 z-55 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] shadow-2xl border-2 border-orange-100 dark:border-slate-800 p-6 sm:p-8 max-w-sm w-full text-center relative overflow-hidden max-h-[90vh] max-h-[90dvh] overflow-y-auto my-auto"
            >
              <div className="mx-auto w-16 h-16 bg-teal-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-teal-700 dark:text-teal-400 mb-6">
                <BookmarkCheck className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-teal-900 dark:text-slate-100 tracking-tight uppercase">
                Exit Game Session?
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 font-semibold leading-relaxed">
                Your game progress is saved automatically! You can return to the lobby and resume this game later anytime.
              </p>

              <div className="space-y-2.5 mt-6">
                <button
                  onClick={() => {
                    setActiveGame(null);
                    setShowQuitConfirm(false);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save & Exit to Lobby
                </button>
                
                {activeGame && (
                  <button
                    onClick={() => {
                      discardSavedGame(activeGame);
                      setActiveGame(null);
                      setShowQuitConfirm(false);
                    }}
                    className="w-full py-2.5 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer border border-red-200 dark:border-red-900/60 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Discard Match & Exit
                  </button>
                )}

                <button
                  onClick={() => setShowQuitConfirm(false)}
                  className="w-full py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel, Keep Playing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLEAR HISTORY CONFIRMATION MODAL OVERLAY */}
      <AnimatePresence>
        {showClearHistoryConfirm && (
          <div className="fixed inset-0 bg-teal-950/70 flex items-center justify-center p-4 z-55 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] shadow-2xl border-2 border-orange-100 dark:border-slate-800 p-6 sm:p-8 max-w-sm w-full text-center relative overflow-hidden max-h-[90vh] max-h-[90dvh] overflow-y-auto my-auto"
            >
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mb-6">
                <X className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-teal-900 dark:text-slate-100 tracking-tight uppercase">
                Clear History?
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 font-semibold leading-relaxed">
                Are you sure you want to permanently clear your logged game history? This action cannot be undone.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <button
                  onClick={() => setShowClearHistoryConfirm(false)}
                  className="py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearHistory}
                  className="py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-full text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                >
                  Yes, Clear
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* THEME & COLOR PALETTE SELECTOR MODAL */}
      <ThemeSelectorModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentColorTheme={colorTheme}
        onSelectColorTheme={(themeId) => setColorTheme(themeId)}
        isDarkMode={theme === 'dark'}
        onToggleDarkMode={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
      />

      {/* ANDROID TV REMOTE HUD BAR */}
      <TvRemoteBar />

      {/* ONLINE MULTIPLAYER ROOM MODAL */}
      <OnlineRoomModal
        isOpen={isOnlineModalOpen}
        onClose={() => setIsOnlineModalOpen(false)}
        currentGameType={activeGame || 'farkle'}
        currentGameState={roomExternalGameState}
        currentTurnScore={roomExternalTurnScore}
        savedPlayers={players}
        activeRoom={activeRoom}
        setActiveRoom={setActiveRoom}
        onRoomGameStateSync={(gt, gs, ts) => {
          setActiveGame(gt);
          setRoomExternalGameState(gs);
          setRoomExternalTurnScore(ts);
        }}
        deviceId={deviceId}
      />

      {/* CLOUD SYNC & AUTH MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
