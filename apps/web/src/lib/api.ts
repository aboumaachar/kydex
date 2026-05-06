export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  user: {
    id: string;
    tenantId: string;
    fullName: string;
    role: string;
    email: string;
  };
};

export type SessionUser = LoginResponse['user'];

export type BulkRecord = {
  fullName: string;
  dateOfBirth?: string;
  nationality?: string;
  documentNumber?: string;
  transactionType?: string;
  clientReference?: string;
};

export type BulkStatusResponse = {
  bulkJobId: string;
  status: string;
  progress: number | object;
  failedReason?: string | null;
  result?: {
    total: number;
    completedAt: string;
    results: Array<{ index: number; result: Record<string, unknown> }>;
  } | null;
};

export type ScreenRequest = {
  fullName?: string;
  query?: string;
  subject?: string;
  name?: string;
  screeningType?: string;
  source?: string;
  liveVerify?: boolean;
  dateOfBirth?: string;
  nationality?: string;
  documentNumber?: string;
  transactionType?: string;
  clientReference?: string;
  sources?: string[];
};

export type OfacScreeningSearchRequest = {
  query?: string;
  fullName?: string;
  subject?: string;
  name?: string;
  screeningType?: string;
  source?: string;
  liveVerify?: boolean;
  sources?: string[];
  clientReference?: string;
  dateOfBirth?: string;
  nationality?: string;
};

export type DecisionFactor = {
  factor: string;
  weight: number;
  score?: number;
  explanation: string;
};

export type ScreeningMatch = {
  source: string;
  matchedName: string;
  matchedField?: string | null;
  matchedAlias?: string | null;
  matchedAliasScore?: number;
  matchedToken?: string | null;
  tokenOverlap?: number;
  matchEvidence?: string | null;
  simpleReasonArabic?: string | null;
  simplifiedArabicReason?: string | null;
  score: number;
  riskLevel: string;
  classification: string;
  candidateClassification?: string;
  reason: string;
  nameScore?: number;
  aliasScore?: number;
  aliasMatched?: boolean;
  transliterationMatched?: boolean;
  arabicExactMatch?: boolean;
  arabicNormalizedMatch?: boolean;
  arabicTransliterationMatch?: boolean;
  arabicTokenOverlap?: number;
  arabicFatherNameMatch?: boolean;
  arabicFamilyNameMatch?: boolean;
  nationalityMatched?: boolean;
  nationalityMismatch?: boolean;
  dobMatched?: boolean;
  dobMismatch?: boolean;
  docMatched?: boolean;
  docMismatch?: boolean;
  programOrCategory?: string;
  sourceVersion: string;
};

export type SourceVersionUsage = {
  sourceCode: string;
  versionId: string;
  versionLabel: string;
  importedAt?: string;
  fileHash?: string | null;
  sourceHealth?: string;
  lastSyncAt?: string;
  stale?: boolean;
  warning?: string | null;
};

export type ScreeningResponse = {
  queryId: string;
  riskLevel: string;
  highestScore: number;
  classification: string;
  candidateClassification?: string;
  matchDecision?: string;
  decision: string;
  confidence?: number;
  decisionConfidence: number;
  reasonSummary: string;
  disclaimer?: string;
  recommendedAction: string;
  supportingFactors: DecisionFactor[];
  weakeningFactors: DecisionFactor[];
  requiresEscalation: boolean;
  caseId?: string;
  caseStatus?: string;
  caseLink?: string | null;
  matches: ScreeningMatch[];
  searchedSources: string[];
  usedLocalVersions: SourceVersionUsage[];
  audit: {
    screenedAt: string;
    sourcesUsed: string[];
  };
  sourceMode?: string;
  liveSourceChecked?: boolean;
  sourceStatus?: Record<string, unknown>;
  usedFallback?: boolean;
  warning?: string | null;
};

export type OfacScreeningSearchResponse = {
  status: string;
  query: string;
  normalizedQuery: string;
  queryVariants: string[];
  sourceMode: string;
  liveSourceChecked: boolean;
  usedFallback: boolean;
  sourceStatus: Record<string, unknown>;
  highestScore: number;
  matches: Array<{
    source: string;
    entityId: string;
    primaryName: string;
    matchedName: string;
    listName: string;
    programs: string[];
    score: number;
    riskLevel: string;
    matchReason: string;
  }>;
  auditId: string;
  warning?: string | null;
  disclaimer?: string;
};

