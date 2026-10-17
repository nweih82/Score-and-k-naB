import { FarkleHouseRules, YahtzeeHouseRules, HouseRulesPreset } from '../types';

export const DEFAULT_FARKLE_RULES: FarkleHouseRules = {
  targetScore: 10000,
  openingMinimum: 500,
  threeFarklesPenalty: 0,
  allowPiggybacking: false,
  threePairsScore: 1500,
  fullHouseScore: 1500,
  straightScore: 1500,
  fourOfAKindScore: 1000,
  fiveOfAKindScore: 2000,
  sixOfAKindScore: 3000,
  hotDiceMandatoryRoll: false,
};

export const DEFAULT_YAHTZEE_RULES: YahtzeeHouseRules = {
  upperBonusThreshold: 63,
  upperBonusAmount: 35,
  extraYahtzeeBonus: 100,
  fullHouseScore: 25,
  smallStraightScore: 30,
  largeStraightScore: 40,
  yahtzeeScore: 50,
  jokerRule: 'standard',
};

export const BUILT_IN_HOUSE_RULES_PRESETS: HouseRulesPreset[] = [
  {
    id: 'preset_standard',
    name: 'Standard Tournament',
    description: 'Official tournament rules. Farkle 10,000 pts with 500 min to open; Yahtzee 63 threshold (+35 bonus, +100 extra Yahtzee).',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    farkle: { ...DEFAULT_FARKLE_RULES },
    yahtzee: { ...DEFAULT_YAHTZEE_RULES },
  },
  {
    id: 'preset_blitz',
    name: 'Quick Play / Blitz',
    description: 'Fast, high-energy games. Farkle 5,000 pts target with zero opening minimum; Yahtzee with 60 threshold and +50 upper bonus.',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    farkle: {
      ...DEFAULT_FARKLE_RULES,
      targetScore: 5000,
      openingMinimum: 0,
      threeFarklesPenalty: 0,
    },
    yahtzee: {
      ...DEFAULT_YAHTZEE_RULES,
      upperBonusThreshold: 60,
      upperBonusAmount: 50,
      extraYahtzeeBonus: 150,
    },
  },
  {
    id: 'preset_hardcore',
    name: 'High Stakes / Hardcore',
    description: 'Competitive endurance match. Farkle 15,000 pts, 1,000 min to open, -1,000 penalty for 3 Farkles, mandatory Hot Dice roll; Yahtzee 65 threshold.',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    farkle: {
      ...DEFAULT_FARKLE_RULES,
      targetScore: 15000,
      openingMinimum: 1000,
      threeFarklesPenalty: 1000,
      hotDiceMandatoryRoll: true,
    },
    yahtzee: {
      ...DEFAULT_YAHTZEE_RULES,
      upperBonusThreshold: 65,
      upperBonusAmount: 35,
      extraYahtzeeBonus: 100,
      jokerRule: 'strict_bonus_only',
    },
  },
  {
    id: 'preset_wild',
    name: 'Party Night / Wild House',
    description: 'Fun & chaotic house variations! Farkle with Piggybacking (inheriting dice) and -500 penalty; Yahtzee with +75 bonus and +150 Yahtzee credit.',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    farkle: {
      ...DEFAULT_FARKLE_RULES,
      targetScore: 10000,
      openingMinimum: 500,
      threeFarklesPenalty: 500,
      allowPiggybacking: true,
      straightScore: 2000,
    },
    yahtzee: {
      ...DEFAULT_YAHTZEE_RULES,
      upperBonusThreshold: 60,
      upperBonusAmount: 75,
      extraYahtzeeBonus: 150,
      fullHouseScore: 30,
      smallStraightScore: 35,
      largeStraightScore: 45,
      jokerRule: 'free_choice',
    },
  },
];

const PRESETS_STORAGE_KEY = 'scorekeeper_house_rules_presets';
const ACTIVE_PRESET_ID_KEY = 'scorekeeper_active_preset_id';
const ACTIVE_RULES_KEY = 'scorekeeper_active_rules';

