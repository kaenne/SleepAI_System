import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

const THEME_KEY = 'sleepai_theme_override';

type ColorSchemeName = 'light' | 'dark';

type ThemeContextType = {
  colorScheme: ColorSchemeName;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (scheme: ColorSchemeName) => void;
};

const ThemeContext = React.createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? 'light';
  const [override, setOverride] = React.useState<ColorSchemeName | null>(null);

  // Load persisted override
  React.useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === 'light' || val === 'dark') {
        setOverride(val);
      }
    });
  }, []);

  const colorScheme: ColorSchemeName = override ?? systemScheme;

  const setTheme = React.useCallback(async (scheme: ColorSchemeName) => {
    setOverride(scheme);
    await AsyncStorage.setItem(THEME_KEY, scheme);
  }, []);

  const toggleTheme = React.useCallback(() => {
    const next: ColorSchemeName = colorScheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [colorScheme, setTheme]);

  const value = React.useMemo(
    () => ({ colorScheme, isDark: colorScheme === 'dark', toggleTheme, setTheme }),
    [colorScheme, toggleTheme, setTheme],
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
