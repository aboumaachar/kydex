"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import ar from './ar.json';
import en from './en.json';

export type Language = 'en' | 'ar';

type Messages = typeof en;

type I18nContextValue = {
  language: Language;
  dir: 'ltr' | 'rtl';
  locale: string;
  isArabic: boolean;
  setLanguage: (language: Language) => void;
  t: (key: string, fallback?: string) => string;
  tEnum: (namespace: string, value: string | null | undefined) => string;
  formatDateTime: (value: string | number | Date | null | undefined) => string;
  formatNumber: (value: number) => string;
};

const STORAGE_KEY = 'kydex_language';
const MESSAGES: Record<Language, Messages> = { en, ar };

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const stored = globalThis.window?.localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') {
      setLanguage(stored);
      return;
    }

    const preferred = globalThis.window?.navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
    setLanguage(preferred);
  }, []);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }

    globalThis.window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.language = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(() => {
    const messages = MESSAGES[language];
    const fallbackMessages = MESSAGES.en;
    const locale = language === 'ar' ? 'ar-LB' : 'en-US';

    const resolve = (key: string, source: Messages) => key.split('.').reduce<unknown>((current, segment) => {
      if (current && typeof current === 'object' && segment in current) {
        return current[segment as keyof typeof current];
      }

      return undefined;
    }, source);

    return {
      language,
      dir: language === 'ar' ? 'rtl' : 'ltr',
      locale,
      isArabic: language === 'ar',
      setLanguage,
      t: (key, fallback) => {
        const current = resolve(key, messages);
        if (typeof current === 'string') {
          return current;
        }

        const fallbackValue = resolve(key, fallbackMessages);
        if (typeof fallbackValue === 'string') {
          return fallbackValue;
        }

        return fallback ?? key;
      },
      tEnum: (namespace, value) => {
        if (!value) {
          return '';
        }

        const key = `${namespace}.${value}`;
        const current = resolve(key, messages);
        if (typeof current === 'string') {
          return current;
        }

        const fallbackValue = resolve(key, fallbackMessages);
        return typeof fallbackValue === 'string' ? fallbackValue : value;
      },
      formatDateTime: (value) => {
        if (!value) {
          return '';
        }

        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) {
          return String(value);
        }

        return new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date);
      },
      formatNumber: (value) => new Intl.NumberFormat(locale).format(value),
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside LanguageProvider');
  }

  return context;
}