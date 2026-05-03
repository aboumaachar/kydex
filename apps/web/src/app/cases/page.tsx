"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/i18n-provider';
import { getCases } from '../../lib/api';

export default function CasesPage() {
  const { formatNumber, t } = useI18n();
  const [cases, setCases] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [reviewQueueOnly, setReviewQueueOnly] = useState(false);

  useEffect(() => {
    const loadCases = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getCases({
          status: status || undefined,
          riskLevel: riskLevel || undefined,
          reviewQueue: reviewQueueOnly,
        });
        setCases(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load cases');
      } finally {
        setLoading(false);
      }
    };

    void loadCases();
  }, [status, riskLevel, reviewQueueOnly]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{t('cases.title')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('cases.description')}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm text-slate-700">
          <span>{t('cases.status')}</span>
          <select
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">{t('cases.allStatuses')}</option>
            <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
            <option value="ESCALATED_INTERNALLY">ESCALATED_INTERNALLY</option>
            <option value="SIC_PACKAGE_PREPARED">SIC_PACKAGE_PREPARED</option>
            <option value="REPORTED_TO_SIC">REPORTED_TO_SIC</option>
            <option value="CLEARED">CLEARED</option>
            <option value="REJECTED_BLOCKED">REJECTED_BLOCKED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </label>
        <label className="text-sm text-slate-700">
          <span>{t('cases.risk')}</span>
          <select
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={riskLevel}
            onChange={(event) => setRiskLevel(event.target.value)}
          >
            <option value="">{t('cases.allRiskLevels')}</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={reviewQueueOnly}
            onChange={(event) => setReviewQueueOnly(event.target.checked)}
          />
          <span>{t('cases.reviewQueueOnly')}</span>
        </label>
      </div>
      <div className="mt-5 space-y-3">
        {loading ? <p className="text-sm text-slate-600">{t('cases.loading')}</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {!loading && !error && cases.length === 0 ? (
          <p className="text-sm text-slate-600">{t('cases.empty')}</p>
        ) : null}
        {cases.map((item) => {
          const caseId = asScalarText(item.id, 'unknown');
          const status = asScalarText(item.status, 'UNKNOWN');
          const risk = asScalarText(item.riskLevel, 'UNKNOWN');
          return (
            <div key={caseId} className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{t('cases.case')} {formatNumber(Number.isFinite(Number(caseId)) ? Number(caseId) : Number.NaN) || caseId}</p>
                  <p className="text-xs text-slate-600">{t('cases.status')}: {status}</p>
                </div>
                <p className="text-xs font-semibold text-slate-700">{t('cases.risk')}: {risk}</p>
              </div>
              <Link href={`/cases/${caseId}`} className="mt-2 inline-block text-sm text-slate-900 underline">
                {t('cases.open')}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function asScalarText(value: unknown, fallback: string) {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  return fallback;
}
