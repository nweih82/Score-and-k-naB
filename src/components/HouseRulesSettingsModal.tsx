import React, { useState, useEffect } from 'react';
import {
  FarkleHouseRules,
  YahtzeeHouseRules,
  HouseRulesPreset,
} from '../types';
import {
  DEFAULT_FARKLE_RULES,
  DEFAULT_YAHTZEE_RULES,
  loadHouseRulesPresets,
  loadActivePresetId,
  saveActivePresetId,
  loadActiveHouseRules,
  saveActiveHouseRules,
  createCustomPreset,
  deleteCustomPreset,
  updateCustomPreset,
} from '../lib/houseRules';
import {
  Sliders,
  Sparkles,
  Flame,
  Check,
  X,
  RotateCcw,
  Save,
  Trash2,
  Bookmark,
  Info,
  ShieldAlert,
  Dices,
  Plus,
  Edit2,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface HouseRulesSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRules?: (rules: { farkle: FarkleHouseRules; yahtzee: YahtzeeHouseRules }) => void;
  onRulesUpdated?: () => void;
  activeGameType?: 'farkle' | 'yahtzee' | null;
  initialTab?: 'farkle' | 'yahtzee' | 'presets';
}

export function HouseRulesSettingsModal({
  isOpen,
  onClose,
  onApplyRules,
  onRulesUpdated,
  activeGameType,
  initialTab,
}: HouseRulesSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'farkle' | 'yahtzee' | 'presets'>(
    initialTab || (activeGameType === 'yahtzee' ? 'yahtzee' : 'farkle')
  );

  const [presets, setPresets] = useState<HouseRulesPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string>('preset_standard');

  const [farkleRules, setFarkleRules] = useState<FarkleHouseRules>(DEFAULT_FARKLE_RULES);
  const [yahtzeeRules, setYahtzeeRules] = useState<YahtzeeHouseRules>(DEFAULT_YAHTZEE_RULES);

  // New Preset Modal state
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (isOpen) {
      const loadedPresets = loadHouseRulesPresets();
      const currentPresetId = loadActivePresetId();
      const currentRules = loadActiveHouseRules();

      setPresets(loadedPresets);
      setActivePresetId(currentPresetId);
      setFarkleRules(currentRules.farkle);
      setYahtzeeRules(currentRules.yahtzee);

      if (initialTab) {
        setActiveTab(initialTab);
      } else if (activeGameType === 'yahtzee') {
        setActiveTab('yahtzee');
      } else if (activeGameType === 'farkle') {
        setActiveTab('farkle');
      }
    }
  }, [isOpen, activeGameType, initialTab]);

  if (!isOpen) return null;

  const currentPreset = presets.find((p) => p.id === activePresetId);

  const handleSelectPreset = (preset: HouseRulesPreset) => {
    setActivePresetId(preset.id);
    setFarkleRules({ ...preset.farkle });
    setYahtzeeRules({ ...preset.yahtzee });
    saveActivePresetId(preset.id);
    saveActiveHouseRules({ farkle: preset.farkle, yahtzee: preset.yahtzee });
    showToast(`Loaded preset "${preset.name}"`);
    if (onRulesUpdated) onRulesUpdated();
  };

  const handleSaveAsNewPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const created = createCustomPreset(
      newPresetName,
      newPresetDescription,
      farkleRules,
      yahtzeeRules
    );

    const updatedPresets = loadHouseRulesPresets();
    setPresets(updatedPresets);
    setActivePresetId(created.id);
    setIsCreatingPreset(false);
    setNewPresetName('');
    setNewPresetDescription('');
    showToast(`Preset "${created.name}" saved!`);
    if (onRulesUpdated) onRulesUpdated();
  };

  const handleUpdateCurrentCustomPreset = () => {
    if (!currentPreset || currentPreset.isBuiltIn) return;
    const updated = updateCustomPreset(currentPreset.id, {
      farkle: farkleRules,
      yahtzee: yahtzeeRules,
    });
    setPresets(updated);
    saveActiveHouseRules({ farkle: farkleRules, yahtzee: yahtzeeRules });
    showToast(`Updated preset "${currentPreset.name}"`);
    if (onRulesUpdated) onRulesUpdated();
  };

  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = deleteCustomPreset(presetId);
    setPresets(remaining);
    setActivePresetId('preset_standard');
    const reloaded = loadActiveHouseRules();
    setFarkleRules(reloaded.farkle);
    setYahtzeeRules(reloaded.yahtzee);
    showToast('Custom preset deleted');
    if (onRulesUpdated) onRulesUpdated();
  };

  const handleResetToStandard = () => {
    setFarkleRules({ ...DEFAULT_FARKLE_RULES });
    setYahtzeeRules({ ...DEFAULT_YAHTZEE_RULES });
    setActivePresetId('preset_standard');
    saveActivePresetId('preset_standard');
    saveActiveHouseRules({
      farkle: { ...DEFAULT_FARKLE_RULES },
      yahtzee: { ...DEFAULT_YAHTZEE_RULES },
    });
    showToast('Reset to Official Standard rules');
    if (onRulesUpdated) onRulesUpdated();
  };

  const handleApplyAndClose = () => {
    saveActiveHouseRules({ farkle: farkleRules, yahtzee: yahtzeeRules });
    saveActivePresetId(activePresetId);
    if (onApplyRules) {
      onApplyRules({ farkle: farkleRules, yahtzee: yahtzeeRules });
    }
    if (onRulesUpdated) {
      onRulesUpdated();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[36px] border-2 border-orange-100 dark:border-slate-800 p-5 sm:p-7 max-w-4xl w-full shadow-2xl relative overflow-hidden max-h-[92vh] max-h-[92dvh] overflow-y-auto my-auto flex flex-col"
        >
          {/* TOAST ALERT */}
          {toastMessage && (
            <div className="absolute top-4 right-14 z-20 bg-emerald-600 text-white px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md animate-bounce">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {toastMessage}
            </div>
          )}

          {/* MODAL HEADER */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950/50 rounded-2xl text-amber-600 dark:text-amber-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    House Rules & Presets
                  </h3>
                  {currentPreset && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Preset: {currentPreset.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Configure custom target scores, scoring variations, and penalty rules
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors cursor-pointer"
              title="Close Settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* PRESETS QUICK SELECTOR BAR */}
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-amber-500" /> Presets:
              </span>
              <div className="flex items-center gap-1.5">
                {presets.map((p) => {
                  const isSelected = p.id === activePresetId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-2xs ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/40'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      {p.name}
                      {!p.isBuiltIn && (
                        <span
                          onClick={(e) => handleDeletePreset(p.id, e)}
                          className="hover:text-red-600 ml-1 text-slate-400 p-0.5 rounded"
                          title="Delete custom preset"
                        >
                          ×
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsCreatingPreset(true)}
                className="px-2.5 py-1 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1 border border-amber-300 dark:border-amber-700/60"
              >
                <Plus className="w-3.5 h-3.5" /> Save as Preset
              </button>

              {currentPreset && !currentPreset.isBuiltIn && (
                <button
                  type="button"
                  onClick={handleUpdateCurrentCustomPreset}
                  className="px-2.5 py-1 text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1 border border-teal-300 dark:border-teal-700/60"
                  title="Overwrite this custom preset with current modifications"
                >
                  <Save className="w-3.5 h-3.5" /> Update
                </button>
              )}

              <button
                type="button"
                onClick={handleResetToStandard}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                title="Reset to official standard tournament rules"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CREATE PRESET MODAL OVERLAY */}
          {isCreatingPreset && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border-2 border-amber-300 dark:border-amber-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Save className="w-4 h-4" /> Save Current Rules as Preset
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingPreset(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAsNewPreset} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Preset Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Friday Game Night"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Short Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 5k quick match with toxic farkle"
                      value={newPresetDescription}
                      onChange={(e) => setNewPresetDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingPreset(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xs"
                  >
                    Save Preset
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* NAVIGATION TABS */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('farkle')}
              className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'farkle'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Flame className="w-4 h-4 fill-current" />
              Farkle House Rules
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('yahtzee')}
              className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'yahtzee'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4 fill-current" />
              Yahtzee House Rules
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'presets'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Manage Presets
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="space-y-6 flex-1 overflow-y-auto pr-1">
            {/* FARKLE RULES TAB */}
            {activeTab === 'farkle' && (
              <div className="space-y-5">
                {/* 1. Target Score */}
                <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        Target Score to Win
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        First player to reach or exceed this score triggers the final showdown round.
                      </p>
                    </div>
                    <span className="text-base font-black font-mono text-orange-600 dark:text-orange-400">
                      {farkleRules.targetScore.toLocaleString()} pts
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {[5000, 10000, 15000, 20000].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() =>
                          setFarkleRules((prev) => ({ ...prev, targetScore: score }))
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          farkleRules.targetScore === score
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {score === 5000 && '⚡ Blitz (5k)'}
                        {score === 10000 && '🎯 Official (10k)'}
                        {score === 15000 && '🏆 Endurance (15k)'}
                        {score === 20000 && '🔥 Marathon (20k)'}
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        Custom:
                      </span>
                      <input
                        type="number"
                        min={1000}
                        max={100000}
                        step={500}
                        value={farkleRules.targetScore}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0) {
                            setFarkleRules((prev) => ({ ...prev, targetScore: val }));
                          }
                        }}
                        className="w-24 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Opening Score Minimum */}
                <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Minimum Opening Score to Get on the Board
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Points required on a player's first successful turn before they can start banking points.
                      </p>
                    </div>
                    <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {farkleRules.openingMinimum === 0
                        ? 'No Minimum'
                        : `${farkleRules.openingMinimum.toLocaleString()} pts`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { val: 0, label: 'None (0 pts)', desc: 'Bank any score right away' },
                      { val: 500, label: '500 pts (Standard)', desc: 'Official regulation rule' },
                      { val: 1000, label: '1,000 pts (High Stakes)', desc: 'Challenging start' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() =>
                          setFarkleRules((prev) => ({ ...prev, openingMinimum: opt.val }))
                        }
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          farkleRules.openingMinimum === opt.val
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/50'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-black text-xs text-slate-800 dark:text-slate-200">
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-slate-400">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Three Farkles in a Row Penalty */}
                <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                        Three Consecutive Farkles Penalty
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Point deduction penalty if the same player rolls three Farkles in a row.
                      </p>
                    </div>
                    <span className="text-xs font-black font-mono text-red-600 dark:text-red-400">
                      {farkleRules.threeFarklesPenalty === 0
                        ? 'Disabled'
                        : `-${farkleRules.threeFarklesPenalty} pts`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { val: 0, label: 'No Penalty (0 pts)', desc: 'Friendly / Casual' },
                      { val: 500, label: '-500 pts', desc: 'Standard house penalty' },
                      { val: 1000, label: '-1,000 pts', desc: 'Severe tournament rule' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() =>
                          setFarkleRules((prev) => ({
                            ...prev,
                            threeFarklesPenalty: opt.val,
                          }))
                        }
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          farkleRules.threeFarklesPenalty === opt.val
                            ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 ring-1 ring-red-500/50'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-black text-xs text-slate-800 dark:text-slate-200">
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-slate-400">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Piggybacking / Toxic Farkle & Hot Dice */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Piggybacking Toggle */}
                  <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Dices className="w-3.5 h-3.5 text-purple-500" />
                        Piggybacking (Inherit Dice)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Next player may choose to roll remaining unbanked dice from previous player's turn.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFarkleRules((prev) => ({
                          ...prev,
                          allowPiggybacking: !prev.allowPiggybacking,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        farkleRules.allowPiggybacking
                          ? 'bg-purple-600'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          farkleRules.allowPiggybacking ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Hot Dice Mandatory Roll Toggle */}
                  <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        Mandatory Hot Dice Roll
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Player who scores with all 6 dice MUST roll again (cannot bank immediately).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFarkleRules((prev) => ({
                          ...prev,
                          hotDiceMandatoryRoll: !prev.hotDiceMandatoryRoll,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        farkleRules.hotDiceMandatoryRoll
                          ? 'bg-amber-500'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          farkleRules.hotDiceMandatoryRoll ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 5. Combinations Scoring Variations */}
                <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Special Scoring Combinations
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 3 Pairs */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <div className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                        Three Pairs
                      </div>
                      <div className="text-[10px] text-slate-400 mb-2">e.g. 2-2, 4-4, 6-6</div>
                      <div className="flex gap-1">
                        {[1500, 0].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() =>
                              setFarkleRules((prev) => ({ ...prev, threePairsScore: score }))
                            }
                            className={`flex-1 py-1 rounded-lg text-xs font-black ${
                              farkleRules.threePairsScore === score
                                ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            {score === 0 ? 'Off' : '1,500'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 1-6 Straight */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <div className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                        1-6 Straight
                      </div>
                      <div className="text-[10px] text-slate-400 mb-2">1, 2, 3, 4, 5, 6</div>
                      <div className="flex gap-1">
                        {[1500, 2000, 2500].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() =>
                              setFarkleRules((prev) => ({ ...prev, straightScore: score }))
                            }
                            className={`flex-1 py-1 rounded-lg text-xs font-black ${
                              farkleRules.straightScore === score
                                ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            {score.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Full House */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <div className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                        Full House (3+2)
                      </div>
                      <div className="text-[10px] text-slate-400 mb-2">3 of kind + 1 pair</div>
                      <div className="flex gap-1">
                        {[1500, 0].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() =>
                              setFarkleRules((prev) => ({ ...prev, fullHouseScore: score }))
                            }
                            className={`flex-1 py-1 rounded-lg text-xs font-black ${
                              farkleRules.fullHouseScore === score
                                ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            {score === 0 ? 'Off' : '1,500'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* YAHTZEE RULES TAB */}
            {activeTab === 'yahtzee' && (
              <div className="space-y-5">
                {/* 1. Upper Section Bonus Threshold */}
                <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                        Upper Section Bonus Threshold
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Total score needed in Aces through Sixes (3-of-each average is 63).
                      </p>
                    </div>
                    <span className="text-base font-black font-mono text-teal-600 dark:text-teal-400">
                      {yahtzeeRules.upperBonusThreshold} pts
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {[60, 63, 65, 70].map((threshold) => (
                      <button
                        key={threshold}
                        type="button"
                        onClick={() =>
                          setYahtzeeRules((prev) => ({
                            ...prev,
                            upperBonusThreshold: threshold,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          yahtzeeRules.upperBonusThreshold === threshold
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {threshold === 60 && '⚡ Easy (60)'}
                        {threshold === 63 && '🎯 Official (63)'}
                        {threshold === 65 && '🔥 Hard (65)'}
                        {threshold === 70 && '⚔️ Elite (70)'}
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        Custom:
                      </span>
                      <input
                        type="number"
                        min={40}
                        max={100}
                        value={yahtzeeRules.upperBonusThreshold}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0) {
                            setYahtzeeRules((prev) => ({
                              ...prev,
                              upperBonusThreshold: val,
                            }));
                          }
                        }}
                        className="w-20 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Upper Section Bonus Amount */}
                <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-500" />
                        Upper Section Bonus Points Awarded
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Bonus added to the grand total once the upper threshold is reached.
                      </p>
                    </div>
                    <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                      +{yahtzeeRules.upperBonusAmount} pts
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[35, 50, 75, 100].map((bonus) => (
                      <button
                        key={bonus}
                        type="button"
                        onClick={() =>
                          setYahtzeeRules((prev) => ({
                            ...prev,
                            upperBonusAmount: bonus,
                          }))
                        }
                        className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                          yahtzeeRules.upperBonusAmount === bonus
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/50'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-black text-xs text-slate-800 dark:text-slate-200 font-mono">
                          +{bonus} pts
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {bonus === 35 ? 'Standard' : bonus === 50 ? 'Generous' : 'High Stakes'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Extra Yahtzee Bonus Points */}
                <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        Multiple Yahtzee Bonus
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Bonus points awarded for each additional Yahtzee rolled after scoring the first 50.
                      </p>
                    </div>
                    <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                      +{yahtzeeRules.extraYahtzeeBonus} pts
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[50, 100, 150, 200].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setYahtzeeRules((prev) => ({
                            ...prev,
                            extraYahtzeeBonus: val,
                          }))
                        }
                        className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                          yahtzeeRules.extraYahtzeeBonus === val
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-500/50'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-black text-xs text-slate-800 dark:text-slate-200 font-mono">
                          +{val} pts
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {val === 100 ? 'Official' : 'Variation'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Joker Rule & Fixed Lower Category Values */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Joker Rule Mode */}
                  <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-500" />
                      Yahtzee Joker Rule
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      How extra Yahtzees may be used as wildcards on the lower scorecard:
                    </p>

                    <div className="space-y-1.5 pt-1">
                      {[
                        {
                          id: 'standard',
                          label: 'Standard Official',
                          desc: 'Must fill open upper slot first; otherwise free choice wildcard',
                        },
                        {
                          id: 'free_choice',
                          label: 'Free Choice Wildcard',
                          desc: 'Can fill any lower slot without checking upper slots',
                        },
                        {
                          id: 'strict_bonus_only',
                          label: 'Bonus Points Only',
                          desc: 'Extra Yahtzees only award bonus; no wildcard usage',
                        },
                      ].map((jokerOpt) => (
                        <button
                          key={jokerOpt.id}
                          type="button"
                          onClick={() =>
                            setYahtzeeRules((prev) => ({
                              ...prev,
                              jokerRule: jokerOpt.id as any,
                            }))
                          }
                          className={`w-full p-2 rounded-xl text-left border transition-all cursor-pointer text-xs ${
                            yahtzeeRules.jokerRule === jokerOpt.id
                              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="font-black text-slate-800 dark:text-slate-200">
                            {jokerOpt.label}
                          </div>
                          <div className="text-[10px] text-slate-400">{jokerOpt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fixed Lower Category Values */}
                  <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-teal-500" />
                      Fixed Category Point Values
                    </h4>

                    <div className="space-y-2 pt-1 text-xs">
                      {/* Full House */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Full House
                        </span>
                        <div className="flex gap-1">
                          {[25, 30].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() =>
                                setYahtzeeRules((prev) => ({ ...prev, fullHouseScore: v }))
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                yahtzeeRules.fullHouseScore === v
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {v} pts
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Small Straight */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Small Straight (4)
                        </span>
                        <div className="flex gap-1">
                          {[30, 35].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() =>
                                setYahtzeeRules((prev) => ({ ...prev, smallStraightScore: v }))
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                yahtzeeRules.smallStraightScore === v
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {v} pts
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Large Straight */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Large Straight (5)
                        </span>
                        <div className="flex gap-1">
                          {[40, 45, 50].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() =>
                                setYahtzeeRules((prev) => ({ ...prev, largeStraightScore: v }))
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                yahtzeeRules.largeStraightScore === v
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {v} pts
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PRESETS MANAGEMENT TAB */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Saved House Rules Presets allow you to switch instantly between standard tournament play and custom house rules.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreatingPreset(true)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Preset
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {presets.map((preset) => {
                    const isSelected = preset.id === activePresetId;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-2 ring-amber-400/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                                {preset.name}
                              </span>
                              {preset.isBuiltIn && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  Official
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                              {preset.description}
                            </p>
                          </div>

                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : null}
                        </div>

                        {/* Rules Summary Tags */}
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                          <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300">
                            Farkle: {preset.farkle.targetScore.toLocaleString()} pts
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300">
                            Yahtzee: {preset.yahtzee.upperBonusThreshold} / +{preset.yahtzee.upperBonusAmount}
                          </span>
                          {preset.farkle.threeFarklesPenalty > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300">
                              -{preset.farkle.threeFarklesPenalty} 3-Farkle
                            </span>
                          )}
                          {preset.farkle.allowPiggybacking && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300">
                              Piggybacking
                            </span>
                          )}
                        </div>

                        {/* Card footer */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">
                            {isSelected ? 'Currently Active' : 'Click to Activate'}
                          </span>
                          {!preset.isBuiltIn && (
                            <button
                              type="button"
                              onClick={(e) => handleDeletePreset(preset.id, e)}
                              className="text-red-400 hover:text-red-600 flex items-center gap-1 font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                Rules apply to local games and sync across multiplayer rooms.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyAndClose}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                Apply House Rules
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default HouseRulesSettingsModal;
