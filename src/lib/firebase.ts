import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Player, GameHistoryEntry, SavedGameData, GameType, GameRoomData, ConnectedPlayer, HighScoreRecord } from '../types';
import { safeClone } from './utils';

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on startup as mandated by Firebase skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable') || error.message.includes('Could not reach'))) {
      console.warn('Firestore notice during initial connection check:', error.message);
    }
  }
}

// Auth Helpers
export async function syncUserProfile(user: User, customName?: string) {
  const userRef = doc(db, 'users', user.uid);
  const displayName = customName || user.displayName || user.email?.split('@')[0] || 'Player';
  await setDoc(
    userRef,
    {
      displayName,
      email: user.email || '',
      photoURL: user.photoURL || '',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function checkRedirectResultOnLoad(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await syncUserProfile(result.user);
      return result.user;
    }
  } catch (error) {
    console.warn('Redirect Auth Error on Load:', error);
  }
  return null;
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await syncUserProfile(result.user);
    }
    return result.user;
  } catch (error: any) {
    console.warn('Google Auth Popup failed/blocked, trying Redirect fallback:', error);
    // If popup is blocked or disallowed in WebViews/APKs, attempt redirect sign in
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/operation-not-supported-in-this-environment' ||
      error?.code === 'auth/disallowed-webview' ||
      error?.message?.includes('popup')
    ) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return null; // Will redirect the browser/webview
      } catch (redirectErr) {
        console.error('Google Redirect Auth Error:', redirectErr);
        throw redirectErr;
      }
    }
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await syncUserProfile(cred.user);
    }
    return cred.user;
  } catch (error) {
    console.error('Email Login Error:', error);
    throw error;
  }
}

export async function registerWithEmail(email: string, pass: string, displayName: string): Promise<User> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName });
      await syncUserProfile(cred.user, displayName);
    }
    return cred.user;
  } catch (error) {
    console.error('Email Register Error:', error);
    throw error;
  }
}

export async function loginAnonymously(): Promise<User> {
  try {
    const cred = await signInAnonymously(auth);
    if (cred.user) {
      await syncUserProfile(cred.user, 'Guest Player');
    }
    return cred.user;
  } catch (error) {
    console.error('Anonymous Auth Error:', error);
    throw error;
  }
}

export async function logoutFirebase() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout Error:', error);
    throw error;
  }
}

// Firestore Realtime Subscriptions & Actions
export function subscribeToPlayers(userId: string, onUpdate: (players: Player[]) => void) {
  const playersRef = collection(db, 'users', userId, 'players');
  return onSnapshot(
    playersRef,
    snapshot => {
      const playerList: Player[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id || doc.id,
          name: data.name,
          color: data.color,
          avatar: data.avatar,
        };
      });
      onUpdate(playerList);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/players`);
    }
  );
}

export async function savePlayerToFirestore(userId: string, player: Player) {
  const path = `users/${userId}/players/${player.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'players', player.id), {
      id: player.id,
      name: player.name,
      color: player.color,
      avatar: player.avatar || null,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePlayerFromFirestore(userId: string, playerId: string) {
  const path = `users/${userId}/players/${playerId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'players', playerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToGameHistory(
  userId: string,
  onUpdate: (history: GameHistoryEntry[]) => void
) {
  const historyRef = collection(db, 'users', userId, 'gameHistory');
  return onSnapshot(
    historyRef,
    snapshot => {
      const historyList: GameHistoryEntry[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id || doc.id,
          gameType: data.gameType,
          players: data.players || [],
          winner: data.winner,
          date: data.date,
          scores: data.scores || {},
        };
      });
      // Sort newest first
      historyList.sort((a, b) => (b.id > a.id ? 1 : -1));
      onUpdate(historyList);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/gameHistory`);
    }
  );
}