export function loadHouseRulesPresets(): HouseRulesPreset[] {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!stored) {
      return BUILT_IN_HOUSE_RULES_PRESETS;
    }
    const customList: HouseRulesPreset[] = JSON.parse(stored);
    // Combine built-in presets with custom ones, preventing duplication
    const customFiltered = customList.filter(
      (c) => !BUILT_IN_HOUSE_RULES_PRESETS.some((b) => b.id === c.id)
    );
    return [...BUILT_IN_HOUSE_RULES_PRESETS, ...customFiltered];
  } catch (err) {
    console.error('Error reading house rules presets', err);
    return BUILT_IN_HOUSE_RULES_PRESETS;
  }
}

export function saveHouseRulesPresets(presets: HouseRulesPreset[]): void {
  try {
    const onlyCustom = presets.filter((p) => !p.isBuiltIn);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(onlyCustom));
  } catch (err) {
    console.error('Error saving house rules presets', err);
  }
}

export function loadActivePresetId(): string {
  try {
    return localStorage.getItem(ACTIVE_PRESET_ID_KEY) || 'preset_standard';
  } catch {
    return 'preset_standard';
  }
}

export function saveActivePresetId(presetId: string): void {
  try {
    localStorage.setItem(ACTIVE_PRESET_ID_KEY, presetId);
  } catch (err) {
    console.error('Error saving active preset id', err);
  }
}

export function loadActiveHouseRules(): {
  farkle: FarkleHouseRules;
  yahtzee: YahtzeeHouseRules;
} {
  try {
    const stored = localStorage.getItem(ACTIVE_RULES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        farkle: { ...DEFAULT_FARKLE_RULES, ...(parsed.farkle || {}) },
        yahtzee: { ...DEFAULT_YAHTZEE_RULES, ...(parsed.yahtzee || {}) },
      };
    }
  } catch (err) {
    console.error('Error reading active house rules', err);
  }

  // Fallback to active preset or default
  const activePresetId = loadActivePresetId();
  const presets = loadHouseRulesPresets();
  const found = presets.find((p) => p.id === activePresetId);
  if (found) {
    return { farkle: { ...found.farkle }, yahtzee: { ...found.yahtzee } };
  }

  return {
    farkle: { ...DEFAULT_FARKLE_RULES },
    yahtzee: { ...DEFAULT_YAHTZEE_RULES },
  };
}

export function saveActiveHouseRules(rules: {
  farkle: FarkleHouseRules;
  yahtzee: YahtzeeHouseRules;
}): void {
  try {
    localStorage.setItem(ACTIVE_RULES_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error('Error saving active house rules', err);
  }
}

export function createCustomPreset(
  name: string,
  description: string,
  farkle: FarkleHouseRules,
  yahtzee: YahtzeeHouseRules
): HouseRulesPreset {
  const newPreset: HouseRulesPreset = {
    id: `custom_preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim() || 'My House Rules',
    description: description.trim() || 'Custom house rules preset',
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
    farkle: { ...farkle },
    yahtzee: { ...yahtzee },
  };

  const allPresets = loadHouseRulesPresets();
  const updated = [...allPresets, newPreset];
  saveHouseRulesPresets(updated);
  saveActivePresetId(newPreset.id);
  saveActiveHouseRules({ farkle, yahtzee });

  return newPreset;
}

export function updateCustomPreset(
  id: string,
  updates: Partial<Omit<HouseRulesPreset, 'id' | 'isBuiltIn'>>
): HouseRulesPreset[] {
  const allPresets = loadHouseRulesPresets();
  const updated = allPresets.map((p) => {
    if (p.id === id && !p.isBuiltIn) {
      return {
        ...p,
        ...updates,
        farkle: updates.farkle ? { ...p.farkle, ...updates.farkle } : p.farkle,
        yahtzee: updates.yahtzee ? { ...p.yahtzee, ...updates.yahtzee } : p.yahtzee,
      };
    }
    return p;
  });
  saveHouseRulesPresets(updated);
  return updated;
}

export function deleteCustomPreset(id: string): HouseRulesPreset[] {
  const allPresets = loadHouseRulesPresets();
  const filtered = allPresets.filter((p) => p.id !== id || p.isBuiltIn);
  saveHouseRulesPresets(filtered);

  // If the deleted preset was active, switch to standard
  if (loadActivePresetId() === id) {
    saveActivePresetId('preset_standard');
    saveActiveHouseRules({
      farkle: { ...DEFAULT_FARKLE_RULES },
      yahtzee: { ...DEFAULT_YAHTZEE_RULES },
    });
  }

  return filtered;
}
