"use client";

import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/i18n-provider';
import {
  DataSourceSummary,
  DecisionFactor,
  OfacScreeningSearchResponse,
  ScreenRequest,
  ScreeningMatch,
  ScreeningResponse,
  getDataSources,
  runDashboardScreeningSearch,
  runScreening,
} from '../../../lib/api';

const ACTIVE_SCREENING_SOURCES = ['LEBANON_NATIONAL_LIST', 'OFAC'] as const;

type ScreeningMode = 'SELECTED' | 'ALL';
type ScreeningSort = 'confidence' | 'risk' | 'source';
type FormatNumber = (value: number) => string;
type Translate = (key: string) => string;
type TranslateEnum = (key: string, value?: string) => string;

type MatchRecord = ScreeningMatch &
  Record<string, unknown> & {
    alias?: string;
    aliasMatchedName?: string;
    category?: string;
    confidence?: number;
    countryMatch?: boolean | null;
    dateOfBirth?: string | null;
    entityId?: string;
    entityName?: string;
    id?: string;
    identifiers?: unknown[];
    ids?: unknown[];
    isAdmin?: boolean;
    list?: string;
    listName?: string;
    matchedAliasName?: string;
    missingFields?: string[];
    name?: string;
    primaryName?: string;
    program?: string;
    reasonSummary?: string;
    reviewReason?: string;
    simpleReason?: string;
    simplifiedArabicReason?: string | null;
    sourceCode?: string;
    sourceVersionLabel?: string;
    version?: string;
    versionLabel?: string;
    viewerIsAdmin?: boolean;
  };

type FilterOptions = {
  filterRiskLevel: string;
  filterSource: string;
  matchTypeFilter: string;
  minConfidence: number | null;
  searchWithinResults: string;
  sortBy: ScreeningSort;
};

