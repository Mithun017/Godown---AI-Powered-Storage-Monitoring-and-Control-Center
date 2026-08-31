import { create } from 'zustand';

type Theme = 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>(() => {
  // Always enforce dark mode on root HTML element
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }

  return {
    theme: 'dark',
    toggleTheme: () => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    },
    setTheme: () => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    },
  };
});
