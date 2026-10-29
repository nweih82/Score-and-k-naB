import { FarkleHouseRules, YahtzeeHouseRules, SpadesHouseRules, EuchreHouseRules, HouseRulesPreset } from '../types';

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

export const DEFAULT_SPADES_RULES: SpadesHouseRules = {
  targetScore: 500,
  gameMode: 'partnership',
  includeJokers: false,
  nilBonus: 100,
  blindNilBonus: 200,
  bagPenalty: 100,
  bagThreshold: 10,
  minBid: 4,
};

export const DEFAULT_EUCHRE_RULES: EuchreHouseRules = {
  targetScore: 10,
  gameMode: 'partnership',
  aloneMarchPoints: 4,
  euchrePoints: 2,
  stickTheDealer: true,
  bennyJoker: false,
};

export const BUILT_IN_HOUSE_RULES_PRESETS: HouseRulesPreset[] = [
  {
    id: 'preset_standard',
    name: 'Standard Tournament',
    description: 'Official tournament rules. Farkle 10k, Yahtzee 63 (+35), Spades 500 Partnership (100 Nil / -100 Bags), Euchre 10 pts Partnership.',
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    farkle: { ...DEFAULT_FARKLE_RULES },
    yahtzee: { ...DEFAULT_YAHTZEE_RULES },
    spades: { ...DEFAULT_SPADES_RULES },
    euchre: { ...DEFAULT_EUCHRE_RULES },
  },
  {
    id: 'preset_blitz',
    name: 'Quick Play / Blitz',
    description: 'Fast, high-energy games. Farkle 5k, Yahtzee 60 (+50), Spades 250 pts w/ High & Low Jokers, Euchre 7 pts.',
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
    spades: {
      ...DEFAULT_SPADES_RULES,
      targetScore: 250,
      includeJokers: true,
    },
    euchre: {
      ...DEFAULT_EUCHRE_RULES,
      targetScore: 7,
      stickTheDealer: true,
    },
  },
  {
    id: 'preset_hardcore',
    name: 'High Stakes / Cutthroat',
    description: 'Competitive individual showdowns! Spades & Euchre set to Cutthroat mode with High & Low Jokers; Farkle 15k.',
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
    spades: {
      ...DEFAULT_SPADES_RULES,
      targetScore: 500,
      gameMode: 'cutthroat',
      includeJokers: true,
      minBid: 1,
    },
    euchre: {
      ...DEFAULT_EUCHRE_RULES,
      targetScore: 10,
      gameMode: 'cutthroat',
      stickTheDealer: true,
    },
  },
  {
    id: 'preset_wild',
    name: 'Party Night / Wild House',
    description: 'Fun house variations! Spades w/ High & Low Jokers (No Bag Penalty), Euchre w/ Benny Joker, Farkle w/ Piggybacking.',
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
    spades: {
      ...DEFAULT_SPADES_RULES,
      targetScore: 500,
      includeJokers: true,
      bagPenalty: 0,
      nilBonus: 150,
    },
    euchre: {
      ...DEFAULT_EUCHRE_RULES,
      targetScore: 10,
      bennyJoker: true,
      euchrePoints: 2,
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
    const customFiltered = customList
      .filter((c) => !BUILT_IN_HOUSE_RULES_PRESETS.some((b) => b.id === c.id))
      .map((c) => ({
        ...c,
        spades: { ...DEFAULT_SPADES_RULES, ...(c.spades || {}) },
        euchre: { ...DEFAULT_EUCHRE_RULES, ...(c.euchre || {}) },
      }));
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
  spades: SpadesHouseRules;
  euchre: EuchreHouseRules;
} {
  try {
    const stored = localStorage.getItem(ACTIVE_RULES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        farkle: { ...DEFAULT_FARKLE_RULES, ...(parsed.farkle || {}) },
        yahtzee: { ...DEFAULT_YAHTZEE_RULES, ...(parsed.yahtzee || {}) },
        spades: { ...DEFAULT_SPADES_RULES, ...(parsed.spades || {}) },
        euchre: { ...DEFAULT_EUCHRE_RULES, ...(parsed.euchre || {}) },
      };
    }
  } catch (err) {
    console.error('Error reading active house rules', err);
  }

  const activePresetId = loadActivePresetId();
  const presets = loadHouseRulesPresets();
  const found = presets.find((p) => p.id === activePresetId);
  if (found) {
    return {
      farkle: { ...found.farkle },
      yahtzee: { ...found.yahtzee },
      spades: { ...DEFAULT_SPADES_RULES, ...(found.spades || {}) },
      euchre: { ...DEFAULT_EUCHRE_RULES, ...(found.euchre || {}) },
    };
  }

  return {
    farkle: { ...DEFAULT_FARKLE_RULES },
    yahtzee: { ...DEFAULT_YAHTZEE_RULES },
    spades: { ...DEFAULT_SPADES_RULES },
    euchre: { ...DEFAULT_EUCHRE_RULES },
  };
}

export function saveActiveHouseRules(rules: {
  farkle: FarkleHouseRules;
  yahtzee: YahtzeeHouseRules;
  spades?: SpadesHouseRules;
  euchre?: EuchreHouseRules;
}): void {
  try {
    const current = loadActiveHouseRules();
    localStorage.setItem(
      ACTIVE_RULES_KEY,
      JSON.stringify({
        farkle: rules.farkle || current.farkle,
        yahtzee: rules.yahtzee || current.yahtzee,
        spades: rules.spades || current.spades,
        euchre: rules.euchre || current.euchre,
      })
    );
  } catch (err) {
    console.error('Error saving active house rules', err);
  }
}

export function createCustomPreset(
  name: string,
  description: string,
  farkle: FarkleHouseRules,
  yahtzee: YahtzeeHouseRules,
  spades: SpadesHouseRules = DEFAULT_SPADES_RULES,
  euchre: EuchreHouseRules = DEFAULT_EUCHRE_RULES
): HouseRulesPreset {
  const newPreset: HouseRulesPreset = {
    id: `custom_preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim() || 'My House Rules',
    description: description.trim() || 'Custom house rules preset',
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
    farkle: { ...farkle },
    yahtzee: { ...yahtzee },
    spades: { ...spades },
    euchre: { ...euchre },
  };

  const allPresets = loadHouseRulesPresets();
  const updated = [...allPresets, newPreset];
  saveHouseRulesPresets(updated);
  saveActivePresetId(newPreset.id);
  saveActiveHouseRules({ farkle, yahtzee, spades, euchre });

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
        spades: updates.spades ? { ...(p.spades || DEFAULT_SPADES_RULES), ...updates.spades } : p.spades,
        euchre: updates.euchre ? { ...(p.euchre || DEFAULT_EUCHRE_RULES), ...updates.euchre } : p.euchre,
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

  if (loadActivePresetId() === id) {
    saveActivePresetId('preset_standard');
    saveActiveHouseRules({
      farkle: { ...DEFAULT_FARKLE_RULES },
      yahtzee: { ...DEFAULT_YAHTZEE_RULES },
      spades: { ...DEFAULT_SPADES_RULES },
      euchre: { ...DEFAULT_EUCHRE_RULES },
    });
  }

  return filtered;
}