function resolveActiveSourcesForApi(mode: ScreeningMode, selectedSources: string[]) {
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

function mapFactorLabel(code: string) {
  if (!code) return code;

  const key = String(code).toUpperCase();
  return (
    {
      ALIAS_SIMILARITY: 'تشابه مع اسم بديل',
      TRANSLITERATION_MATCH: 'تطابق بعد التحويل الصوتي',
      SOURCE_SEVERITY: 'حساسية المصدر',
      MISSING_DOB: 'تاريخ الميلاد غير متوفر',
      DATA_COMPLETENESS: 'نقص في بيانات التحقق',
      NAME_SCORE: 'درجة التشابه الاسمي',
      ALIAS_SCORE: 'درجة تطابق الاسم البديل',
      NATIONALITY_MATCH: 'تطابق الجنسية',
      DOB_MATCH: 'تطابق تاريخ الميلاد',
      DOCUMENT_MATCH: 'تطابق رقم المستند',
    } as Record<string, string>
  )[key] ?? code;
}

function mapDecisionFactors(factors: DecisionFactor[]) {
  return factors.map((factor) => ({
    ...factor,
    factor: mapFactorLabel(factor.factor),
  }));
}

function firstNonEmptyText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function getListedName(match: Partial<MatchRecord>) {
  return firstNonEmptyText(match.matchedName, match.primaryName, match.listedName, match.name, match.entityName) ?? 'غير متوفر';
}

function getMatchedAlias(match: Partial<MatchRecord>) {
  return firstNonEmptyText(match.matchedAlias, match.alias, match.aliasMatchedName, match.matchedAliasName) ?? '';
}

function getSourceLabel(match: Partial<MatchRecord>) {
  const raw = firstNonEmptyText(match.source, match.sourceCode) ?? '';
  const normalized = raw.trim().toUpperCase();
  if (normalized === 'LEBANON_NATIONAL_LIST') return 'اللائحة الوطنية';
  if (normalized === 'OFAC' || normalized === 'OFAC_SDN') return 'OFAC';
  return raw || 'غير متوفر';
}

function getListLabel(match: Partial<MatchRecord>) {
  return firstNonEmptyText(match.listName, match.list, match.source) ?? 'غير متوفر';
}

function getSourceVersion(match: Partial<MatchRecord>) {
  return firstNonEmptyText(match.sourceVersion, match.sourceVersionLabel, match.versionLabel, match.version) ?? 'غير متوفر';
}

function hasVisibleMatchEvidence(match: Partial<MatchRecord>) {
  const hasExplainedEvidence = Boolean(
    match.matchedField && (match.matchEvidence || match.simpleReasonArabic || match.simplifiedArabicReason),
  );
  const hasNameScore = Number(match.nameScore || 0) > 0.35;
  const hasAliasEvidence = Number(match.aliasScore || 0) > 0 && Boolean(getMatchedAlias(match));
  const hasTokenEvidence = Number(match.tokenOverlap || match.arabicTokenOverlap || 0) > 0 || Boolean(match.matchedToken);
  const hasIdentifierEvidence = Boolean(match.dobMatched || match.docMatched || match.nationalityMatched);

  return hasExplainedEvidence || hasNameScore || hasAliasEvidence || hasTokenEvidence || hasIdentifierEvidence;
}

function translateRiskLevel(risk?: string) {
  const key = String(risk ?? '').toUpperCase();
  return ({
    POSSIBLE_MATCH: 'تطابق محتمل',
    MEDIUM: 'متوسط',
    HIGH: 'مرتفع',
    LOW: 'منخفض',
    ESCALATE_FOR_REVIEW: 'تصعيد للمراجعة',
  } as Record<string, string>)[key] ?? risk ?? 'غير متوفر';
}

function simplifyReasonArabic(reason: unknown, match: Partial<MatchRecord>) {
  if (typeof match.simplifiedArabicReason === 'string' && match.simplifiedArabicReason.trim().length > 0) {
    return match.simplifiedArabicReason;
  }

  if (typeof match.simpleReasonArabic === 'string' && match.simpleReasonArabic.trim().length > 0) {
    return match.simpleReasonArabic;
  }

  if (!reason || typeof reason !== 'string') {
    return match.simpleReasonArabic || 'غير متوفر';
  }

  const lower = reason.toLowerCase();
  if (lower.includes('missing') && (lower.includes('date') || lower.includes('dob') || lower.includes('birth'))) {
    return 'يوجد تشابه اسمي، لكن غياب تاريخ الميلاد ورقم المستند يمنع اعتبار النتيجة مؤكدة ويتطلب مراجعة يدوية.';
  }

  if (lower.includes('high name') || lower.includes('name similarity') || lower.includes('similarity')) {
    return 'يوجد تشابه اسمي قوي، يرجى التحقق من بيانات الميلاد والوثائق.';
  }

  return match.simpleReason || match.reason || reason;
}

function getRiskRank(risk: unknown) {
  switch (String(risk ?? '').toUpperCase()) {
    case 'HIGH':
      return 3;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 1;
    default:
      return 0;
  }
}

function getMatchNumericScore(match: MatchRecord) {
  if (typeof match.confidence === 'number') {
    return match.confidence;
  }

  if (typeof match.score === 'number') {
    return match.score;
  }

  return 0;
}

function getMatchScorePercent(match: MatchRecord) {
  if (typeof match.confidence === 'number') {
    return Math.round(match.confidence * 100);
  }

  if (typeof match.score === 'number') {
    return Math.round(match.score * 100);
  }

  return null;
}

function getMatchFieldLabel(field: unknown) {
  if (field === 'alias') {
    return 'اسم بديل';
  }

  if (field === 'primaryName') {
    return 'الاسم المدرج';
  }

  return 'غير متوفر';
}

function getBooleanMatchLabel(value: boolean) {
  return value ? 'نعم' : 'لا';
}

function getSourceStatusSuffix(isActive: boolean) {
  return isActive ? '' : '— غير مفعّل حالياً';
}

function getMatchKey(match: MatchRecord) {
  const entityId = String(match.entityId || match.id || getListedName(match));
  return `${getSourceLabel(match)}-${entityId}-${String(match.matchedField || 'match')}`;
}

function hasAdminDebugAccess(result: ScreeningResponse & Partial<MatchRecord>) {
  const maybeWindow = typeof globalThis.window === 'undefined'
    ? undefined
    : (globalThis.window as Window & { __KYDEX_IS_ADMIN?: boolean });

  return Boolean(
    result.viewerIsAdmin ||
      result.isAdmin ||
      maybeWindow?.__KYDEX_IS_ADMIN ||
      process.env.NEXT_PUBLIC_KYDEX_DEBUG === 'true',
  );
}

function computeFilteredMatches(result: ScreeningResponse | null, filters: FilterOptions) {
  if (!result) {
    return [] as MatchRecord[];
  }

  let list = (result.matches ?? []).map((match) => match as MatchRecord);

  list = list.filter((match) => hasVisibleMatchEvidence(match));

  if (filters.searchWithinResults.trim().length > 0) {
    const needle = filters.searchWithinResults.trim().toLowerCase();
    list = list.filter((match) => JSON.stringify(match).toLowerCase().includes(needle));
  }

  if (filters.filterSource !== 'ALL') {
    list = list.filter((match) => String(match.sourceCode || match.source || '') === filters.filterSource);
  }

  if (filters.filterRiskLevel.length > 0) {
    list = list.filter((match) => String(match.riskLevel || '') === filters.filterRiskLevel);
  }

  if (filters.minConfidence != null) {
    list = list.filter((match) => {
      const confidence = getMatchNumericScore(match);
      if (confidence <= 1) {
        return confidence * 100 >= filters.minConfidence!;
      }

      return confidence >= filters.minConfidence!;
    });
  }

  if (filters.matchTypeFilter.length > 0) {
    const needle = filters.matchTypeFilter.toLowerCase();
    list = list.filter((match) => String(match.classification || match.candidateClassification || '').toLowerCase().includes(needle));
  }

  if (filters.sortBy === 'confidence') {
    list.sort((left, right) => getMatchNumericScore(right) - getMatchNumericScore(left));
  }

  if (filters.sortBy === 'risk') {
    list.sort((left, right) => getRiskRank(right.riskLevel) - getRiskRank(left.riskLevel));
  }

  if (filters.sortBy === 'source') {
    list.sort((left, right) => getSourceLabel(left).localeCompare(getSourceLabel(right)));
  }

  return list;
}

function SearchSummaryCard(props: Readonly<{
  formatNumber: FormatNumber;
  fullName: string;
  result: ScreeningResponse;
  sourceCheck: OfacScreeningSearchResponse | null;
}>) {
  const { formatNumber, fullName, result, sourceCheck } = props;
  const confidence = result.confidence ?? result.decisionConfidence;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-lg font-semibold">نتيجة البحث عن: {fullName}</h2>
      <p className="mt-1 text-sm text-slate-700">تم العثور على {formatNumber(result.matches.length)} نتائج محتملة</p>
      <p className="mt-2 text-sm text-slate-700">{(result.matchDecision || result.decision) === 'MATCH' ? 'قد يكون هناك تطابق' : 'لم يتم تأكيد أي تطابق نهائي آلياً'}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{formatSourceMode(sourceCheck?.sourceMode ?? '')}</span>
        <span className="text-sm">التحقق المباشر: <strong>{sourceCheck?.liveSourceChecked ? 'نعم' : 'لا'}</strong></span>
        <span className="text-sm">استخدام النسخة الاحتياطية: <strong>{sourceCheck?.usedFallback ? 'نعم' : 'لا'}</strong></span>
        <span className="text-sm">أعلى درجة: <strong>{formatNumber(Math.round(confidence * 100))}%</strong></span>
        {result.caseId !== undefined ? <span className="text-sm">معرف التدقيق: <strong>{String(result.caseId)}</strong></span> : null}
      </div>
    </div>
  );
}

