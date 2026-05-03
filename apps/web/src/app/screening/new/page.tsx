"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '../../../i18n/i18n-provider';
import {
  DataSourceSummary,
  DecisionFactor,
  OfacScreeningSearchResponse,
  ScreeningResponse,
  getDataSources,
  runDashboardScreeningSearch,
  runScreening,
} from '../../../lib/api';

export default function NewScreeningPage() {
  const { formatNumber, t, tEnum } = useI18n();
  const [fullName, setFullName] = useState('Mohammad Ali');
  const [dateOfBirth, setDateOfBirth] = useState('1985-01-01');
  const [nationality, setNationality] = useState('LB');
  const [documentNumber, setDocumentNumber] = useState('123456');
  const [transactionType, setTransactionType] = useState('POWER_OF_ATTORNEY');
  const [clientReference, setClientReference] = useState('TX-2026-0001');
  const [liveVerify, setLiveVerify] = useState(true);
  const [mode, setMode] = useState<'SELECTED' | 'ALL'>('SELECTED');
  const [selectedSources, setSelectedSources] = useState<string[]>(['OFAC']);
  const [sourceSummaries, setSourceSummaries] = useState<DataSourceSummary[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScreeningResponse | null>(null);
  const [sourceCheck, setSourceCheck] = useState<OfacScreeningSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSources = async () => {
      try {
        const sources = await getDataSources();
        setSourceSummaries(sources.filter((source) => source.status === 'ACTIVE'));
      } catch {
        setSourceSummaries([]);
      }
    };

    void loadSources();
  }, []);

  const sourceOptions = useMemo(
    () =>
      sourceSummaries.map((source) => ({
        value: source.code,
        label: source.name,
        health: source.syncStatus.syncHealth,
        lastSyncAt: source.syncStatus.lastSuccessfulSyncAt ?? source.currentActiveVersion?.importedAt ?? '',
        activeVersion: source.syncStatus.currentActiveVersion ?? source.currentActiveVersion?.versionLabel ?? '',
        staleWarning: source.syncStatus.staleWarning ?? null,
      })),
    [sourceSummaries],
  );

  const canSubmit = useMemo(() => fullName.trim().length >= 2, [fullName]);

  const onToggleSource = (source: string) => {
    setSelectedSources((previous) => {
      if (previous.includes(source)) {
        return previous.filter((entry) => entry !== source);
      }

      return [...previous, source];
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    setSourceCheck(null);

    try {
      const query = fullName.trim();
      const normalizedSources = mode === 'ALL' ? ['OFAC'] : selectedSources;

      const liveResponse = await runDashboardScreeningSearch({
        query,
        screeningType: 'ofac',
        source: 'dashboard',
        liveVerify,
        sources: normalizedSources.length > 0 ? normalizedSources : ['OFAC'],
        clientReference,
        dateOfBirth,
        nationality,
      });

      setSourceCheck(liveResponse);

      const payload: {
        fullName: string;
        query: string;
        screeningType: string;
        source: string;
        liveVerify: boolean;
        dateOfBirth?: string;
        nationality?: string;
        documentNumber?: string;
        transactionType?: string;
        clientReference?: string;
        sources?: string[];
      } = {
        fullName: query,
        query,
        screeningType: 'ofac',
        source: 'dashboard',
        liveVerify,
        dateOfBirth,
        nationality,
        documentNumber,
        transactionType,
        clientReference,
      };

      if (mode === 'ALL') {
        payload.sources = ['OFAC'];
      }

      if (mode === 'SELECTED') {
        payload.sources = selectedSources.length > 0 ? selectedSources : ['OFAC'];
      }

      const response = await runScreening(payload);
      setResult(response);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Screening failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{t('screening.newTitle')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('screening.newDescription')}</p>
      <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Screening output is decision support only. Final legal and compliance determinations require qualified human review.
      </p>
      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <input
          className="rounded-lg border border-slate-300 px-4 py-2"
          placeholder={t('screening.fullName')}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
        <input
          className="rounded-lg border border-slate-300 px-4 py-2"
          placeholder={t('screening.dateOfBirth')}
          value={dateOfBirth}
          onChange={(event) => setDateOfBirth(event.target.value)}
        />
        <input
          className="rounded-lg border border-slate-300 px-4 py-2"
          placeholder={t('screening.nationality')}
          value={nationality}
          onChange={(event) => setNationality(event.target.value)}
        />
        <input
          className="rounded-lg border border-slate-300 px-4 py-2"
          placeholder={t('screening.documentNumber')}
          value={documentNumber}
          onChange={(event) => setDocumentNumber(event.target.value)}
        />
        <input
          className="rounded-lg border border-slate-300 px-4 py-2"
          placeholder={t('screening.clientReference')}
          value={clientReference}
          onChange={(event) => setClientReference(event.target.value)}
        />
        <input
          className="rounded-lg border border-slate-300 px-4 py-2"
          placeholder={t('screening.transactionType')}
          value={transactionType}
          onChange={(event) => setTransactionType(event.target.value)}
        />

        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-800 md:col-span-2">
          <input
            type="checkbox"
            checked={liveVerify}
            onChange={(event) => setLiveVerify(event.target.checked)}
          />
          <span>Live verify source before screening</span>
        </label>

        <fieldset className="rounded-lg border border-slate-300 p-3 md:col-span-2">
          <legend className="px-2 text-xs font-semibold text-slate-600">{t('screening.sourceMode')}</legend>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="source-mode" checked={mode === 'SELECTED'} onChange={() => setMode('SELECTED')} />
              {' '}
              {t('screening.selectedMode')}
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="source-mode" checked={mode === 'ALL'} onChange={() => setMode('ALL')} />
              {' '}
              {t('screening.allMode')}
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-3 md:col-span-2">
          <legend className="px-2 text-xs font-semibold text-slate-600">{t('screening.searchScope')}</legend>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {sourceOptions.map((option) => (
              <div key={option.value} className="rounded-lg border border-slate-200 p-3">
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    aria-label={option.label}
                    checked={selectedSources.includes(option.value)}
                    onChange={() => onToggleSource(option.value)}
                    disabled={mode !== 'SELECTED'}
                  />
                  <span>
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-xs text-slate-500">{t('dataSources.activeVersion')}: {option.activeVersion || t('common.notAvailable')}</span>
                    <span className="block text-xs text-slate-500">{t('dataSources.lastSuccessfulSync')}: {option.lastSyncAt || t('common.notAvailable')}</span>
                    <span className="block text-xs text-slate-500">{t('dataSources.health')}: {option.health}</span>
                  </span>
                </label>
                {option.staleWarning ? <p className="mt-2 text-xs text-amber-700">{option.staleWarning}</p> : null}
              </div>
            ))}
          </div>
        </fieldset>

        {error ? <p className="text-sm text-rose-700 md:col-span-2">{error}</p> : null}
        <button
          disabled={loading || !canSubmit || (mode === 'SELECTED' && selectedSources.length === 0)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-70 md:col-span-2"
        >
          {loading ? t('screening.running') : t('screening.run')}
        </button>
      </form>

      {result ? (
        <div className="mt-6 space-y-3">
          {sourceCheck ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-slate-700">Source mode:</span>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  {formatSourceMode(sourceCheck.sourceMode)}
                </span>
                <span className="text-sm text-slate-700">
                  Live checked: <span className="font-semibold">{sourceCheck.liveSourceChecked ? 'Yes' : 'No'}</span>
                </span>
                <span className="text-sm text-slate-700">
                  Fallback used: <span className="font-semibold">{sourceCheck.usedFallback ? 'Yes' : 'No'}</span>
                </span>
              </div>
              {sourceCheck.warning ? (
                <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {sourceCheck.warning}
                </p>
              ) : null}
            </div>
          ) : null}

          {typeof result.caseLink === 'string' && result.caseLink.length > 0 ? (
            <p className="text-sm text-slate-700">
              {t('screening.linkedCase')}:{' '}
              <Link href={result.caseLink} className="underline">
                {getCaseLabel(result.caseId, result.caseLink)}
              </Link>
            </p>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-700">{t('screening.decision')}:</span>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                {tEnum('enums.decision', result.matchDecision ?? result.decision)}
              </span>
              <span className="text-sm text-slate-700">
                {t('caseDetail.confidence')}: <span className="font-semibold">{formatNumber(Math.round((result.confidence ?? result.decisionConfidence) * 100))}%</span>
              </span>
              <span className="text-sm text-slate-700">
                {t('caseDetail.recommendedAction')}: <span className="font-semibold">{tEnum('enums.recommendedAction', result.recommendedAction)}</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-700">{result.reasonSummary}</p>
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {getDecisionSupportDisclaimer(result.disclaimer)}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FactorList title={t('caseDetail.supportingFactors')} factors={result.supportingFactors} tone="support" emptyLabel={t('common.none')} />
              <FactorList title={t('caseDetail.weakeningFactors')} factors={result.weakeningFactors} tone="warning" emptyLabel={t('common.none')} />
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border border-slate-200 p-4 text-sm md:grid-cols-2">
            <p><span className="font-semibold">{t('screening.searchedSources')}:</span> {safeJson(result.searchedSources)}</p>
            <p><span className="font-semibold">{t('screening.usedLocalVersions')}:</span> {safeJson(result.usedLocalVersions)}</p>
            <p><span className="font-semibold">{t('common.riskLevel')}:</span> {safeJson(result.riskLevel ?? '-')}</p>
            <p><span className="font-semibold">{t('screening.matchesCount')}:</span> {formatNumber(result.matches.length)}</p>
          </div>

          {result.usedLocalVersions.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {result.usedLocalVersions.map((entry) => (
                <div key={`${entry.sourceCode}-${entry.versionId}`} className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{entry.sourceCode}</p>
                  <p>{t('dataSources.activeVersion')}: {entry.versionLabel}</p>
                  <p>{t('dataSources.lastSuccessfulSync')}: {entry.lastSyncAt ?? entry.importedAt ?? t('common.notAvailable')}</p>
                  <p>{t('dataSources.health')}: {entry.sourceHealth ?? t('common.notAvailable')}</p>
                  {entry.warning ? <p className="mt-2 text-amber-700">{entry.warning}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}

function formatSourceMode(mode: string) {
  const normalized = mode.trim().toLowerCase();
  if (normalized === 'live_verified') return 'Live verified';
  if (normalized === 'local_only') return 'Local only';
  if (normalized === 'local_fallback') return 'Local fallback';
  if (normalized === 'degraded') return 'Degraded';
  return mode;
}

function FactorList(props: Readonly<{
  title: string;
  factors: DecisionFactor[];
  tone: 'support' | 'warning';
  emptyLabel: string;
}>) {
  const { title, factors, tone, emptyLabel } = props;
  const borderTone = tone === 'support' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50';

  return (
    <section className={`rounded-lg border p-3 ${borderTone}`}>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {factors.length === 0 ? <p className="mt-2 text-sm text-slate-600">{emptyLabel}</p> : null}
      <div className="mt-2 space-y-2 text-sm text-slate-700">
        {factors.map((factor) => (
          <div key={`${title}-${factor.factor}`}>
            <p className="font-medium">{factor.factor}</p>
            <p>{factor.explanation}</p>
            <p className="text-xs text-slate-500">
              weight {factor.weight}
              {typeof factor.score === 'number' ? ` · score ${factor.score}` : ''}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[]';
  }
}

function getCaseLabel(caseId: unknown, caseLink: string) {
  if (
    typeof caseId === 'string' ||
    typeof caseId === 'number' ||
    typeof caseId === 'boolean' ||
    typeof caseId === 'bigint'
  ) {
    return String(caseId);
  }

  return caseLink;
}

function getDecisionSupportDisclaimer(disclaimer: unknown) {
  if (typeof disclaimer === 'string' && disclaimer.trim().length > 0) {
    return disclaimer;
  }

  return 'KYDEX screening outputs are decision-support signals and must be reviewed by an authorized professional before any legal or compliance action.';
}
