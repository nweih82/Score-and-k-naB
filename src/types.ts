export type GameType = 'farkle' | 'yahtzee' | 'dominoes';

export interface Player {
  id: string;
  name: string;
  color: string; // Tailwind bg color class, e.g., 'bg-rose-500'
  avatar?: string; // Emoji avatar icon, e.g. '🎲'
}

export interface GameHistoryEntry {
  id: string;
  gameType: GameType;
  players: Player[];
  winner: string; // Player name
  date: string;
  scores: Record<string, number>; // player.id -> finalScore
}

export interface HighScoreRecord {
  id: string;
  playerName: string;
  playerAvatar?: string;
  playerColor?: string;
  score: number;
  gameType: GameType;
  date: string;
  isWinner?: boolean;
  createdAt?: string;
}

export interface ActionLogItem {
  id: string;
  timestamp: string;
  playerId: string;
  playerName: string;
  playerColor?: string;
  actionType: 'bank' | 'farkle' | 'score_category' | 'edit_score' | 'yahtzee_bonus' | 'custom_add';
  description: string;
  points?: number;
  source: 'manual' | 'voice';
}

// FARKLE HOUSE RULES & SETTINGS
export interface FarkleHouseRules {
  targetScore: number; // e.g. 5000, 10000, 15000
  openingMinimum: number; // 0, 500, 1000 pts to open on the board
  threeFarklesPenalty: number; // 0, 500, 1000 pts penalty for 3 consecutive farkles
  allowPiggybacking: boolean; // inherit remaining unused dice from previous player's roll
  threePairsScore: number; // 1500 (or 0 to disable)
  fullHouseScore: number; // 1500 (or 0 to disable)
  straightScore: number; // 1500, 2000, 2500
  fourOfAKindScore: number; // 1000
  fiveOfAKindScore: number; // 2000
  sixOfAKindScore: number; // 3000
  hotDiceMandatoryRoll: boolean; // must roll all 6 dice again if scoring with all 6
}

// YAHTZEE HOUSE RULES & SETTINGS
export interface YahtzeeHouseRules {
  upperBonusThreshold: number; // 63 default (or 60, 65)
  upperBonusAmount: number; // 35 default (or 50, 75)
  extraYahtzeeBonus: number; // 100 default (or 50, 150, 200)
  fullHouseScore: number; // 25 default (or 30)
  smallStraightScore: number; // 30 default (or 35)
  largeStraightScore: number; // 40 default (or 45, 50)
  yahtzeeScore: number; // 50 default
  jokerRule: 'standard' | 'free_choice' | 'strict_bonus_only';
}

// HOUSE RULES PRESET
export interface HouseRulesPreset {
  id: string;
  name: string;
  description: string;
  isBuiltIn?: boolean;
  createdAt?: string;
  farkle: FarkleHouseRules;
  yahtzee: YahtzeeHouseRules;
}

// FARKLE TYPES
export interface FarkleRound {
  scores: Record<string, number>; // player.id -> score achieved in this round
  farkles: Record<string, boolean>; // player.id -> did they farkle this round?
}

export interface FarkleState {
  players: Player[];
  scores: Record<string, number>; // player.id -> total score
  rounds: FarkleRound[];
  currentRound: number;
  targetScore: number;
  winnerId: string | null;
  activePlayerId: string;
  // Current active turn scratchpad
  turnHistory: { rollScore: number; diceKept: number[] }[];
  finalRoundState?: {
    leaderId: string;
    highScoreToBeat: number;
    playersPendingTurn: string[];
  } | null;
  recentActions?: ActionLogItem[];
  rules?: FarkleHouseRules;
  consecutiveFarkles?: Record<string, number>; // player.id -> streak of consecutive farkles
}

// YAHTZEE TYPES
export type YahtzeeCategory =
  | 'aces'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'threeOfAKind'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'smallStraight'
  | 'largeStraight'
  | 'yahtzee'
  | 'chance'
  | 'yahtzeeBonus';

export interface YahtzeePlayerScore {
  aces: number | null;
  twos: number | null;
  threes: number | null;
  fours: number | null;
  fives: number | null;
  sixes: number | null;
  threeOfAKind: number | null;
  fourOfAKind: number | null;
  fullHouse: number | null;
  smallStraight: number | null;
  largeStraight: number | null;
  yahtzee: number | null;
  chance: number | null;
  yahtzeeBonusCount: number; // For multiple Yahtzees (+100 each)
}

export interface YahtzeeState {
  players: Player[];
  scores: Record<string, YahtzeePlayerScore>; // player.id -> score sheet
  activePlayerId: string;
  winnerId: string | null;
  isCompleted: boolean;
  recentActions?: ActionLogItem[];
  rules?: YahtzeeHouseRules;
}

// DOMINOES TYPES
export interface DominoesRound {
  scores: Record<string, number>; // player.id -> score added in this round
}

export interface DominoesState {
  players: Player[];
  scores: Record<string, number>; // player.id -> total score
  rounds: DominoesRound[];
  targetScore: number;
  winnerId: string | null;
  activePlayerId: string;
}

export interface SavedGameData {
  gameType: GameType;
  gameState: FarkleState | YahtzeeState | DominoesState;
  turnScore?: number;
  updatedAt: string;
}

export interface ConnectedPlayer {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  deviceId: string;
  lastSeen: string;
}

export interface GameRoomData {
  code: string;
  gameType: GameType;
  gameState: FarkleState | YahtzeeState | DominoesState;
  turnScore?: number | null;
  hostId: string;
  hostName: string;
  lastActionBy?: string;
  connectedPlayers: ConnectedPlayer[];
  updatedAt: string;
}