function MatchCard(props: Readonly<{
  match: MatchRecord;
  onSelect: (match: MatchRecord) => void;
}>) {
  const { match, onSelect } = props;
  const listedName = getListedName(match);
  const matchedAlias = getMatchedAlias(match) || null;
  const scoreNum = getMatchScorePercent(match);
  const score = scoreNum ?? '-';
  const risk = translateRiskLevel(match.riskLevel);
  const classification = String(match.classification || match.candidateClassification || 'غير متوفر');
  const reason = simplifyReasonArabic(match.simpleReason || match.reasonSummary || match.reason, match);
  const appearanceReason = match.simpleReasonArabic || match.matchEvidence || reason;
  const nationalityMatch = match.nationalityMatched ?? match.countryMatch ?? null;
  const dobMatch = match.dobMatched ?? (match.dateOfBirth ? false : null);
  const documentMatch = match.docMatched ?? null;
  const programOrCategory = match.program || match.category || null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-700">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="text-sm text-slate-500">الاسم المدرج</div>
          <div className="text-lg font-semibold text-slate-900">{listedName}</div>
          {matchedAlias ? <div className="text-sm text-slate-600">الاسم البديل المطابق: {matchedAlias}</div> : null}
          <div className="mt-2 text-sm">المصدر: {getSourceLabel(match)} · اللائحة: {getListLabel(match)} · نسخة المصدر: {getSourceVersion(match)}</div>

          <div className="mt-2 grid gap-1 text-sm text-slate-700">
            {appearanceReason ? <div><strong>سبب الظهور:</strong> {appearanceReason}</div> : null}
            {reason ? <div><strong>السبب المختصر:</strong> {reason}</div> : null}
            {match.matchedField ? <div><strong>حقل المطابقة:</strong> {getMatchFieldLabel(match.matchedField)}</div> : null}
            {match.matchedToken ? <div><strong>المقطع المطابق:</strong> {match.matchedToken}</div> : null}
            {nationalityMatch === null ? null : <div><strong>تطابق الجنسية:</strong> {getBooleanMatchLabel(nationalityMatch)}</div>}
            {dobMatch === null ? null : <div><strong>تطابق تاريخ الميلاد:</strong> {getBooleanMatchLabel(dobMatch)}</div>}
            {documentMatch === null ? null : <div><strong>تطابق رقم المستند:</strong> {getBooleanMatchLabel(documentMatch)}</div>}
            {programOrCategory ? <div><strong>البرنامج/الفئة:</strong> {programOrCategory}</div> : null}
            {match.identifiers && match.identifiers.length > 0 ? <div><strong>معرفات متاحة:</strong> {safeJson(match.identifiers)}</div> : null}
          </div>
        </div>

        <div className="mt-3 flex flex-col items-end gap-2 text-right md:mt-0 md:pl-4">
          <div className="text-sm">درجة التشابه: <strong>{score}%</strong></div>
          <div className="text-sm">مستوى المخاطر: <strong>{risk}</strong></div>
          <div className="text-sm">التصنيف: <strong>{classification}</strong></div>
          {scoreNum !== null && scoreNum < 50 ? <div className="text-xs text-amber-700">تشابه ضعيف يحتاج إلى تحقق</div> : null}
          <button type="button" onClick={() => onSelect(match)} className="mt-2 rounded bg-slate-900 px-3 py-1 text-xs text-white">عرض التفاصيل</button>
        </div>
      </div>
    </div>
  );
}

