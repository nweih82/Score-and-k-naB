import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wifi, Users, Copy, Check, LogOut, Radio, Share2 } from 'lucide-react';
import { GameRoomData } from '../types';

interface OnlineSyncBarProps {
  room: GameRoomData;
  onOpenModal: () => void;
  onLeaveRoom: () => void;
}

export const OnlineSyncBar: React.FC<OnlineSyncBarProps> = ({
  room,
  onOpenModal,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const copyInvite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 bg-gradient-to-r from-emerald-900 via-teal-900 to-cyan-950 text-white border-b-2 border-teal-500/30 shadow-lg px-3 py-2 sm:px-6 flex flex-wrap items-center justify-between gap-2"
    >
      {/* Left: Status & Room Code */}
      <div
        onClick={onOpenModal}
        className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition group"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        
        <div className="flex items-center gap-1.5 font-mono text-xs font-black tracking-wider uppercase text-emerald-300 group-hover:text-white transition">
          <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>ROOM: <span className="text-white text-sm tracking-widest bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-500/40">{room.code}</span></span>
        </div>

        {room.lastActionBy && (
          <span className="hidden md:inline-block text-[11px] text-teal-200/90 font-medium truncate max-w-[220px] bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-800/60">
            {room.lastActionBy}
          </span>
        )}
      </div>

      {/* Center: Connected Players */}
      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {room.connectedPlayers?.slice(0, 5).map(cp => (
            <span
              key={cp.id}
              title={cp.name}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-800 border-2 border-teal-400 text-xs shadow-sm"
            >
              {cp.avatar || '👤'}
            </span>
          ))}
        </div>
        <span className="text-xs font-bold text-teal-200">
          {room.connectedPlayers?.length || 0} online
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={copyInvite}
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
          title="Copy Room Link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Invite Link'}</span>
        </button>

        <button
          onClick={onOpenModal}
          className="px-2.5 py-1 bg-teal-800 hover:bg-teal-700 text-teal-100 rounded-lg text-xs font-bold transition border border-teal-600/50"
        >
          Room Info
        </button>

        <button
          onClick={onLeaveRoom}
          className="p-1 bg-rose-950/60 hover:bg-rose-900 text-rose-200 rounded-lg transition"
          title="Leave Room"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};
