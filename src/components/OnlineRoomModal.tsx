import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Wifi, Share2, Copy, Plus, LogIn, LogOut, Check, Sparkles, Gamepad2, X, AlertCircle, RefreshCw } from 'lucide-react';
import { GameType, Player, GameRoomData } from '../types';
import {
  createGameRoomInFirestore,
  joinGameRoomInFirestore,
  subscribeToGameRoomInFirestore,
  leaveGameRoomInFirestore
} from '../lib/firebase';

interface OnlineRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGameType: GameType;
  currentGameState: any;
  currentTurnScore: number | null;
  savedPlayers: Player[];
  activeRoom: GameRoomData | null;
  setActiveRoom: (room: GameRoomData | null) => void;
  onRoomGameStateSync: (gameType: GameType, gameState: any, turnScore: number | null) => void;
  deviceId: string;
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  isOpen,
  onClose,
  currentGameType,
  currentGameState,
  currentTurnScore,
  savedPlayers,
  activeRoom,
  setActiveRoom,
  onRoomGameStateSync,
  deviceId,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [selectedGameType, setSelectedGameType] = useState<GameType>(currentGameType);
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(savedPlayers[0]?.id || '1');
  const [customPlayerName, setCustomPlayerName] = useState<string>(savedPlayers[0]?.name || 'Player 1');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Generate random 6-character alphanumeric room code
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const [generatedCode, setGeneratedCode] = useState<string>(generateRandomCode());

  useEffect(() => {
    if (savedPlayers.length > 0 && !savedPlayers.some(p => p.id === selectedPlayerId)) {
      setSelectedPlayerId(savedPlayers[0].id);
      setCustomPlayerName(savedPlayers[0].name);
    }
  }, [savedPlayers]);

  const handlePlayerSelect = (pId: string) => {
    setSelectedPlayerId(pId);
    const found = savedPlayers.find(p => p.id === pId);
    if (found) {
      setCustomPlayerName(found.name);
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const selectedPlayer = savedPlayers.find(p => p.id === selectedPlayerId) || {
        id: selectedPlayerId || 'p1',
        name: customPlayerName || 'Player 1',
        color: 'bg-orange-500 text-white',
        avatar: '🎲',
      };

      const room = await createGameRoomInFirestore(
        generatedCode,
        selectedGameType,
        currentGameState,
        currentTurnScore,
        deviceId,
        selectedPlayer.name,
        selectedPlayer
      );

      setActiveRoom(room);
      onRoomGameStateSync(room.gameType, room.gameState, room.turnScore ?? null);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Failed to create online room.');
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCodeInput.trim()) {
      setErrorMessage('Please enter a 6-character room code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const selectedPlayer = savedPlayers.find(p => p.id === selectedPlayerId) || {
        id: selectedPlayerId || `p-${Date.now()}`,
        name: customPlayerName || 'Player 1',
        color: 'bg-emerald-500 text-white',
        avatar: '🎲',
      };

      const joinedRoom = await joinGameRoomInFirestore(
        roomCodeInput,
        selectedPlayer,
        deviceId
      );

      setActiveRoom(joinedRoom);
      onRoomGameStateSync(joinedRoom.gameType, joinedRoom.gameState, joinedRoom.turnScore ?? null);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Failed to join room. Please check the code.');
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    setLoading(true);
    try {
      await leaveGameRoomInFirestore(activeRoom.code, deviceId);
      setActiveRoom(null);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setActiveRoom(null);
    }
  };

  const copyRoomCode = () => {
    if (!activeRoom) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${activeRoom.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center p-4 z-55 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border-2 border-orange-200 dark:border-orange-950 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 p-5 text-white flex justify-between items-center relative overflow-hidden">
          <div className="flex items-center gap-3 z-10">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
              <Wifi className="w-6 h-6 text-teal-200 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-wide">Live Online Multiplayer</h3>
              <p className="text-xs text-teal-100 font-medium">Sync scorekeeper across multiple devices in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active Room Status */}
          {activeRoom ? (
            <div className="space-y-4">
              <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border-2 border-teal-200 dark:border-teal-800/80 rounded-2xl text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-600 text-white rounded-full text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                  Live Sync Active
                </div>

                <div>
                  <div className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">Room Code</div>
                  <div className="text-3xl font-black tracking-widest font-mono text-teal-950 dark:text-teal-100 my-1">
                    {activeRoom.code}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Game: <span className="font-bold uppercase text-slate-900 dark:text-slate-100">{activeRoom.gameType}</span>
                  </p>
                </div>

                <button
                  onClick={copyRoomCode}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Link Copied to Clipboard!' : 'Copy Room Invite Link'}
                </button>
              </div>

              {/* Connected Players in Room */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-600" />
                  Connected Players ({activeRoom.connectedPlayers?.length || 0})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeRoom.connectedPlayers?.map(cp => (
                    <div
                      key={cp.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{cp.avatar || '👤'}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{cp.name}</span>
                      </div>
                      {cp.deviceId === activeRoom.hostId && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[10px] font-black rounded-md">
                          HOST
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 rounded-2xl text-sm transition"
                >
                  Back to Game
                </button>
                <button
                  onClick={handleLeaveRoom}
                  disabled={loading}
                  className="py-3 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-sm transition flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Leave Room
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Tab Selector: Create vs Join */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  onClick={() => { setTab('create'); setErrorMessage(null); }}
                  className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 ${
                    tab === 'create'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Host New Room
                </button>
                <button
                  onClick={() => { setTab('join'); setErrorMessage(null); }}
                  className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 ${
                    tab === 'join'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Join Room
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* Player Profile selection for device */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Your Profile on this Device
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {savedPlayers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handlePlayerSelect(p.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border-2 ${
                        selectedPlayerId === p.id
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-950 text-teal-950 dark:text-teal-100 font-black'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{p.avatar || '👤'}</span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {tab === 'create' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Select Game Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['farkle', 'yahtzee', 'dominoes'] as GameType[]).map(gt => (
                        <button
                          key={gt}
                          onClick={() => setSelectedGameType(gt)}
                          className={`p-3 rounded-2xl text-xs font-black uppercase tracking-wider border-2 transition text-center ${
                            selectedGameType === gt
                              ? 'border-teal-500 bg-teal-600 text-white shadow-md'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {gt === 'farkle' && '🎲 Farkle'}
                          {gt === 'yahtzee' && '📝 Yahtzee'}
                          {gt === 'dominoes' && '🁢 Dominoes'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Room Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generatedCode}
                        onChange={(e) => setGeneratedCode(e.target.value.toUpperCase())}
                        maxLength={8}
                        className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-center font-mono text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest focus:outline-none focus:border-teal-500"
                      />
                      <button
                        onClick={() => setGeneratedCode(generateRandomCode())}
                        title="Generate New Code"
                        className="px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-2xl transition flex items-center justify-center text-slate-700 dark:text-slate-200"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateRoom}
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black rounded-2xl text-sm transition shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}
                    {loading ? 'Creating Room...' : 'Start Online Room & Sync'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Enter 6-Character Room Code
                    </label>
                    <input
                      type="text"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. A8F3K2"
                      maxLength={10}
                      className="w-full px-4 py-3.5 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-center font-mono text-2xl font-black text-slate-950 dark:text-white uppercase tracking-widest placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <button
                    onClick={handleJoinRoom}
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black rounded-2xl text-sm transition shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                    {loading ? 'Joining Room...' : 'Join Game Room'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