function MatchDetailDialog(props: Readonly<{
  match: MatchRecord;
  onClose: () => void;
}>) {
  const { match, onClose } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
      <button type="button" aria-label="إغلاق التفاصيل" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-lg bg-white p-6 text-right">
        <div className="flex items-start justify-between">
          <h4 className="text-lg font-semibold">تفاصيل النتيجة</h4>
          <button type="button" onClick={onClose} className="text-sm text-slate-600">إغلاق</button>
        </div>
        <div className="mt-3 grid gap-2">
          <div><strong>الاسم المدرج:</strong> {getListedName(match)}</div>
          <div><strong>الاسم البديل المطابق:</strong> {getMatchedAlias(match) || 'غير متوفر'}</div>
          <div><strong>حقل المطابقة:</strong> {getMatchFieldLabel(match.matchedField)}</div>
          <div><strong>المقطع المطابق:</strong> {match.matchedToken || 'غير متوفر'}</div>
          <div><strong>مصدر/لائحة:</strong> {getSourceLabel(match)} / {getListLabel(match)}</div>
          <div><strong>نسخة المصدر:</strong> {getSourceVersion(match)}</div>
          <div><strong>معرف الكيان:</strong> {match.entityId || match.id || 'غير متوفر'}</div>
          <div><strong>المعرفات:</strong> {safeJson(match.identifiers ?? match.ids ?? [])}</div>
          <div><strong>سبب الظهور:</strong> {match.matchEvidence || match.simpleReasonArabic || 'غير متوفر'}</div>
          <div><strong>السبب المختصر:</strong> {simplifyReasonArabic(match.simpleReason || match.reason || '', match)}</div>
          <div><strong>ماذا ينقص:</strong> {match.missingFields ? match.missingFields.join(', ') : 'غير متوفر'}</div>
          <div><strong>لماذا تتطلب مراجعة يدوية:</strong> {match.reviewReason || 'غير متوفر'}</div>
        </div>
      </div>
    </div>
  );
}

