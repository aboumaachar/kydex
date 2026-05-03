"use client";

import { useI18n, type Language } from '../i18n/i18n-provider';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-2 py-1 text-xs text-slate-700 shadow-sm">
      <span className="font-semibold text-slate-500">{t('common.language')}</span>
      {(['en', 'ar'] as Language[]).map((nextLanguage) => {
        const active = language === nextLanguage;
        return (
          <button
            key={nextLanguage}
            type="button"
            onClick={() => setLanguage(nextLanguage)}
            className={`rounded-full px-3 py-1 transition ${active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {nextLanguage === 'ar' ? t('common.arabic') : t('common.english')}
          </button>
        );
      })}
    </div>
  );
}