export type CaseDetailResponse = {
  id: string;
  status: string;
  riskLevel: string;
  originalDecision?: string | null;
  reviewerDecision?: string | null;
  reviewerJustification?: string | null;
  reviewedAt?: string | null;
  committeeDecision?: string | null;
  decisionNotes?: string | null;
  screeningQuery: {
    id: string;
    fullName: string;
    highestScore: number;
    riskLevel: string;
    matchDecision?: string | null;
    decisionConfidence?: number | null;
    reasonSummary?: string | null;
    recommendedAction?: string | null;
    supportingFactors?: DecisionFactor[] | null;
    weakeningFactors?: DecisionFactor[] | null;
    matches: ScreeningMatch[];
  };
};

export type CaseFilters = {
  status?: string;
  riskLevel?: string;
  reviewQueue?: boolean;
};

export type DataSourceVersionSummary = {
  id: string;
  versionLabel: string;
  fileHash: string | null;
  importedAt: string;
  importedBy?: string | null;
  recordCount: number;
  status: string;
};

export type DataSourceSyncStatus = {
  lastFullSyncAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastFailedSyncAt?: string | null;
  currentActiveVersion?: string | null;
  recordCount: number;
  fileHash?: string | null;
  syncHealth: string;
  lastSyncActor?: string | null;
  lastSyncDurationMs?: number | null;
  rejectedRows: number;
  stale: boolean;
  staleWarning?: string | null;
};

export type DataSourceActiveVersion = {
  id: string;
  versionLabel: string;
  importedAt: string;
  importedBy?: string | null;
  recordCount: number;
  status: string;
  fileHash?: string | null;
};

export type DataSourceSummary = {
  id: string;
  code: string;
  name: string;
  type: string;
  country?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  versions: DataSourceVersionSummary[];
  currentActiveVersion?: DataSourceActiveVersion | null;
  latestIngestionRun?: IngestionRunSummary | null;
  syncStatus: DataSourceSyncStatus;
  syncHistoryPath?: string;
};

export type IngestionRunSummary = {
  id: string;
  versionId: string;
  sourceCode: string;
  totalRows: number;
  insertedRecords: number;
  rejectedRows: number;
  duplicateRows: number;
  validationErrors?: unknown;
  rejectedReport?: unknown;
  createdAt: string;
  createdBy?: string | null;
};

export type DataSourceSyncHistoryEntry = {
  runId: string;
  source: string;
  startedAt: string;
  completedAt: string;
  status: string;
  parsedRows: number;
  insertedRecords: number;
  rejectedRows: number;
  fileHash?: string | null;
  triggeredBy?: string | null;
  syncDurationMs?: number | null;
  versionId?: string | null;
  versionLabel?: string | null;
  reportPath?: string | null;
  metadataPath?: string | null;
  retrySourceCode: string;
  error?: string | null;
};

export type DataSourceReportResponse = {
  source: {
    id: string;
    code: string;
    name: string;
  };
  version: DataSourceVersionSummary;
  ingestionRun: IngestionRunSummary | null;
};

export type DataSourceRecordSummary = {
  id: string;
  primaryName: string;
  source: string;
  entityType: string;
  nationality: string | null;
  dateOfBirth: string | null;
  documentNumber: string | null;
  programOrListType: string;
  externalReference: string | null;
  activeVersion: string | null;
  versionId: string;
  createdAt: string;
};

export type DataSourceRecordsResponse = {
  sourceCode: string;
  versionId: string | null;
  total: number;
  page: number;
  limit: number;
  records: DataSourceRecordSummary[];
};

export type DataSourceRecordDetail = {
  id: string;
  primaryName: string;
  normalizedName: string;
  arabicNormalizedName?: string | null;
  latinTransliteratedName?: string | null;
  aliases: string[];
  normalizedAliases?: string[];
  arabicNormalizedAliases?: string[];
  dateOfBirth: string | null;
  nationality: string | null;
  country: string | null;
  documentNumbers: string[];
  sourceCode: string;
  sourceName: string;
  versionId: string;
  versionLabel: string;
  versionStatus: string;
  versionFileHash: string | null;
  importedAt: string;
  externalReference: string | null;
  entityType: string;
  programOrListType: string;
  rawPayload: Record<string, unknown>;
  createdAt: string;
};