function DecisionPanel(props: Readonly<{
  formatNumber: FormatNumber;
  result: ScreeningResponse;
  tEnum: TranslateEnum;
}>) {
  const { formatNumber, result, tEnum } = props;
  const confidence = result.confidence ?? result.decisionConfidence;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium">تقييم KYDEX للنتائج</div>
          <div className="mt-2 text-sm">القرار: <strong>{tEnum('enums.decision', result.matchDecision ?? result.decision)}</strong></div>
          <div className="text-sm">درجة الثقة: <strong>{formatNumber(Math.round(confidence * 100))}%</strong></div>
          <div className="text-sm">الإجراء الموصى به: <strong>{tEnum('enums.recommendedAction', result.recommendedAction)}</strong></div>
        </div>
        <div className="text-sm text-slate-700">{result.reasonSummary}</div>
      </div>
      <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">{getDecisionSupportDisclaimer(result.disclaimer)}</p>
    </div>
  );
}

function ScreeningResults(props: Readonly<{
  filteredMatches: MatchRecord[];
  formatNumber: FormatNumber;
  fullName: string;
  onCloseMatch: () => void;
  onSelectMatch: (match: MatchRecord) => void;
  result: ScreeningResponse;
  selectedMatch: MatchRecord | null;
  setShowDebugCollapsed: Dispatch<SetStateAction<boolean>>;
  setShowFactorsCollapsed: Dispatch<SetStateAction<boolean>>;
  showDebugCollapsed: boolean;
  showFactorsCollapsed: boolean;
  sourceCheck: OfacScreeningSearchResponse | null;
  t: Translate;
  tEnum: TranslateEnum;
}>) {
  const {
    filteredMatches,
    formatNumber,
    fullName,
    onCloseMatch,
    onSelectMatch,
    result,
    selectedMatch,
    setShowDebugCollapsed,
    setShowFactorsCollapsed,
    showDebugCollapsed,
    showFactorsCollapsed,
    sourceCheck,
    t,
    tEnum,
  } = props;
  const supportingFactors = mapDecisionFactors(result.supportingFactors || []);
  const weakeningFactors = mapDecisionFactors(result.weakeningFactors || []);
  const showDebugContent = !showDebugCollapsed && hasAdminDebugAccess(result as ScreeningResponse & Partial<MatchRecord>);

  return (
    <div className="mt-6 space-y-3">
      <SearchSummaryCard fullName={fullName} formatNumber={formatNumber} result={result} sourceCheck={sourceCheck} />

      <div className="mt-4">
        <h3 className="text-lg font-semibold">النتائج المحتملة</h3>
        <div className="mt-3 space-y-3">
          {filteredMatches.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-700">لم يتم العثور على نتائج محتملة في المصادر المحددة.</div>
          ) : (
            filteredMatches.map((match) => (
              <MatchCard key={getMatchKey(match)} match={match} onSelect={onSelectMatch} />
            ))
          )}
        </div>
      </div>

      {selectedMatch ? <MatchDetailDialog match={selectedMatch} onClose={onCloseMatch} /> : null}

      <DecisionPanel formatNumber={formatNumber} result={result} tEnum={tEnum} />

      <div className="mt-2">
        <button type="button" onClick={() => setShowFactorsCollapsed((value) => !value)} className="text-sm underline">لماذا أعطى KYDEX هذا التقييم؟</button>
        {showFactorsCollapsed ? null : (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <FactorList title={t('caseDetail.supportingFactors')} factors={supportingFactors} tone="support" emptyLabel={t('common.none')} />
            <FactorList title={t('caseDetail.weakeningFactors')} factors={weakeningFactors} tone="warning" emptyLabel={t('common.none')} />
          </div>
        )}
      </div>

      <div className="mt-4">
        <button type="button" onClick={() => setShowDebugCollapsed((value) => !value)} className="text-sm underline">تفاصيل تقنية للمشرف</button>
        {showDebugContent ? <div className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{JSON.stringify(result, null, 2)}</div> : null}
      </div>
    </div>
  );
}