export async function saveGameHistoryToFirestore(userId: string, entry: GameHistoryEntry) {
  const path = `users/${userId}/gameHistory/${entry.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'gameHistory', entry.id), {
      id: entry.id,
      gameType: entry.gameType,
      players: entry.players,
      winner: entry.winner,
      date: entry.date,
      scores: entry.scores,
      userId,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function clearGameHistoryInFirestore(userId: string, historyIds: string[]) {
  const path = `users/${userId}/gameHistory`;
  try {
    const batch = writeBatch(db);
    historyIds.forEach(id => {
      batch.delete(doc(db, 'users', userId, 'gameHistory', id));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToSavedGames(
  userId: string,
  onUpdate: (saved: {
    farkle?: SavedGameData | null;
    yahtzee?: SavedGameData | null;
    dominoes?: SavedGameData | null;
  }) => void
) {
  const savedRef = collection(db, 'users', userId, 'savedGames');
  return onSnapshot(
    savedRef,
    snapshot => {
      const result: {
        farkle?: SavedGameData | null;
        yahtzee?: SavedGameData | null;
        dominoes?: SavedGameData | null;
      } = {};

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const gt = docSnap.id as GameType;
        if (gt === 'farkle' || gt === 'yahtzee' || gt === 'dominoes') {
          result[gt] = {
            gameType: data.gameType,
            gameState: data.gameState,
            turnScore: data.turnScore,
            updatedAt: data.updatedAt,
          };
        }
      });

      onUpdate(result);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/savedGames`);
    }
  );
}