export type DataSourceRecordFilters = {
  q?: string;
  alias?: string;
  nationality?: string;
  entityType?: string;
  documentNumber?: string;
  program?: string;
  versionId?: string;
  page?: number;
  limit?: number;
  sort?: string;
};

export type DocumentExtractionConfirmPayload = {
  fullName: string;
  dateOfBirth?: string;
  nationality?: string;
  documentNumber?: string;
  issuingCountry?: string;
  expiryDate?: string;
  sources?: string[];
  transactionType?: string;
  clientReference?: string;
  redactAfterExtract?: boolean;
};

export type IntegrationKeySummary = {
  id: string;
  name: string;
  status: string;
  lastUsedAt?: string | null;
  createdAt: string;
  usageCount: number;
  capabilities: string[];
  allowedDomains: string[];
  allowedIps: string[];
};

export type CreateIntegrationKeyPayload = {
  name: string;
  capabilities?: string[];
  allowedDomains?: string[];
  allowedIps?: string[];
  enabled?: boolean;
};

export type IntegrationKeySecretResponse = {
  id: string;
  name?: string;
  status?: string;
  rawKey: string;
};

export type AdminNotaryKeySummary = {
  id: string;
  notarySlug: string;
  label?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string | null;
  suspendedAt?: string | null;
  revokedAt?: string | null;
  rotatedAt?: string | null;
  failedAuthCount: number;
  lastFailedAuthAt?: string | null;
  membershipStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  planName: string;
  monthlyUsageManual: number;
  monthlyUsageImage: number;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  allowedWordPressSites: string[];
};

export type CreateNotaryKeyPayload = {
  notarySlug: string;
  displayName?: string;
  label?: string;
};

export type AdminNotaryKeySecretResponse = {
  id: string;
  notarySlug: string;
  label?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  rawKey: string;
  createdAt?: string;
  rotatedAt?: string;
  message: string;
};

export type AdminNotaryKeyUsage = {
  keyId: string;
  notarySlug: string;
  status: string;
  day: {
    manualSearches: number;
    imageSearches: number;
  };
  month: {
    manualSearches: number;
    imageSearches: number;
    authFailures: number;
    authSuccesses: number;
  };
  lastUsedAt?: string | null;
  resetAt: string;
};

export type AdminNotaryProfileSummary = {
  slug: string;
  displayName: string;
  membershipStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  planName: string;
  planLimitManualSearches: number;
  planLimitImageSearches: number;
  monthlyUsageManual: number;
  monthlyUsageImage: number;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  suspendedAt?: string | null;
  cancelledAt?: string | null;
  isScreeningEnabled: boolean;
  allowedWordPressSites: string[];
  keys: Array<{
    id: string;
    label?: string | null;
    status: string;
    createdAt: string;
    lastUsedAt?: string | null;
  }>;
};

export type AdminNotaryProfileDetail = AdminNotaryProfileSummary & {
  usage: {
    dayManual: number;
    dayImage: number;
    monthManual: number;
    monthImage: number;
  };
};

export type AdminUsageSummary = {
  totalNotaries: number;
  totals: {
    manual: number;
    image: number;
  };
  items: Array<{
    slug: string;
    displayName: string;
    membershipStatus: string;
    planName: string;
    planLimitManualSearches: number;
    planLimitImageSearches: number;
    monthlyUsageManual: number;
    monthlyUsageImage: number;
    billingPeriodEnd?: string | null;
  }>;
};

export type AdminMonitoringSummary = {
  generatedAt: string;
  apiHealth: string;
  database: {
    ok: boolean;
    error?: string;
  };
  ofac: {
    status: string;
    lastHealthCheckAt?: string | null;
    lastSuccessfulSyncAt?: string | null;
    lastError?: string | null;
    syncFailures24h: number;
  };
  alerts: {
    failedNotaryAuthLastHour: number;
    failedNotaryAuthLast24h: number;
    fallbackActivations24h: number;
    ocrErrors24h: number;
    wordpressPluginErrors24h: number;
    highRiskMatchEvents24h: number;
  };
  recentSyncRuns: SourceSyncRunSummary[];
};

