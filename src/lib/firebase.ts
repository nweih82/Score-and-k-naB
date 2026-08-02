import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import {
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
import { Player, GameHistoryEntry, SavedGameData, GameType, GameRoomData, ConnectedPlayer } from '../types';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// Auth Helpers
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      // Sync user profile
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(
        userRef,
        {
          displayName: result.user.displayName || 'Player',
          email: result.user.email || '',
          photoURL: result.user.photoURL || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
    return result.user;
  } catch (error) {
    console.error('Google Auth Error:', error);
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

  const hostConnected: ConnectedPlayer = {
    id: hostPlayer?.id || hostId,
    name: hostName || hostPlayer?.name || 'Host',
    avatar: hostPlayer?.avatar || '👑',
    color: hostPlayer?.color || 'bg-amber-500 text-white',
    deviceId: hostId,
    lastSeen: new Date().toISOString(),
  };

  const roomData: GameRoomData = {
    code: normalizedCode,
    gameType,
    gameState,
    turnScore: turnScore ?? null,
    hostId,
    hostName: hostName || 'Host',
    lastActionBy: `${hostName} created room ${normalizedCode}`,
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
    const connected = roomData.connectedPlayers || [];

    // Check if player already connected or add them
    const existingIndex = connected.findIndex(p => p.deviceId === deviceId || p.id === player.id);
    const newConnectedPlayer: ConnectedPlayer = {
      id: player.id,
      name: player.name,
      avatar: player.avatar || '🎲',
      color: player.color || 'bg-blue-500 text-white',
      deviceId,
      lastSeen: new Date().toISOString(),
    };

    let updatedConnected = [...connected];
    if (existingIndex >= 0) {
      updatedConnected[existingIndex] = newConnectedPlayer;
    } else {
      updatedConnected.push(newConnectedPlayer);
    }

    // Check if player is present in room's gameState.players array, if not add them!
    const gameState = { ...roomData.gameState } as any;
    if (gameState && Array.isArray(gameState.players)) {
      const hasPlayer = gameState.players.some((p: Player) => p.id === player.id);
      if (!hasPlayer) {
        gameState.players = [...gameState.players, player];
        if (gameState.scores && gameState.scores[player.id] === undefined) {
          if (roomData.gameType === 'yahtzee') {
            gameState.scores[player.id] = {
              aces: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
              threeOfAKind: null, fourOfAKind: null, fullHouse: null, smallStraight: null,
              largeStraight: null, yahtzee: null, chance: null, yahtzeeBonusCount: 0,
            };
          } else {
            gameState.scores[player.id] = 0;
          }
        }
      }
    }

    const updatedRoom: GameRoomData = {
      ...roomData,
      gameState,
      connectedPlayers: updatedConnected,
      lastActionBy: `${player.name} joined room`,
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