export default function NewScreeningPage() {
  const { formatNumber, t, tEnum } = useI18n();

  // Search form state
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [clientReference, setClientReference] = useState('');
  const [liveVerify, setLiveVerify] = useState(true);
  const [mode, setMode] = useState<'SELECTED' | 'ALL'>('ALL');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  // Data & results
  const [sourceSummaries, setSourceSummaries] = useState<DataSourceSummary[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScreeningResponse | null>(null);
  const [sourceCheck, setSourceCheck] = useState<OfacScreeningSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters and refinement state (appear after results)
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('');
  const [minConfidence, setMinConfidence] = useState<number | null>(null);
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>('');
  const [searchWithinResults, setSearchWithinResults] = useState<string>('');
  const [sortBy, setSortBy] = useState<ScreeningSort>('confidence');

  // UI helpers
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [showFactorsCollapsed, setShowFactorsCollapsed] = useState(true);
  const [showDebugCollapsed, setShowDebugCollapsed] = useState(true);

  useEffect(() => {
    const loadSources = async () => {
      try {
        const sources = await getDataSources();
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
        label: source.code === 'LEBANON_NATIONAL_LIST' ? 'اللائحة الوطنية' : source.name,
        status: source.status,
        health: source.syncStatus?.syncHealth ?? 'UNKNOWN',
        lastSyncAt: source.syncStatus?.lastSuccessfulSyncAt ?? source.currentActiveVersion?.importedAt ?? '',
        activeVersion: source.syncStatus?.currentActiveVersion ?? source.currentActiveVersion?.versionLabel ?? '',
        staleWarning: source.syncStatus?.staleWarning ?? null,
      })),
    [sourceSummaries],
  );

  const canSubmit = useMemo(() => fullName.trim().length >= 2, [fullName]);

  const filteredMatches = useMemo(
    () => computeFilteredMatches(result, {
      filterRiskLevel,
      filterSource,
      matchTypeFilter,
      minConfidence,
      searchWithinResults,
      sortBy,
    }),
    [result, filterRiskLevel, filterSource, matchTypeFilter, minConfidence, searchWithinResults, sortBy],
  );

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

      const payload: ScreenRequest = {
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
        sources: normalizedSources,
      };

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
      <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">{t('common.currentFinalDecision')}</p>

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
              <span className="text-sm font-medium">المصادر</span>
              <select
                className="rounded border border-slate-300 px-2 py-1 text-sm"
                value={mode === 'ALL' ? 'ALL' : 'SELECTED'}
                onChange={(e) => setMode(e.target.value === 'ALL' ? 'ALL' : 'SELECTED')}
              >
                <option value="ALL">جميع المصادر</option>
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value="SELECTED" disabled={opt.health !== 'OK'}>
                    {opt.label} {getSourceStatusSuffix(opt.health === 'OK')}
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

          {/* Filters (moved below results so candidate list is primary) */}
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold">تصفية النتائج</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <input placeholder="بحث داخل النتائج" value={searchWithinResults} onChange={(e) => setSearchWithinResults(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-right" />
              <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="rounded border px-2 py-1">
                <option value="ALL">جميع المصادر</option>
                {sourceOptions.map((s) => (
                  <option key={s.value} value={s.value} disabled={s.status !== 'ACTIVE'}>
                    {s.label} {getSourceStatusSuffix(s.status === 'ACTIVE')}
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
              <span className="text-sm">درجة الثقة أدنى:</span>
              <input type="number" min={0} max={100} placeholder="مثال: 70" value={minConfidence ?? ''} onChange={(e) => setMinConfidence(e.target.value === '' ? null : Number(e.target.value))} className="rounded border px-2 py-1 w-24" />
              <input placeholder="نوع التطابق" value={matchTypeFilter} onChange={(e) => setMatchTypeFilter(e.target.value)} className="rounded border px-2 py-1" />
              <span className="ml-auto text-sm">ترتيب:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as ScreeningSort)} className="rounded border px-2 py-1">
                <option value="confidence">الأعلى ثقة أولاً</option>
                <option value="risk">الأعلى خطورة أولاً</option>
                <option value="source">حسب المصدر</option>
              </select>
            </div>
            <p className="mt-3 text-sm text-slate-700">نتائج مطابقة معروضة: {filteredMatches.length}</p>
          </div>

          <div className="mt-2 text-sm text-slate-600">
            <div className="font-medium">أمثلة للبحث</div>
            <div className="mt-1 flex gap-2">
              {['محمد علي حسن', 'Hassan Ali', 'Smith'].map((ex) => (
                <button key={ex} type="button" onClick={() => setFullName(ex)} className="rounded-full border px-3 py-1 text-sm bg-white">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced options collapsed */}
        <div>
          <button type="button" onClick={() => setShowAdvanced((s) => !s)} className="mt-4 text-sm text-slate-700 underline">
            خيارات متقدمة
          </button>

          {showAdvanced ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input className="rounded-lg border border-slate-300 px-4 py-2 text-right" placeholder={t('screening.dateOfBirth')} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              <input className="rounded-lg border border-slate-300 px-4 py-2 text-right" placeholder={t('screening.nationality')} value={nationality} onChange={(e) => setNationality(e.target.value)} />
              <input className="rounded-lg border border-slate-300 px-4 py-2 text-right" placeholder={t('screening.documentNumber')} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
              <input className="rounded-lg border border-slate-300 px-4 py-2 text-right" placeholder={t('screening.transactionType')} value={transactionType} onChange={(e) => setTransactionType(e.target.value)} />
              <input className="rounded-lg border border-slate-300 px-4 py-2 text-right md:col-span-2" placeholder={t('screening.clientReference')} value={clientReference} onChange={(e) => setClientReference(e.target.value)} />
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
        <ScreeningResults
          filteredMatches={filteredMatches}
          formatNumber={formatNumber}
          fullName={fullName}
          onCloseMatch={() => setSelectedMatch(null)}
          onSelectMatch={setSelectedMatch}
          result={result}
          selectedMatch={selectedMatch}
          setShowDebugCollapsed={setShowDebugCollapsed}
          setShowFactorsCollapsed={setShowFactorsCollapsed}
          showDebugCollapsed={showDebugCollapsed}
          showFactorsCollapsed={showFactorsCollapsed}
          sourceCheck={sourceCheck}
          t={t}
          tEnum={tEnum}
        />
      ) : null}
    </section>
  );
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
            <p className="text-xs text-slate-500">weight {factor.weight}{typeof factor.score === 'number' ? ` · score ${factor.score}` : ''}</p>
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

function getDecisionSupportDisclaimer(disclaimer: unknown) {
  if (typeof disclaimer === 'string' && disclaimer.trim().length > 0) {
    return disclaimer;
  }

  return 'نتائج KYDEX هي مخرجات مساعدة لاتخاذ القرار، ولا تُعد حكماً قانونياً نهائياً. يجب إجراء مراجعة مهنية قبل اتخاذ أي قرار قانوني أو امتثالي.';
}
