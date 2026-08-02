export interface ColorTheme {
  id: string;
  name: string;
  description: string;
  themeClass: string;
  primaryColor: string;
  badgeBg: string;
  previewGradient: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'amber',
    name: 'Classic Amber',
    description: 'Warm casino table with amber & teal accents',
    themeClass: 'theme-amber',
    primaryColor: '#f59e0b',
    badgeBg: 'bg-amber-500',
    previewGradient: 'from-amber-500 via-orange-400 to-teal-700',
  },
  {
    id: 'oceanic',
    name: 'Oceanic Teal',
    description: 'Refreshing sea breeze with cyan & deep teal',
    themeClass: 'theme-oceanic',
    primaryColor: '#0d9488',
    badgeBg: 'bg-teal-600',
    previewGradient: 'from-teal-500 via-cyan-400 to-blue-700',
  },
  {
    id: 'royal',
    name: 'Royal Velvet',
    description: 'Luxurious violet & indigo arcade theme',
    themeClass: 'theme-royal',
    primaryColor: '#6366f1',
    badgeBg: 'bg-indigo-600',
    previewGradient: 'from-indigo-500 via-purple-500 to-pink-600',
  },
  {
    id: 'rose',
    name: 'Sunset Rose',
    description: 'Warm sunset glow with rose & crimson',
    themeClass: 'theme-rose',
    primaryColor: '#f43f5e',
    badgeBg: 'bg-rose-500',
    previewGradient: 'from-rose-500 via-pink-400 to-orange-500',
  },
  {
    id: 'emerald',
    name: 'Forest Jade',
    description: 'Rich board game table with emerald & gold',
    themeClass: 'theme-emerald',
    primaryColor: '#10b981',
    badgeBg: 'bg-emerald-600',
    previewGradient: 'from-emerald-500 via-teal-500 to-amber-500',
  },
  {
    id: 'cyber',
    name: 'Cyber Slate',
    description: 'Cool futuristic obsidian with neon highlights',
    themeClass: 'theme-cyber',
    primaryColor: '#06b6d4',
    badgeBg: 'bg-cyan-500',
    previewGradient: 'from-cyan-400 via-sky-500 to-indigo-600',
  },
];
