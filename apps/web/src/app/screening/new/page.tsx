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

const ACTIVE_SCREENING_SOURCES = ['OFAC'] as const;

export default function NewScreeningPage() {
  const { formatNumber, t, tEnum } = useI18n();
  // Remove demo-prefilled values: start with empty inputs
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [clientReference, setClientReference] = useState('');
  const [liveVerify, setLiveVerify] = useState(true);
  // Default to ALL sources ("جميع المصادر") per requirement
  const [mode, setMode] = useState<'SELECTED' | 'ALL'>('ALL');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [sourceSummaries, setSourceSummaries] = useState<DataSourceSummary[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScreeningResponse | null>(null);
  const [sourceCheck, setSourceCheck] = useState<OfacScreeningSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  // Filters and refinement state (appear after results)
  const [filterSource, setFilterSource] = useState<string | 'ALL'>('ALL');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('');
  const [minConfidence, setMinConfidence] = useState<number | null>(null);
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>('');
  const [searchWithinResults, setSearchWithinResults] = useState<string>('');
  const [sortBy, setSortBy] = useState<'confidence' | 'risk' | 'source'>('confidence');

  useEffect(() => {
    const loadSources = async () => {
      try {
        const sources = await getDataSources();
        // Keep full source list so we can show inactive sources as disabled/not available
        setSourceSummaries(sources);
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
        status: source.status,
        health: source.syncStatus?.syncHealth ?? 'UNKNOWN',
        lastSyncAt: source.syncStatus?.lastSuccessfulSyncAt ?? source.currentActiveVersion?.importedAt ?? '',
        activeVersion: source.syncStatus?.currentActiveVersion ?? source.currentActiveVersion?.versionLabel ?? '',
        staleWarning: source.syncStatus?.staleWarning ?? null,
      })),
    [sourceSummaries],
  );

  const canSubmit = useMemo(() => fullName.trim().length >= 2, [fullName]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filteredMatches = useMemo(() => {
    if (!result) return [];
    const raw = result.matches ?? [];
    let list = Array.isArray(raw) ? raw.slice() : [];

    if (searchWithinResults && searchWithinResults.trim().length > 0) {
      const needle = searchWithinResults.trim().toLowerCase();
      list = list.filter((m) => JSON.stringify(m).toLowerCase().includes(needle));
    }

    if (filterSource && filterSource !== 'ALL') {
      list = list.filter((m) => ((m as any).sourceCode || (m as any).source || '').toString() === filterSource);
    }

    if (filterRiskLevel && filterRiskLevel.length > 0) {
      list = list.filter((m) => ((m as any).riskLevel || '').toString() === filterRiskLevel);
    }

    if (minConfidence != null) {
      list = list.filter((m) => {
        const c = typeof (m as any).confidence === 'number' ? (m as any).confidence : (m as any).score ?? 0;
        if (c <= 1) return c * 100 >= minConfidence;
        return c >= minConfidence;
      });
    }

    if (matchTypeFilter && matchTypeFilter.length > 0) {
      list = list.filter((m) => (((m as any).matchType || (m as any).type || '') as string).toString().toLowerCase().includes(matchTypeFilter.toLowerCase()));
    }

    if (sortBy === 'confidence') {
      list.sort((a, b) => ((b as any).confidence ?? (b as any).score ?? 0) - ((a as any).confidence ?? (a as any).score ?? 0));
    }

    if (sortBy === 'risk') {
      const rank = (r: any) => (r === 'HIGH' ? 3 : r === 'MEDIUM' ? 2 : r === 'LOW' ? 1 : 0);
      list.sort((a, b) => rank((b as any).riskLevel) - rank((a as any).riskLevel));
    }

    if (sortBy === 'source') {
      list.sort((a, b) => String((a as any).sourceCode || (a as any).source || '').localeCompare(String((b as any).sourceCode || (b as any).source || '')));
    }

    return list;
  }, [result, searchWithinResults, filterSource, filterRiskLevel, minConfidence, matchTypeFilter, sortBy]);

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
    if (fullName.trim().length < 2) {
      setError('يرجى إدخال اسم أو جزء من الاسم للبحث.');
      return;
    }
    setLoading(true);
    setSourceCheck(null);

    try {
      const query = fullName.trim();
      // Keep UI label as "ALL", but always send concrete active source codes to the API.
      const normalizedSources = resolveActiveSourcesForApi(mode, selectedSources);

      const liveResponse = await runDashboardScreeningSearch({
        query,
        screeningType: 'ofac',
        source: 'dashboard',
        liveVerify,
        sources: normalizedSources,
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

      // Ensure payload sends real source codes, not UI placeholder 'ALL'
      payload.sources = normalizedSources;

      const response = await runScreening(payload);
      setResult(response);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'تعذر تنفيذ الفحص. يرجى المحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">فحص الأسماء</h1>
      <p className="mt-2 text-sm text-slate-600">أدخل اسماً أو جزءاً من الاسم لبدء الفحص عبر مصادر KYDEX.</p>
      <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {t('common.currentFinalDecision')}
      </p>

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <input
            className="rounded-lg border border-slate-300 px-4 py-3 text-right"
            placeholder="أدخل الاسم الكامل أو جزءاً من الاسم"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            aria-label="بحث الاسم"
          />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">المصادر</label>
              <select
                className="rounded border border-slate-300 px-2 py-1 text-sm"
                value={mode === 'ALL' ? 'ALL' : 'SELECTED'}
                onChange={(e) => setMode(e.target.value === 'ALL' ? 'ALL' : 'SELECTED')}
              >
                <option value="ALL">جميع المصادر</option>
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value="SELECTED" disabled={opt.health !== 'OK'}>
                    {opt.label} {opt.health !== 'OK' ? '— غير مفعّل حالياً' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={loading || !canSubmit} className="rounded-lg bg-slate-900 px-4 py-2 text-white">
                {loading ? t('screening.running') : 'تشغيل الفحص'}
              </button>
              <button
                type="button"
                onClick={() => {
                  // Clear/reset behavior per requirements
                  setFullName('');
                  setDateOfBirth('');
                  setNationality('');
                  setDocumentNumber('');
                  setTransactionType('');
                  setClientReference('');
                  setMode('ALL');
                  setSelectedSources([]);
                  setLiveVerify(true);
                  setResult(null);
                  setSourceCheck(null);
                    setError('');
                    setShowAdvanced(false);
                    // clear filters/refinements
                    setFilterSource('ALL');
                    setFilterRiskLevel('');
                    setMinConfidence(null);
                    setMatchTypeFilter('');
                    setSearchWithinResults('');
                    setSortBy('confidence');
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 bg-white"
              >
                مسح البيانات
              </button>
            </div>
          </div>

          <div className="mt-2 text-sm text-slate-600">
            <div className="font-medium">أمثلة للبحث</div>
            <div className="mt-1 flex gap-2">
              {['محمد علي حسن', 'Hassan Ali', 'Smith'].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setFullName(ex)}
                  className="rounded-full border px-3 py-1 text-sm bg-white"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced options collapsed */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="mt-4 text-sm text-slate-700 underline"
          >
            خيارات متقدمة
          </button>

          {showAdvanced ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input
                className="rounded-lg border border-slate-300 px-4 py-2 text-right"
                placeholder={t('screening.dateOfBirth')}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 px-4 py-2 text-right"
                placeholder={t('screening.nationality')}
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 px-4 py-2 text-right"
                placeholder={t('screening.documentNumber')}
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 px-4 py-2 text-right"
                placeholder={t('screening.transactionType')}
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 px-4 py-2 text-right md:col-span-2"
                placeholder={t('screening.clientReference')}
                value={clientReference}
                onChange={(e) => setClientReference(e.target.value)}
              />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={liveVerify} onChange={(e) => setLiveVerify(e.target.checked)} />
                <span className="text-sm">تم التحقق المباشر من المصدر</span>
              </label>
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </form>

      {result ? (
        <div className="mt-6 space-y-3">
          {sourceCheck ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-slate-700">نمط المصدر:</span>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  {formatSourceMode(sourceCheck.sourceMode)}
                </span>
                <span className="text-sm text-slate-700">
                  تم التحقق المباشر: <span className="font-semibold">{sourceCheck.liveSourceChecked ? 'نعم' : 'لا'}</span>
                </span>
                <span className="text-sm text-slate-700">
                  تم استخدام النسخة المحلية الاحتياطية: <span className="font-semibold">{sourceCheck.usedFallback ? 'نعم' : 'لا'}</span>
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

          {/* Filters / refinement shown after results */}
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold">تصفية النتائج</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <input
                placeholder="بحث داخل النتائج"
                value={searchWithinResults}
                onChange={(e) => setSearchWithinResults(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-right"
              />
              <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="rounded border px-2 py-1">
                <option value="ALL">جميع المصادر</option>
                {sourceOptions.map((s) => (
                  <option key={s.value} value={s.value} disabled={s.status !== 'ACTIVE'}>
                    {s.label} {s.status !== 'ACTIVE' ? '— غير مفعّل حالياً' : ''}
                  </option>
                ))}
              </select>
              <select value={filterRiskLevel} onChange={(e) => setFilterRiskLevel(e.target.value)} className="rounded border px-2 py-1">
                <option value="">كل مستويات المخاطر</option>
                <option value="HIGH">مرتفع</option>
                <option value="MEDIUM">متوسط</option>
                <option value="LOW">منخفض</option>
              </select>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="text-sm">درجة الثقة أدنى:</label>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="مثال: 70"
                value={minConfidence ?? ''}
                onChange={(e) => setMinConfidence(e.target.value === '' ? null : Number(e.target.value))}
                className="rounded border px-2 py-1 w-24"
              />
              <input
                placeholder="نوع التطابق"
                value={matchTypeFilter}
                onChange={(e) => setMatchTypeFilter(e.target.value)}
                className="rounded border px-2 py-1"
              />
              <label className="ml-auto text-sm">ترتيب:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="rounded border px-2 py-1">
                <option value="confidence">الأعلى ثقة أولاً</option>
                <option value="risk">الأعلى خطورة أولاً</option>
                <option value="source">حسب المصدر</option>
              </select>
            </div>
            <p className="mt-3 text-sm text-slate-700">نتائج مطابقة معروضة: {filteredMatches.length}</p>
          </div>

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

function resolveActiveSourcesForApi(mode: 'SELECTED' | 'ALL', selectedSources: string[]) {
  if (mode === 'ALL' || selectedSources.some((value) => value.trim().toUpperCase() === 'ALL')) {
    return [...ACTIVE_SCREENING_SOURCES];
  }

  const normalized = selectedSources
    .map((value) => value.trim().toUpperCase())
    .filter((value) => value.length > 0 && value !== 'ALL');

  if (normalized.length === 0) {
    return [...ACTIVE_SCREENING_SOURCES];
  }

  return normalized;
}

function formatSourceMode(mode: string) {
  const normalized = mode ? mode.trim().toLowerCase() : '';
  if (normalized === 'live_verified') return 'تم التحقق المباشر';
  if (normalized === 'local_only') return 'فحص محلي فقط';
  if (normalized === 'local_fallback') return 'فحص عبر النسخة المحلية الاحتياطية';
  if (normalized === 'degraded') return 'منخفض التوافر';
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

  return 'نتائج KYDEX هي مخرجات مساعدة لاتخاذ القرار، ولا تُعد حكماً قانونياً نهائياً. يجب إجراء مراجعة مهنية قبل اتخاذ أي قرار قانوني أو امتثالي.';
}
