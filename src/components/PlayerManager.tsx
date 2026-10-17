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

export interface AvatarItem {
  emoji: string;
  label: string;
  category: 'weed' | 'classic' | 'creatures';
}

export const AVATAR_OPTIONS: AvatarItem[] = [
  // Weed / Marijuana / 420 Themed Avatars
  { emoji: '🍁', label: 'Cannabis Leaf', category: 'weed' },
  { emoji: '🌿', label: 'Herb / Mary Jane', category: 'weed' },
  { emoji: '🍃', label: 'Green Bud / Leaf', category: 'weed' },
  { emoji: '🚬', label: 'Joint / Blunt', category: 'weed' },
  { emoji: '💨', label: 'Smoke Puff / Vape', category: 'weed' },
  { emoji: '😮‍💨', label: 'Exhale / Puff Puff Pass', category: 'weed' },
  { emoji: '🫠', label: 'Melted / Baked', category: 'weed' },
  { emoji: '🥴', label: 'Woozy / Stoned', category: 'weed' },
  { emoji: '🌲', label: 'Trees / Green', category: 'weed' },
  { emoji: '🥦', label: 'Broccoli / Nug', category: 'weed' },
  { emoji: '🌱', label: 'Cannabis Sprout', category: 'weed' },
  { emoji: '🪴', label: 'Potted Plant / Grow', category: 'weed' },
  { emoji: '🍪', label: 'Special Cookie / Edible', category: 'weed' },
  { emoji: '🍬', label: 'THC Gummy / Edible', category: 'weed' },
  { emoji: '🧪', label: 'Dab Rig / Extract', category: 'weed' },
  { emoji: '🍄', label: 'Magic Shroom', category: 'weed' },
  { emoji: '✌️', label: '420 Peace & Chill', category: 'weed' },
  { emoji: '🔥', label: 'Spark It / Blaze', category: 'weed' },
  { emoji: '🕶️', label: 'Red-Eye Shades', category: 'weed' },
  { emoji: '🍵', label: 'Infused Green Tea', category: 'weed' },

  // Classic Game & Fun Avatars
  { emoji: '🎲', label: 'Dice', category: 'classic' },
  { emoji: '🎯', label: 'Bullseye', category: 'classic' },
  { emoji: '👑', label: 'Crown', category: 'classic' },
  { emoji: '🏆', label: 'Trophy', category: 'classic' },
  { emoji: '💎', label: 'Diamond', category: 'classic' },
  { emoji: '⭐', label: 'Star', category: 'classic' },
  { emoji: '⚡', label: 'Lightning', category: 'classic' },
  { emoji: '🚀', label: 'Rocket', category: 'classic' },
  { emoji: '🍀', label: 'Lucky Clover', category: 'classic' },
  { emoji: '🍕', label: 'Pizza', category: 'classic' },
  { emoji: '🎨', label: 'Palette', category: 'classic' },
  { emoji: '🎸', label: 'Guitar', category: 'classic' },
  { emoji: '🕹️', label: 'Joystick', category: 'classic' },
  { emoji: '🥇', label: 'Medal', category: 'classic' },

  // Creatures & Animal Avatars
  { emoji: '🦊', label: 'Fox', category: 'creatures' },
  { emoji: '🦁', label: 'Lion', category: 'creatures' },
  { emoji: '🦉', label: 'Owl', category: 'creatures' },
  { emoji: '🐉', label: 'Dragon', category: 'creatures' },
  { emoji: '🦄', label: 'Unicorn', category: 'creatures' },
  { emoji: '🐼', label: 'Panda', category: 'creatures' },
  { emoji: '🐯', label: 'Tiger', category: 'creatures' },
  { emoji: '👽', label: 'Alien', category: 'creatures' },
  { emoji: '🤖', label: 'Robot', category: 'creatures' },
  { emoji: '👾', label: 'Monster', category: 'creatures' },
  { emoji: '👻', label: 'Ghost', category: 'creatures' },
  { emoji: '🐻', label: 'Bear', category: 'creatures' },
  { emoji: '🐸', label: 'Frog', category: 'creatures' },
  { emoji: '🐺', label: 'Wolf', category: 'creatures' },
];

export const EMOJI_PRESETS = AVATAR_OPTIONS.map((a) => a.emoji);

