import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

const THEME_STORAGE_KEY = 'cevicheria_theme';

function applyThemeToDocument(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  initTheme: () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') {
      applyThemeToDocument(stored);
      set({ theme: stored });
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme: Theme = prefersDark ? 'dark' : 'light';
    applyThemeToDocument(initialTheme);
    set({ theme: initialTheme });
  },

  setTheme: (theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyThemeToDocument(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const nextTheme: Theme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(nextTheme);
  }
}));

export default useThemeStore;
