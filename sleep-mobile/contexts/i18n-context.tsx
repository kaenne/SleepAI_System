import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { en } from '../locales/en';
import { kz } from '../locales/kz';
import { ru } from '../locales/ru';

export type Language = 'ru' | 'en' | 'kz';

const LANG_KEY = 'sleepai_language';

const TRANSLATIONS = { ru, en, kz };

export const LANG_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'kz', label: 'Қазақша', flag: '🇰🇿' },
];

function getNestedValue(obj: Record<string, any>, path: string): string {
  const val = path.split('.').reduce((acc: any, key) => acc?.[key], obj);
  return typeof val === 'string' ? val : path;
}

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType>({
  language: 'ru',
  setLanguage: () => {},
  t: (key) => key,
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
    let text = getNestedValue(TRANSLATIONS[language] as any, key);
    // fallback to Russian if key not found in current language
    if (text === key) text = getNestedValue(TRANSLATIONS.ru as any, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useTranslation = () => useContext(I18nContext);