export default function PlayerManager({
  players,
  onAddPlayer,
  onRemovePlayer,
  onUpdatePlayer,
}: PlayerManagerProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [selectedAvatar, setSelectedAvatar] = useState('🍁');
  const [avatarCategory, setAvatarCategory] = useState<'weed' | 'classic' | 'creatures' | 'all'>('weed');
  const [inlineAvatarCategory, setInlineAvatarCategory] = useState<'weed' | 'classic' | 'creatures' | 'all'>('weed');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [editingAvatar, setEditingAvatar] = useState('🍁');

  const activeAvatarObj = AVATAR_OPTIONS.find(
    (a) => a.emoji === (editingId ? editingAvatar : selectedAvatar)
  );

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
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="block text-[10px] font-black text-teal-800 dark:text-teal-400 uppercase tracking-widest">
                Choose Emoji Avatar
              </label>
              {activeAvatarObj && (
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                  <span>{activeAvatarObj.emoji}</span>
                  <span>{activeAvatarObj.label}</span>
                </span>
              )}
            </div>

            {/* Avatar Category Tabs */}
            <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setAvatarCategory('weed')}
                className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  avatarCategory === 'weed'
                    ? 'bg-emerald-600 text-white shadow-xs scale-102 ring-2 ring-emerald-400/40'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200/60 dark:border-emerald-800/40'
                }`}
              >
                <span>🌿</span>
                <span>Weed / 420</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/30 text-[10px] rounded-full">
                  {AVATAR_OPTIONS.filter((a) => a.category === 'weed').length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory('classic')}
                className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  avatarCategory === 'classic'
                    ? 'bg-orange-500 text-white shadow-xs scale-102 ring-2 ring-orange-400/40'
                    : 'bg-orange-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-orange-100 border border-orange-100 dark:border-slate-700'
                }`}
              >
                <span>🎲</span>
                <span>Classic</span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory('creatures')}
                className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  avatarCategory === 'creatures'
                    ? 'bg-purple-600 text-white shadow-xs scale-102 ring-2 ring-purple-400/40'
                    : 'bg-purple-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-100 border border-purple-100 dark:border-slate-700'
                }`}
              >
                <span>🦊</span>
                <span>Creatures</span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory('all')}
                className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  avatarCategory === 'all'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-xs scale-102'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>✨</span>
                <span>All ({AVATAR_OPTIONS.length})</span>
              </button>
            </div>

            {/* Avatar Grid */}
            <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 max-h-36 overflow-y-auto p-2 bg-orange-50/20 dark:bg-slate-800/40 border border-orange-100/60 dark:border-slate-700/60 rounded-2xl">
              {AVATAR_OPTIONS.filter(
                (a) => avatarCategory === 'all' || a.category === avatarCategory
              ).map((item) => {
                const isSelected = selectedAvatar === item.emoji;
                return (
                  <button
                    key={item.emoji}
                    type="button"
                    title={`${item.label} (${item.emoji})`}
                    onClick={() => setSelectedAvatar(item.emoji)}
                    className={`h-9 rounded-xl text-lg cursor-pointer flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-sm scale-110 ring-2 ring-emerald-400'
                        : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:scale-105 border border-slate-100 dark:border-slate-700/40'
                    }`}
                  >
                    <span>{item.emoji}</span>
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

                    {/* Inline Avatar Category & Grid editing */}
                    <div className="space-y-2 p-2.5 bg-white dark:bg-slate-900/90 rounded-2xl border border-orange-100 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-400">
                          Avatar:
                        </span>
                        {activeAvatarObj && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50">
                            {activeAvatarObj.emoji} {activeAvatarObj.label}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setInlineAvatarCategory('weed')}
                            className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-colors cursor-pointer ${
                              inlineAvatarCategory === 'weed'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            🌿 Weed
                          </button>
                          <button
                            type="button"
                            onClick={() => setInlineAvatarCategory('classic')}
                            className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-colors cursor-pointer ${
                              inlineAvatarCategory === 'classic'
                                ? 'bg-orange-500 text-white'
                                : 'bg-orange-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            🎲 Classic
                          </button>
                          <button
                            type="button"
                            onClick={() => setInlineAvatarCategory('all')}
                            className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-colors cursor-pointer ${
                              inlineAvatarCategory === 'all'
                                ? 'bg-slate-700 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            ✨ All
                          </button>
                        </div>
                      </div>

                      {/* Avatar Picker Scroll */}
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                        {AVATAR_OPTIONS.filter(
                          (a) =>
                            inlineAvatarCategory === 'all' ||
                            a.category === inlineAvatarCategory
                        ).map((item) => (
                          <button
                            key={item.emoji}
                            type="button"
                            title={`${item.label} (${item.emoji})`}
                            onClick={() => setEditingAvatar(item.emoji)}
                            className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                              editingAvatar === item.emoji
                                ? 'bg-emerald-500 text-white shadow-xs scale-110 ring-2 ring-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:scale-105'
                            }`}
                          >
                            {item.emoji}
                          </button>
                        ))}
                      </div>

                      {/* Theme color picker for player */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Color:</span>
                        {COLOR_PRESETS.map((color) => {
                          const bgClass = color.split(' ')[0];
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditingColor(color)}
                              className={`w-5 h-5 rounded-full ${bgClass} shrink-0 cursor-pointer flex items-center justify-center transition-all ${
                                editingColor === color ? 'ring-2 ring-orange-500 scale-110' : 'hover:scale-105'
                              }`}
                            >
                              {editingColor === color && <Check className="w-3 h-3 text-white" />}
                            </button>
                          );
                        })}
                      </div>
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
