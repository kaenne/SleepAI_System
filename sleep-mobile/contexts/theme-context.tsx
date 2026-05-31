import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { StorageKeys } from '@/constants/storage';

const THEME_KEY = StorageKeys.THEME_OVERRIDE;

type ColorSchemeName = 'light' | 'dark';

type ThemeContextType = {
  colorScheme: ColorSchemeName;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (scheme: ColorSchemeName) => void;
};

const ThemeContext = React.createContext<ThemeContextType | null>(null);

// App is dark-only by design — light-mode surfaces were never fully completed.
// We force dark regardless of system theme or persisted override, and clear
// any legacy 'light' value left from earlier builds so it can't come back.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    AsyncStorage.removeItem(THEME_KEY).catch(() => {});
  }, []);

  const value = React.useMemo<ThemeContextType>(
    () => ({
      colorScheme: 'dark',
      isDark: true,
      toggleTheme: () => {},
      setTheme: () => {},
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    // Fallback when used outside provider (shouldn't happen)
    const system = 'light';
    return {
      colorScheme: system,
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return ctx;
}

export function useColorSchemeOverride(): ColorSchemeName {
  return useTheme().colorScheme;
}