export type SourceRegistryItem = {
  id: string;
  code: string;
  name: string;
  baseUrl?: string | null;
  status: string;
  fallbackEnabled: boolean;
  localCopyAvailable: boolean;
  lastSuccessfulSyncAt?: string | null;
  lastAttemptedSyncAt?: string | null;
  lastHealthCheckAt?: string | null;
  lastError?: string | null;
  lastLatencyMs?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SourceHealthCheckResult = {
  code: string;
  status: string;
  latencyMs: number;
  httpStatus: number | null;
  error: string | null;
  checkedAt: string;
};

export type SourceImportStatus = {
  sourceCode: string;
  importedListCount: number;
  sourceEntityCount: number;
  sourceNameCount: number;
  sourceNameVariantCount: number;
  localCopyAvailable: boolean;
  lastSuccessfulSyncAt?: string | null;
};

export type SourceImportedListSummary = {
  id: string;
  sourceId: string;
  syncRunId?: string | null;
  sourceFileId?: string | null;
  listName: string;
  programName?: string | null;
  recordCount: number;
  languageCoverage: string[];
  localAvailable: boolean;
  lastImportedAt: string;
};

export type SourceNamePreview = {
  id: string;
  originalName: string;
  isPrimary: boolean;
  isAlias: boolean;
  aliasType?: string | null;
  /** Machine-transliterated Arabic normalisation — NOT a certified legal translation. */
  normalizedArabic?: string | null;
  language?: string | null;
};

export type SourceEntityPreview = {
  id: string;
  externalEntityId: string;
  entityType: string;
  primaryName: string;
  /** Machine-transliterated Arabic normalisation — NOT a certified legal translation. */
  normalizedArabic?: string | null;
  listName: string;
  programs: string[];
  countries: string[];
  importedAt: string;
  names: SourceNamePreview[];
};

export type SourceTranslationStatus = {
  sourceCode: string;
  listName: string;
  totalEntities: number;
  entitiesWithArabicNormalized: number;
  entityArabicCoveragePercent: number;
  totalNames: number;
  namesWithArabicNormalized: number;
  nameArabicCoveragePercent: number;
  disclaimer: string;
};

export type SourceDownloadEntity = {
  id: string;
  externalEntityId: string;
  entityType: string;
  primaryName: string;
  normalizedArabic?: string | null;
  listName: string;
  programs: string[];
  countries: string[];
  importedAt: string;
  names: SourceNamePreview[];
};

export type SourceDownloadResponse = {
  sourceCode: string;
  listName: string;
  exportedAt: string;
  count: number;
  disclaimer: string;
  entities: SourceDownloadEntity[];
};

export type AvailableSource = {
  id: string;
  code: string;
  name: string;
  status: string;
  localCopyAvailable: boolean;
  lastSuccessfulSyncAt?: string | null;
};

export type SourceListPreviewResponse = {
  total: number;
  take: number;
  skip: number;
  entities: SourceEntityPreview[];
};

export type SourceSyncRunSummary = {
  id: string;
  sourceId: string;
  status: string;
  syncType: string;
  startedAt: string;
  finishedAt?: string | null;
  recordsImported: number;
  recordsUpdated: number;
  recordsFailed: number;
  sourceFileName?: string | null;
  publicationId?: string | null;
  error?: string | null;
};

export type InquiryTransactionSummary = {
  id: string;
  query: string;
  normalizedQuery?: string | null;
  sourceMode?: string | null;
  usedFallback?: boolean;
  status: string;
  highestScore: number;
  matchCount: number;
  ipAddress?: string | null;
  apiClient?: string | null;
  responseTimeMs?: number | null;
  createdAt: string;
};

export type InquirySummary = {
  id: string;
  transactionId?: string | null;
  clientType?: string | null;
  clientId?: string | null;
  notarySlug?: string | null;
  wordpressSite?: string | null;
  originalPayload?: unknown;
  responsePayload?: unknown;
  status: string;
  createdAt: string;
  transaction?: InquiryTransactionSummary | null;
};

export type InquiryListResponse = {
  total: number;
  take: number;
  skip: number;
  items: InquirySummary[];
};

export type InquiryDetail = {
  id: string;
  transactionId?: string | null;
  clientType?: string | null;
  clientId?: string | null;
  notarySlug?: string | null;
  wordpressSite?: string | null;
  originalPayload?: unknown;
  responsePayload?: unknown;
  status: string;
  createdAt: string;
  transaction?: {
    id: string;
    query: string;
    normalizedQuery?: string | null;
    queryVariants: string[];
    requesterType?: string | null;
    requesterSlug?: string | null;
    sourceMode?: string | null;
    usedFallback?: boolean;
    liveSourceChecked?: boolean;
    sourceStatus?: unknown;
    warning?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    apiClient?: string | null;
    apiKeyId?: string | null;
    wordpressSite?: string | null;
    wpUserId?: string | null;
    clientReference?: string | null;
    status: string;
    highestScore: number;
    matchCount: number;
    responseTimeMs?: number | null;
    createdAt: string;
  } | null;
};

export type ScreeningLogRow = {
  id: string;
  query: string;
  normalizedQuery?: string | null;
  sourceMode?: string | null;
  usedFallback?: boolean;
  status: string;
  highestScore: number;
  apiClient?: string | null;
  ipAddress?: string | null;
  responseTimeMs?: number | null;
  createdAt: string;
};

export type ScreeningLogsResponse = {
  total?: number;
  take?: number;
  skip?: number;
  items: ScreeningLogRow[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? (process.env.NODE_ENV === 'production' ? '/api/v1' : 'http://localhost:4000/api/v1');
const TOKEN_KEY = 'kydex_access_token';
const TOKEN_EXP_KEY = 'kydex_access_token_exp';
const USER_KEY = 'kydex_user';

export class ApiRequestError extends Error {
  status?: number;
  kind?: 'network' | 'http';

  constructor(message: string, options?: { status?: number; kind?: 'network' | 'http' }) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = options?.status;
    this.kind = options?.kind;
  }
}

function getApiErrorMessage(data: unknown) {
  if (typeof data === 'object' && data !== null) {
    const errorRecord = data as { error?: unknown; message?: unknown };

    if (typeof errorRecord.error === 'object' && errorRecord.error !== null && 'message' in errorRecord.error) {
      const nestedMessage = (errorRecord.error as { message?: unknown }).message;
      if (typeof nestedMessage === 'string' && nestedMessage.trim().length > 0) {
        return nestedMessage;
      }
    }

    if (typeof errorRecord.message === 'string') {
      return errorRecord.message;
    }
  }

  return 'Request failed';
}

function optionalText(value?: string) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildNormalizedScreeningPayload<T extends ScreenRequest | OfacScreeningSearchRequest>(
  payload: T,
) {
  const query = [payload.query, payload.fullName, payload.subject, payload.name]
    .find((value) => typeof value === 'string' && value.trim().length > 0)
    ?.trim();

  return {
    ...payload,
    query,
    screeningType: payload.screeningType ?? 'ofac',
    source: payload.source ?? 'dashboard',
    liveVerify: payload.liveVerify ?? false,
    clientReference: optionalText(payload.clientReference),
    dateOfBirth: optionalText(payload.dateOfBirth),
    nationality: optionalText(payload.nationality),
    sources: payload.sources && payload.sources.length > 0 ? payload.sources : ['OFAC'],
  };
}

async function parseJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiRequestError('Network request failed', { kind: 'network' });
  }

  const data = await parseJsonSafe(response);

  if (response.status === 401 || response.status === 403) {
    clearAuthSession();
    if (globalThis.window !== undefined) {
      globalThis.window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const message = getApiErrorMessage(data);
    throw new ApiRequestError(message, { status: response.status, kind: 'http' });
  }

  return data as T;
}

export function getAuthToken() {
  if (globalThis.window === undefined) {
    return '';
  }

  const token = globalThis.window.localStorage.getItem(TOKEN_KEY) ?? '';
  if (!token) {
    return '';
  }

  const expiry = Number(globalThis.window.localStorage.getItem(TOKEN_EXP_KEY) ?? '0');
  if (expiry > 0 && Date.now() >= expiry) {
    clearAuthSession();
    return '';
  }

  return token;
}

export function isAuthenticated() {
  return getAuthToken().length > 0;
}

export function clearAuthSession() {
  if (globalThis.window === undefined) {
    return;
  }

  globalThis.window.localStorage.removeItem(TOKEN_KEY);
  globalThis.window.localStorage.removeItem(TOKEN_EXP_KEY);
  globalThis.window.localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): SessionUser | null {
  if (globalThis.window === undefined) {
    return null;
  }

  const raw = globalThis.window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function saveAuthSession(loginResponse: LoginResponse) {
  if (globalThis.window === undefined) {
    return;
  }

  const expiry = readJwtExpiryMs(loginResponse.accessToken);
  globalThis.window.localStorage.setItem(TOKEN_KEY, loginResponse.accessToken);
  globalThis.window.localStorage.setItem(TOKEN_EXP_KEY, String(expiry));
  globalThis.window.localStorage.setItem(USER_KEY, JSON.stringify(loginResponse.user));
}

export function logout() {
  clearAuthSession();
  if (globalThis.window !== undefined) {
    globalThis.window.location.href = '/login';
  }
}

function readJwtExpiryMs(token: string) {
  try {
    const payloadEncoded = token.split('.')[1] ?? '';
    const payloadJson = globalThis.atob(payloadEncoded.replaceAll('-', '+').replaceAll('_', '/'));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (payload.exp) {
      return payload.exp * 1000;
    }
  } catch {
    return Date.now() + 15 * 60 * 1000;
  }

  return Date.now() + 15 * 60 * 1000;
}

export async function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function runScreening(payload: ScreenRequest) {
  const normalizedPayload = {
    ...buildNormalizedScreeningPayload(payload),
    fullName: optionalText(payload.fullName) ?? optionalText(payload.query) ?? optionalText(payload.subject) ?? optionalText(payload.name),
    documentNumber: optionalText(payload.documentNumber),
    transactionType: optionalText(payload.transactionType),
  };

  return apiRequest<ScreeningResponse>('/screen', {
    method: 'POST',
    body: JSON.stringify(normalizedPayload),
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function runDashboardScreeningSearch(payload: OfacScreeningSearchRequest) {
  return apiRequest<OfacScreeningSearchResponse>('/screening/search', {
    method: 'POST',
    body: JSON.stringify(buildNormalizedScreeningPayload(payload)),
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getCases(filters?: CaseFilters) {
  const query = new URLSearchParams();
  if (filters?.status) {
    query.set('status', filters.status);
  }
  if (filters?.riskLevel) {
    query.set('riskLevel', filters.riskLevel);
  }
  if (filters?.reviewQueue) {
    query.set('reviewQueue', 'true');
  }

  const suffix = query.toString().length > 0 ? `?${query.toString()}` : '';

  return apiRequest<Array<Record<string, unknown>>>(`/cases${suffix}`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getCase(caseId: string) {
  return apiRequest<CaseDetailResponse>(`/cases/${caseId}`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function reviewMatchDecision(
  caseId: string,
  payload: { reviewerDecision: string; reviewerJustification?: string },
) {
  return apiRequest<CaseDetailResponse>(`/cases/${caseId}/match-decision-review`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function downloadComplianceTimeline(caseId: string) {
  const response = await fetch(`${API_BASE}/cases/${caseId}/compliance-timeline?download=true`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Timeline download failed');
  }

  return response.blob();
}

export async function enqueueBulkScreen(records: BulkRecord[], sources: string[]) {
  return apiRequest<{ bulkJobId: string; status: string }>('/bulk-screen', {
    method: 'POST',
    body: JSON.stringify({ records, sources }),
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function syncOfficialSources(sources?: string[]) {
  return apiRequest<{
    synchronized: number;
    results: Array<Record<string, unknown>>;
  }>('/data-sources/sync-official', {
    method: 'POST',
    body: JSON.stringify({ sources }),
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getDataSources() {
  return apiRequest<DataSourceSummary[]>('/data-sources', {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getDataSourceVersions(sourceCode: string) {
  return apiRequest<DataSourceVersionSummary[]>(`/data-sources/${sourceCode}/versions`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getDataSourceIngestionRuns(sourceCode: string) {
  return apiRequest<IngestionRunSummary[]>(`/data-sources/${sourceCode}/ingestion-runs`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getDataSourceSyncHistory(sourceCode: string) {
  return apiRequest<DataSourceSyncHistoryEntry[]>(`/data-sources/${sourceCode}/sync-history`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getDataSourceReport(sourceCode: string, versionId: string) {
  return apiRequest<DataSourceReportResponse>(`/data-sources/${sourceCode}/versions/${versionId}/report`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function activateDataSourceVersion(sourceCode: string, versionId: string) {
  return apiRequest<{ status: string; sourceCode: string; versionId: string }>(
    `/data-sources/${sourceCode}/versions/${versionId}/activate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
}

export async function archiveDataSourceVersion(sourceCode: string, versionId: string) {
  return apiRequest<{
    status: string;
    sourceCode: string;
    versionId: string;
    replacementVersionId: string | null;
  }>(`/data-sources/${sourceCode}/versions/${versionId}/archive`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getDataSourceRecords(sourceCode: string, filters: DataSourceRecordFilters = {}) {
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    query.set(key, String(value));
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';

  return apiRequest<DataSourceRecordsResponse>(`/data-sources/${sourceCode}/records${suffix}`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getDataSourceRecordDetail(sourceCode: string, recordId: string) {
  return apiRequest<DataSourceRecordDetail>(`/data-sources/${sourceCode}/records/${recordId}`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function enableDataSource(sourceCode: string) {
  return apiRequest<{ status: string; sourceCode: string }>(`/data-sources/${sourceCode}/enable`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function disableDataSource(sourceCode: string) {
  return apiRequest<{ status: string; sourceCode: string }>(`/data-sources/${sourceCode}/disable`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function extractDocument(file: File, documentType?: string, redactAfterExtract?: boolean) {
  const query = new URLSearchParams();
  if (documentType) {
    query.set('documentType', documentType);
  }
  if (typeof redactAfterExtract === 'boolean') {
    query.set('redactAfterExtract', String(redactAfterExtract));
  }

  const form = new FormData();
  form.append('file', file);
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return apiRequest<{
    extractionId: string;
    status: string;
    extractionProvider: string;
    extractionConfidence: number;
    extractedFields: Record<string, unknown>;
    confirmationRequired: boolean;
  }>(`/document-extraction/extract${suffix}`, {
    method: 'POST',
    body: form,
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function confirmDocumentExtraction(extractionId: string, payload: DocumentExtractionConfirmPayload) {
  return apiRequest<Record<string, unknown>>(`/document-extraction/${extractionId}/confirm`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getBulkStatus(jobId: string) {
  return apiRequest<BulkStatusResponse>(`/bulk-screen/${jobId}`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function listIntegrationKeys() {
  return apiRequest<IntegrationKeySummary[]>('/integrations/keys', {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function createIntegrationKey(payload: CreateIntegrationKeyPayload) {
  return apiRequest<IntegrationKeySecretResponse>('/integrations/keys', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function rotateIntegrationKey(keyId: string) {
  return apiRequest<IntegrationKeySecretResponse>(`/integrations/keys/${keyId}/rotate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function updateIntegrationKeyStatus(keyId: string, status: 'ACTIVE' | 'DISABLED' | 'REVOKED') {
  return apiRequest<{ id: string; status: string }>(`/integrations/keys/${keyId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function listAdminNotaryKeys() {
  return apiRequest<AdminNotaryKeySummary[]>('/admin/notary-keys', {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function createAdminNotaryKey(payload: CreateNotaryKeyPayload) {
  return apiRequest<AdminNotaryKeySecretResponse>('/admin/notary-keys', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function rotateAdminNotaryKey(id: string) {
  return apiRequest<AdminNotaryKeySecretResponse>(`/admin/notary-keys/${id}/rotate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function revokeAdminNotaryKey(id: string) {
  return apiRequest<{ id: string; notarySlug: string; status: string; revokedAt?: string | null }>(`/admin/notary-keys/${id}/revoke`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function suspendAdminNotaryKey(id: string) {
  return apiRequest<{ id: string; notarySlug: string; status: string; suspendedAt?: string | null }>(`/admin/notary-keys/${id}/suspend`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function activateAdminNotaryKey(id: string) {
  return apiRequest<{ id: string; notarySlug: string; status: string }>(`/admin/notary-keys/${id}/activate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getAdminNotaryKeyUsage(id: string) {
  return apiRequest<AdminNotaryKeyUsage>(`/admin/notary-keys/${id}/usage`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function listAdminNotaries() {
  return apiRequest<AdminNotaryProfileSummary[]>('/admin/notaries', {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getAdminNotaryBySlug(slug: string) {
  return apiRequest<AdminNotaryProfileDetail>(`/admin/notaries/${slug}`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getAdminUsageSummary() {
  return apiRequest<AdminUsageSummary>('/admin/usage', {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getAdminMonitoringSummary() {
  return apiRequest<AdminMonitoringSummary>('/admin/monitoring', {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getSourcesRegistry() {
  return apiRequest<SourceRegistryItem[]>('/sources', {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getSourceStatus(sourceCode: string) {
  return apiRequest<SourceRegistryItem>(`/sources/${sourceCode}/status`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function runSourceHealthCheck(sourceCode: string) {
  return apiRequest<SourceHealthCheckResult>(`/sources/${sourceCode}/health-check`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getSourceImportStatus(sourceCode: string) {
  return apiRequest<SourceImportStatus>(`/sources/${sourceCode}/import-status`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function importSourceFromLegacy(sourceCode: string) {
  return apiRequest<Record<string, unknown>>(`/sources/${sourceCode}/import-from-legacy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function syncLebanonNationalList() {
  return apiRequest<Record<string, unknown>>('/sources/lebanon-national-list/sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getSourceImportedLists(sourceCode: string) {
  return apiRequest<SourceImportedListSummary[]>(`/sources/${sourceCode}/lists`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getSourceListPreview(sourceCode: string, listName: string, take = 25, skip = 0) {
  const query = new URLSearchParams({
    take: String(take),
    skip: String(skip),
  });

  return apiRequest<SourceListPreviewResponse>(
    `/sources/${sourceCode}/lists/${encodeURIComponent(listName)}/preview?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
}

export async function getSourceSyncRuns(sourceCode: string) {
  return apiRequest<SourceSyncRunSummary[]>(`/sources/${sourceCode}/sync-runs`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getSourceTranslationStatus(sourceCode: string, listName: string) {
  return apiRequest<SourceTranslationStatus>(
    `/sources/${sourceCode}/lists/${encodeURIComponent(listName)}/translation-status`,
    { headers: { Authorization: `Bearer ${getAuthToken()}` } },
  );
}

export async function getSourceListDownload(sourceCode: string, listName: string) {
  return apiRequest<SourceDownloadResponse>(
    `/sources/${sourceCode}/lists/${encodeURIComponent(listName)}/download`,
    { headers: { Authorization: `Bearer ${getAuthToken()}` } },
  );
}

export async function getAvailableSources() {
  return apiRequest<AvailableSource[]>('/sources/available', {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
}

/** Convert a SourceDownloadResponse to a CSV string. */
export function sourceDownloadToCsv(data: SourceDownloadResponse): string {
  const headers = [
    'EntityID',
    'PrimaryName',
    'ArabicNormalized',
    'EntityType',
    'List',
    'Programs',
    'Countries',
    'Aliases',
    'ImportedAt',
  ];
  const escape = (v: string) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = data.entities.map((e) => [
    escape(e.externalEntityId),
    escape(e.primaryName),
    escape(e.normalizedArabic ?? ''),
    escape(e.entityType),
    escape(e.listName),
    escape(e.programs.join('; ')),
    escape(e.countries.join('; ')),
    escape(
      e.names
        .filter((n) => n.isAlias)
        .map((n) => n.originalName)
        .join('; '),
    ),
    escape(e.importedAt),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/** Trigger a browser file download from a string/JSON blob. */
export function triggerBlobDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function getInquiries(take = 50, skip = 0) {
  const query = new URLSearchParams({
    take: String(take),
    skip: String(skip),
  });

  return apiRequest<InquiryListResponse>(`/inquiries?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getInquiryById(id: string) {
  return apiRequest<InquiryDetail>(`/inquiries/${id}`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}

export async function getScreeningLogs(take = 50, skip = 0) {
  const query = new URLSearchParams({
    take: String(take),
    skip: String(skip),
  });

  return apiRequest<ScreeningLogsResponse>(`/screening/logs?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
}
