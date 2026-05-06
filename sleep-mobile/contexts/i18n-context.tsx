import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { en } from '../locales/en';
import { kz } from '../locales/kz';
import { ru } from '../locales/ru';
import { StorageKeys } from '@/constants/storage';

export type Language = 'ru' | 'en' | 'kz';

const LANG_KEY = StorageKeys.LANGUAGE;

const TRANSLATIONS = { ru, en, kz };

export const LANG_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'kz', label: 'Қазақша', flag: '🇰🇿' },
];

function resolvePath(obj: Record<string, any>, path: string): unknown {
  return path.split('.').reduce((acc: any, key) => acc?.[key], obj);
}

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Translates a single string key. Returns the key itself if missing. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Translates a key whose value is a string array (e.g. lists of tips). Returns [] if missing. */
  tArray: (key: string) => string[];
};

const I18nContext = createContext<I18nContextType>({
  language: 'ru',
  setLanguage: () => {},
  t: (key) => key,
  tArray: () => [],
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>('ru');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v) => {
      if (v === 'ru' || v === 'en' || v === 'kz') setLang(v);
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLang(lang);
    AsyncStorage.setItem(LANG_KEY, lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let val = resolvePath(TRANSLATIONS[language] as any, key);
    // Fallback to Russian if missing in active language.
    if (val === undefined) val = resolvePath(TRANSLATIONS.ru as any, key);
    if (typeof val !== 'string') return key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        val = (val as string).replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return val as string;
  };

  const tArray = (key: string): string[] => {
    let val = resolvePath(TRANSLATIONS[language] as any, key);
    if (val === undefined) val = resolvePath(TRANSLATIONS.ru as any, key);
    return Array.isArray(val) ? (val as string[]) : [];
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, tArray }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useTranslation = () => useContext(I18nContext);
