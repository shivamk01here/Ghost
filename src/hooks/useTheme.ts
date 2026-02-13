import { useState, useEffect, useCallback } from 'react';

export type ThemeColor = 
  | 'ocean'      // Classic Blue
  | 'emerald'    // Green
  | 'rose'       // Pink/Red
  | 'violet'     // Purple
  | 'amber'      // Orange/Yellow
  | 'cyan'       // Teal/Cyan
  | 'slate'      // Gray/Monochrome
  | 'fuchsia';   // Magenta

export interface ThemeConfig {
  color: ThemeColor;
  isDark: boolean;
}

// Color palette definitions
export const colorPalettes: Record<ThemeColor, { name: string; colors: string[]; gradient: string }> = {
  ocean: {
    name: 'Ocean',
    colors: ['#E0F2FE', '#7DD3FC', '#0EA5E9', '#0284C7', '#0369A1'],
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
  },
  emerald: {
    name: 'Emerald',
    colors: ['#D1FAE5', '#6EE7B7', '#10B981', '#059669', '#047857'],
    gradient: 'from-emerald-400 via-green-500 to-teal-600',
  },
  rose: {
    name: 'Rose',
    colors: ['#FFE4E6', '#FDA4AF', '#F43F5E', '#E11D48', '#BE123C'],
    gradient: 'from-rose-400 via-pink-500 to-rose-600',
  },
  violet: {
    name: 'Violet',
    colors: ['#EDE9FE', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9'],
    gradient: 'from-violet-400 via-purple-500 to-indigo-600',
  },
  amber: {
    name: 'Amber',
    colors: ['#FEF3C7', '#FCD34D', '#F59E0B', '#D97706', '#B45309'],
    gradient: 'from-amber-400 via-orange-500 to-red-500',
  },
  cyan: {
    name: 'Cyan',
    colors: ['#CFFAFE', '#67E8F9', '#06B6D4', '#0891B2', '#0E7490'],
    gradient: 'from-cyan-400 via-teal-500 to-cyan-600',
  },
  slate: {
    name: 'Slate',
    colors: ['#F1F5F9', '#94A3B8', '#64748B', '#475569', '#334155'],
    gradient: 'from-slate-400 via-gray-500 to-slate-600',
  },
  fuchsia: {
    name: 'Fuchsia',
    colors: ['#FAE8FF', '#E879F9', '#D946EF', '#C026D3', '#A21CAF'],
    gradient: 'from-fuchsia-400 via-pink-500 to-purple-600',
  },
};

// Generate CSS variables for each theme color
const generateThemeVariables = (color: ThemeColor, _isDark: boolean): Record<string, string> => {
  const palette = colorPalettes[color].colors;
  
  const lightVars: Record<string, string> = {
    '--color-primary-50': palette[0],
    '--color-primary-100': '#BFDBFE',
    '--color-primary-200': '#93C5FD',
    '--color-primary-300': '#60A5FA',
    '--color-primary-400': '#3B82F6',
    '--color-primary-500': palette[2],
    '--color-primary-600': palette[3],
    '--color-primary-700': palette[4],
    '--color-primary-800': '#1E3A8A',
    '--color-primary-900': '#172554',
    '--color-background-light': '#FAFAFA',
    '--color-background-dark': '#0A0A0A',
    '--color-surface-light': '#FFFFFF',
    '--color-surface-dark': '#111111',
    '--color-sidebar-light': '#F8FAFC',
    '--color-sidebar-dark': '#0F0F0F',
    '--color-border-light': '#E2E8F0',
    '--color-border-dark': '#1E293B',
    '--color-text-secondary-light': '#64748B',
    '--color-text-secondary-dark': '#94A3B8',
  };

  // Adjust primary colors based on selected theme
  switch (color) {
    case 'ocean':
      lightVars['--color-primary-500'] = '#0EA5E9';
      lightVars['--color-primary-600'] = '#0284C7';
      lightVars['--color-primary-700'] = '#0369A1';
      break;
    case 'emerald':
      lightVars['--color-primary-500'] = '#10B981';
      lightVars['--color-primary-600'] = '#059669';
      lightVars['--color-primary-700'] = '#047857';
      break;
    case 'rose':
      lightVars['--color-primary-500'] = '#F43F5E';
      lightVars['--color-primary-600'] = '#E11D48';
      lightVars['--color-primary-700'] = '#BE123C';
      break;
    case 'violet':
      lightVars['--color-primary-500'] = '#8B5CF6';
      lightVars['--color-primary-600'] = '#7C3AED';
      lightVars['--color-primary-700'] = '#6D28D9';
      break;
    case 'amber':
      lightVars['--color-primary-500'] = '#F59E0B';
      lightVars['--color-primary-600'] = '#D97706';
      lightVars['--color-primary-700'] = '#B45309';
      break;
    case 'cyan':
      lightVars['--color-primary-500'] = '#06B6D4';
      lightVars['--color-primary-600'] = '#0891B2';
      lightVars['--color-primary-700'] = '#0E7490';
      break;
    case 'slate':
      lightVars['--color-primary-500'] = '#64748B';
      lightVars['--color-primary-600'] = '#475569';
      lightVars['--color-primary-700'] = '#334155';
      break;
    case 'fuchsia':
      lightVars['--color-primary-500'] = '#D946EF';
      lightVars['--color-primary-600'] = '#C026D3';
      lightVars['--color-primary-700'] = '#A21CAF';
      break;
  }

  return lightVars;
};

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeConfig>({
    color: 'ocean',
    isDark: false,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('ghost-theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ThemeConfig;
        setTheme(parsed);
      } catch {
        // Fallback to default
      }
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme(prev => ({ ...prev, isDark: true }));
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    const variables = generateThemeVariables(theme.color, theme.isDark);

    // Apply CSS variables
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply dark mode class
    if (theme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('ghost-theme', JSON.stringify(theme));
  }, [theme, mounted]);

  const setThemeColor = useCallback((color: ThemeColor) => {
    setTheme(prev => ({ ...prev, color }));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setTheme(prev => ({ ...prev, isDark: !prev.isDark }));
  }, []);

  const setDarkMode = useCallback((isDark: boolean) => {
    setTheme(prev => ({ ...prev, isDark }));
  }, []);

  return {
    theme,
    setThemeColor,
    toggleDarkMode,
    setDarkMode,
    mounted,
    currentPalette: colorPalettes[theme.color],
  };
};

// Legacy hook for backward compatibility
export const useLegacyTheme = () => {
  const { theme, toggleDarkMode, mounted } = useTheme();
  return {
    theme: theme.isDark ? 'dark' : 'light',
    toggleTheme: toggleDarkMode,
    mounted,
  };
};