export async function saveActiveGameToFirestore(
  userId: string,
  gameType: GameType,
  data: SavedGameData
) {
  const path = `users/${userId}/savedGames/${gameType}`;
  try {
    await setDoc(doc(db, 'users', userId, 'savedGames', gameType), {
      gameType: data.gameType,
      gameState: data.gameState,
      turnScore: data.turnScore ?? null,
      updatedAt: data.updatedAt,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSavedGameFromFirestore(userId: string, gameType: GameType) {
  const path = `users/${userId}/savedGames/${gameType}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'savedGames', gameType));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Helper to generate a complete, valid initial game state for multiplayer rooms
export function createDefaultGameStateForRoom(gameType: GameType, initialPlayers: Player[]) {
  const players = initialPlayers.length > 0 ? initialPlayers : [
    { id: 'p-1', name: 'Player 1', color: 'bg-emerald-500 text-white', avatar: '🍁' }
  ];

  if (gameType === 'farkle') {
    const scores: Record<string, number> = {};
    players.forEach(p => { scores[p.id] = 0; });
    return {
      players,
      scores,
      rounds: [],
      currentRound: 1,
      targetScore: 10000,
      winnerId: null,
      activePlayerId: players[0].id,
      turnHistory: [],
      recentActions: [],
    };
  }

  if (gameType === 'yahtzee') {
    const scores: Record<string, any> = {};
    players.forEach(p => {
      scores[p.id] = {
        aces: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
        threeOfAKind: null, fourOfAKind: null, fullHouse: null, smallStraight: null,
        largeStraight: null, yahtzee: null, chance: null, yahtzeeBonusCount: 0,
      };
    });
    return {
      players,
      scores,
      activePlayerId: players[0].id,
      winnerId: null,
      isCompleted: false,
      recentActions: [],
    };
  }

  if (gameType === 'dominoes') {
    const scores: Record<string, number> = {};
    players.forEach(p => { scores[p.id] = 0; });
    return {
      players,
      scores,
      rounds: [],
      targetScore: 200,
      winnerId: null,
      activePlayerId: players[0].id,
    };
  }

  return null;
}

// LIVE ONLINE ROOM MULTIPLAYER SYNC
export async function createGameRoomInFirestore(
  code: string,
  gameType: GameType,
  gameState: any,
  turnScore: number | null,
  hostId: string,
  hostName: string,
  hostPlayer?: Player
): Promise<GameRoomData> {
  const normalizedCode = code.toUpperCase().trim();
  const path = `rooms/${normalizedCode}`;

  const host: Player = hostPlayer ? {
    ...hostPlayer,
    id: hostPlayer.id || `p-${hostId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`,
  } : {
    id: `p-${hostId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`,
    name: hostName || 'Host',
    avatar: '👑',
    color: 'bg-amber-500 text-white',
  };

  const hostConnected: ConnectedPlayer = {
    id: host.id,
    name: host.name,
    avatar: host.avatar || '👑',
    color: host.color || 'bg-amber-500 text-white',
    deviceId: hostId,
    lastSeen: new Date().toISOString(),
  };

  // Ensure gameState is a full, valid, playable state
  let initialGameState = gameState;
  if (!initialGameState || !Array.isArray(initialGameState.players) || initialGameState.players.length === 0) {
    initialGameState = createDefaultGameStateForRoom(gameType, [host]);
  } else {
    // Make sure host player is part of the player list
    if (!initialGameState.players.some((p: Player) => p.id === host.id)) {
      initialGameState = {
        ...initialGameState,
        players: [host, ...initialGameState.players],
      };
    }
  }

  const roomData: GameRoomData = {
    code: normalizedCode,
    gameType,
    gameState: initialGameState,
    turnScore: turnScore ?? null,
    hostId,
    hostName: hostName || host.name || 'Host',
    lastActionBy: `${host.name} created room ${normalizedCode}`,
    connectedPlayers: [hostConnected],
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'rooms', normalizedCode), roomData);
    return roomData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export function subscribeToGameRoomInFirestore(
  code: string,
  onUpdate: (room: GameRoomData | null) => void
) {
  const normalizedCode = code.toUpperCase().trim();
  const roomRef = doc(db, 'rooms', normalizedCode);

  return onSnapshot(
    roomRef,
    snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameRoomData;
        onUpdate(data);
      } else {
        onUpdate(null);
      }
    },
    error => {
      handleFirestoreError(error, OperationType.GET, `rooms/${normalizedCode}`);
    }
  );
}

export async function joinGameRoomInFirestore(
  code: string,
  player: Player,
  deviceId: string
): Promise<GameRoomData> {
  const normalizedCode = code.toUpperCase().trim();
  const roomRef = doc(db, 'rooms', normalizedCode);
  const path = `rooms/${normalizedCode}`;

  try {
    const snap = await getDoc(roomRef);
    if (!snap.exists()) {
      throw new Error(`Room Code "${normalizedCode}" not found. Please check code or create room.`);
    }

    const roomData = snap.data() as GameRoomData;
    const connected = Array.isArray(roomData.connectedPlayers) ? roomData.connectedPlayers : [];

    // Find if this device is already in connectedPlayers
    const existingIndex = connected.findIndex(p => p.deviceId === deviceId);

    // Prevent ID collision with other devices that might also use '1' or 'p1'
    let assignedPlayerId = player.id;
    const isIdTaken = connected.some(cp => cp.deviceId !== deviceId && cp.id === assignedPlayerId);
    if (isIdTaken || !assignedPlayerId || assignedPlayerId === '1' || assignedPlayerId === 'p1') {
      assignedPlayerId = `p-${deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`;
    }

    const joiningPlayer: Player = {
      id: assignedPlayerId,
      name: player.name || `Player ${connected.length + 1}`,
      avatar: player.avatar || '🎲',
      color: player.color || 'bg-blue-500 text-white',
    };

    const newConnectedPlayer: ConnectedPlayer = {
      id: joiningPlayer.id,
      name: joiningPlayer.name,
      avatar: joiningPlayer.avatar,
      color: joiningPlayer.color,
      deviceId,
      lastSeen: new Date().toISOString(),
    };

    let updatedConnected = [...connected];
    if (existingIndex >= 0) {
      updatedConnected[existingIndex] = newConnectedPlayer;
    } else {
      updatedConnected.push(newConnectedPlayer);
    }

    // Ensure gameState is guaranteed valid and contains joiningPlayer
    let gameState = roomData.gameState ? safeClone(roomData.gameState) : null;
    if (!gameState || !Array.isArray(gameState.players) || gameState.players.length === 0) {
      // Reconstruct gameState from connected players
      const allPlayers: Player[] = updatedConnected.map(cp => ({
        id: cp.id,
        name: cp.name,
        avatar: cp.avatar || '🎲',
        color: cp.color || 'bg-emerald-500 text-white',
      }));
      gameState = createDefaultGameStateForRoom(roomData.gameType, allPlayers);
    } else {
      // Add or update joiningPlayer in gameState.players
      const playerIdx = gameState.players.findIndex(
        (p: Player) => p.id === joiningPlayer.id || (p.name.toLowerCase() === joiningPlayer.name.toLowerCase() && p.name !== 'Player 1' && p.name !== 'Player 2')
      );
      if (playerIdx === -1) {
        gameState.players = [...gameState.players, joiningPlayer];
      } else {
        gameState.players[playerIdx] = { ...gameState.players[playerIdx], ...joiningPlayer };
      }

      // Initialize scores for joining player if not present
      if (!gameState.scores) gameState.scores = {};
      if (roomData.gameType === 'yahtzee') {
        if (!gameState.scores[joiningPlayer.id]) {
          gameState.scores[joiningPlayer.id] = {
            aces: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
            threeOfAKind: null, fourOfAKind: null, fullHouse: null, smallStraight: null,
            largeStraight: null, yahtzee: null, chance: null, yahtzeeBonusCount: 0,
          };
        }
      } else {
        if (gameState.scores[joiningPlayer.id] === undefined) {
          gameState.scores[joiningPlayer.id] = 0;
        }
        const anyState = gameState as any;
        if (Array.isArray(anyState.rounds)) {
          anyState.rounds.forEach((r: any) => {
            if (r.scores && r.scores[joiningPlayer.id] === undefined) {
              r.scores[joiningPlayer.id] = 0;
            }
            if (r.farkles && r.farkles[joiningPlayer.id] === undefined) {
              r.farkles[joiningPlayer.id] = false;
            }
          });
        }
      }

      if (!gameState.activePlayerId || !gameState.players.some((p: Player) => p.id === gameState.activePlayerId)) {
        gameState.activePlayerId = gameState.players[0]?.id || joiningPlayer.id;
      }
    }

    const updatedRoom: GameRoomData = {
      ...roomData,
      gameState,
      connectedPlayers: updatedConnected,
      lastActionBy: `${joiningPlayer.name} joined room`,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(roomRef, updatedRoom, { merge: true });
    return updatedRoom;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function updateGameRoomStateInFirestore(
  code: string,
  gameState: any,
  turnScore?: number | null,
  actionBy?: string
) {
  // Validate that gameState is a valid object with players before sending to Firestore
  if (!gameState || !Array.isArray(gameState.players) || gameState.players.length === 0) {
    console.warn('Attempted to sync empty/invalid gameState to room, skipping update.');
    return;
  }

  const normalizedCode = code.toUpperCase().trim();
  const path = `rooms/${normalizedCode}`;

  try {
    await updateDoc(doc(db, 'rooms', normalizedCode), {
      gameState,
      turnScore: turnScore ?? null,
      lastActionBy: actionBy || 'Score updated',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function leaveGameRoomInFirestore(code: string, deviceId: string) {
  const normalizedCode = code.toUpperCase().trim();
  const roomRef = doc(db, 'rooms', normalizedCode);
  const path = `rooms/${normalizedCode}`;

  try {
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const roomData = snap.data() as GameRoomData;
    const connected = (roomData.connectedPlayers || []).filter(p => p.deviceId !== deviceId);

    await updateDoc(roomRef, {
      connectedPlayers: connected,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Global Hall of Fame High Scores
export function subscribeToHallOfFame(onUpdate: (records: HighScoreRecord[]) => void) {
  const fameRef = collection(db, 'hallOfFame');
  return onSnapshot(
    fameRef,
    snapshot => {
      const records: HighScoreRecord[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: data.id || docSnap.id,
          playerName: data.playerName,
          playerAvatar: data.playerAvatar,
          playerColor: data.playerColor,
          score: Number(data.score) || 0,
          gameType: data.gameType as GameType,
          date: data.date,
          isWinner: !!data.isWinner,
          createdAt: data.createdAt,
        };
      });
      // Sort highest score first
      records.sort((a, b) => b.score - a.score);
      onUpdate(records);
    },
    error => {
      console.warn('Hall of Fame real-time listener notice:', error);
      onUpdate([]);
    }
  );
}

export async function saveHighScoreToHallOfFame(record: HighScoreRecord) {
  const path = `hallOfFame/${record.id}`;
  try {
    await setDoc(doc(db, 'hallOfFame', record.id), {
      id: record.id,
      playerName: record.playerName,
      playerAvatar: record.playerAvatar || '🎲',
      playerColor: record.playerColor || 'bg-emerald-500',
      score: record.score,
      gameType: record.gameType,
      date: record.date,
      isWinner: !!record.isWinner,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
