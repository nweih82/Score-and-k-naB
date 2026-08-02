import React, { useState } from 'react';
import { Player } from '../types';
import { Plus, Trash2, Edit2, Check, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlayerManagerProps {
  players: Player[];
  onAddPlayer: (name: string, color: string, avatar?: string) => void;
  onRemovePlayer: (id: string) => void;
  onUpdatePlayer: (id: string, name: string, color: string, avatar?: string) => void;
}

const COLOR_PRESETS = [
  'bg-rose-500 text-white',
  'bg-sky-500 text-white',
  'bg-emerald-500 text-white',
  'bg-amber-500 text-white',
  'bg-violet-500 text-white',
  'bg-fuchsia-500 text-white',
  'bg-teal-500 text-white',
  'bg-indigo-500 text-white',
];

const EMOJI_PRESETS = ['🎲', '🎯', '👑', '🔥', '🐉', '🦊', '🦁', '🦉', '⭐', '⚡', '🏆', '💎', '🎨', '🚀', '🍀', '🍕'];

export default function PlayerManager({
  players,
  onAddPlayer,
  onRemovePlayer,
  onUpdatePlayer,
}: PlayerManagerProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [selectedAvatar, setSelectedAvatar] = useState('🎲');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [editingAvatar, setEditingAvatar] = useState('🎲');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    onAddPlayer(newPlayerName.trim(), selectedColor, selectedAvatar);
    setNewPlayerName('');
    // Rotate default color preset and avatar preset
    const currentIndex = COLOR_PRESETS.indexOf(selectedColor);
    const nextIndex = (currentIndex + 1) % COLOR_PRESETS.length;
    setSelectedColor(COLOR_PRESETS[nextIndex]);

    const currentAvatarIndex = EMOJI_PRESETS.indexOf(selectedAvatar);
    const nextAvatarIndex = (currentAvatarIndex + 1) % EMOJI_PRESETS.length;
    setSelectedAvatar(EMOJI_PRESETS[nextAvatarIndex]);
  };

  const startEditing = (player: Player) => {
    setEditingId(player.id);
    setEditingName(player.name);
    setEditingColor(player.color);
    setEditingAvatar(player.avatar || '🎲');
  };

  const saveEdit = () => {
    if (!editingName.trim() || !editingId) return;
    onUpdatePlayer(editingId, editingName.trim(), editingColor, editingAvatar);
    setEditingId(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border-2 border-orange-100 dark:border-slate-800 p-6">
      <h2 className="text-xl font-black text-teal-900 dark:text-slate-100 mb-4 flex items-center gap-2 uppercase tracking-tight">
        <User className="w-5 h-5 text-orange-500" />
        Manage Players ({players.length})
      </h2>

      {/* Add Player Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block text-[10px] font-black text-teal-800 dark:text-teal-400 uppercase tracking-widest mb-2">
            New Player Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="e.g. Alice"
              maxLength={15}
              className="flex-1 px-4 py-2.5 bg-orange-50/20 dark:bg-slate-800 border-2 border-orange-100 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:bg-white dark:focus:bg-slate-800 transition-all text-sm font-bold"
            />
            <button
              type="submit"
              disabled={!newPlayerName.trim()}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white font-black rounded-full text-sm flex items-center gap-1 transition-colors cursor-pointer uppercase tracking-wider shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Color & Avatar presets selection */}
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-black text-teal-800 dark:text-teal-400 uppercase tracking-widest mb-2">
              Choose Theme Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((color) => {
                const bgClass = color.split(' ')[0];
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      if (editingId) {
                        setEditingColor(color);
                      } else {
                        setSelectedColor(color);
                      }
                    }}
                    className={`w-8 h-8 rounded-full ${bgClass} cursor-pointer flex items-center justify-center transition-all ${
                      (editingId ? editingColor === color : selectedColor === color)
                        ? 'ring-4 ring-orange-500/30 scale-110'
                        : 'hover:scale-105'
                    }`}
                  >
                    {(editingId ? editingColor === color : selectedColor === color) && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-teal-800 dark:text-teal-400 uppercase tracking-widest mb-2">
              Choose Emoji Avatar
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-orange-50/20 dark:bg-slate-800/40 border border-orange-100/60 dark:border-slate-700/60 rounded-xl">
              {EMOJI_PRESETS.map((emoji) => {
                const isSelected = editingId ? editingAvatar === emoji : selectedAvatar === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      if (editingId) {
                        setEditingAvatar(emoji);
                      } else {
                        setSelectedAvatar(emoji);
                      }
                    }}
                    className={`w-8 h-8 rounded-lg text-base cursor-pointer flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-orange-500 text-white shadow-xs scale-110'
                        : 'bg-white dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </form>

      {/* Players List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {players.map((player) => {
            const isEditing = editingId === player.id;
            const bgClass = player.color.split(' ')[0];

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between p-3.5 bg-orange-50/20 dark:bg-slate-800/60 border border-orange-100/60 dark:border-slate-700/60 rounded-2xl"
              >
                {isEditing ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex gap-2 items-center">
                      <div className={`w-8 h-8 rounded-full ${editingColor.split(' ')[0]} flex items-center justify-center shrink-0 text-sm`}>
                        {editingAvatar}
                      </div>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        maxLength={15}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border-2 border-orange-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-bold focus:outline-none"
                      />
                      <button
                        onClick={saveEdit}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Inline Avatar & Color editing */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {EMOJI_PRESETS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditingAvatar(emoji)}
                          className={`w-6 h-6 rounded text-xs flex items-center justify-center cursor-pointer ${
                            editingAvatar === emoji ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full ${bgClass} font-black flex items-center justify-center text-sm shrink-0 shadow-sm`}
                      >
                        {player.avatar || player.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-700 dark:text-slate-200 text-sm uppercase tracking-tight flex items-center gap-1.5">
                        {player.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(player)}
                        className="p-1.5 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Edit Player"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemovePlayer(player.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Player"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {players.length === 0 && (
          <div className="text-center py-6 text-teal-800/40 text-sm font-semibold">
            No players added yet. Add players above to get started!
          </div>
        )}
      </div>
    </div>
  );
}
