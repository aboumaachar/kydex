"use client";

import { useI18n } from '../../../i18n/i18n-provider';

export default function ScreeningHistoryPage() {
  const { t } = useI18n();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{t('screening.historyTitle')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('screening.historyDescription')}</p>
      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">{t('screening.queryId')}</th>
              <th className="px-4 py-2">{t('screening.name')}</th>
              <th className="px-4 py-2">{t('common.riskLevel')}</th>
              <th className="px-4 py-2">{t('screening.timestamp')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-2">{t('screening.noData')}</td>
              <td className="px-4 py-2">-</td>
              <td className="px-4 py-2">-</td>
              <td className="px-4 py-2">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
