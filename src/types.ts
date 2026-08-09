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
