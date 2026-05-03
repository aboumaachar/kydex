"use client";

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/i18n-provider';
import { BulkRecord, BulkStatusResponse, enqueueBulkScreen, getBulkStatus } from '../../../lib/api';

export default function BulkScreeningPage() {
  const { formatNumber, t } = useI18n();
  const [records, setRecords] = useState<BulkRecord[]>([]);
  const [sourcesInput, setSourcesInput] = useState('OFAC,UN');
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState<BulkStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const completedResults = useMemo(() => status?.result?.results ?? [], [status]);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const latest = await getBulkStatus(jobId);
        setStatus(latest);

        const done = ['COMPLETED', 'FAILED'].includes(latest.status);
        if (done) {
          clearInterval(timer);
        }
      } catch (pollError) {
        setError(pollError instanceof Error ? pollError.message : 'Polling failed');
        clearInterval(timer);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [jobId]);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError('');

    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text) as unknown;
        if (!Array.isArray(parsed)) {
          throw new TypeError('JSON must be an array of records');
        }
        setRecords(parsed as BulkRecord[]);
        return;
      }

      setRecords(parseCsvRecords(text));
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Failed to parse file');
    }
  };

  const onSubmit = async () => {
    if (records.length === 0) {
      setError('Upload a CSV/JSON file with at least one record.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const sources = sourcesInput
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

      const queued = await enqueueBulkScreen(records, sources);
      setJobId(queued.bulkJobId);
      setStatus({ bulkJobId: queued.bulkJobId, status: queued.status, progress: 0, result: null });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Bulk submit failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    const payload = JSON.stringify(completedResults, null, 2);
    downloadFile(payload, 'bulk-screen-results.json', 'application/json');
  };

  const downloadCsv = () => {
    const header = ['index', 'queryId', 'riskLevel', 'highestScore', 'requiresEscalation', 'caseId', 'caseLink'];
    const rows = completedResults.map((entry) => {
      const row = entry.result ?? {};
      return [
        String(entry.index),
        toSafeString(row.queryId),
        toSafeString(row.riskLevel),
        toSafeString(row.highestScore),
        toSafeString(row.requiresEscalation),
        toSafeString(row.caseId),
        toSafeString(row.caseLink),
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    downloadFile(csv, 'bulk-screen-results.csv', 'text/csv');
  };

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold">{t('screening.bulkTitle')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('screening.bulkDescription')}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="rounded-lg border border-slate-300 px-4 py-2"
          type="file"
          accept=".csv,.json"
          onChange={onFileChange}
        />
        <input
          className="rounded-lg border border-slate-300 px-4 py-2"
          value={sourcesInput}
          onChange={(event) => setSourcesInput(event.target.value)}
          placeholder={t('screening.sources')}
        />
      </div>

      <div className="text-sm text-slate-600">{t('screening.loadedRecords')}: {formatNumber(records.length)}</div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <button
        disabled={loading || records.length === 0}
        onClick={onSubmit}
        className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-70"
      >
        {loading ? t('screening.queueing') : t('screening.submitBulk')}
      </button>

      {status ? (
        <div className="space-y-2 rounded-lg border border-slate-200 p-4 text-sm">
          <p>{t('screening.jobId')}: {status.bulkJobId}</p>
          <p>{t('common.status')}: {status.status}</p>
          <p>
            {t('screening.progress')}:{' '}
            {typeof status.progress === 'number'
              ? `${status.progress}%`
              : JSON.stringify(status.progress)}
          </p>
          {status.failedReason ? <p className="text-rose-700">Error: {status.failedReason}</p> : null}
        </div>
      ) : null}

      {completedResults.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">{t('screening.completedRecords')}: {formatNumber(completedResults.length)}</p>
          <div className="flex gap-3">
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={downloadJson}>{t('screening.downloadJson')}</button>
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={downloadCsv}>{t('screening.downloadCsv')}</button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(completedResults.slice(0, 10), null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}

function parseCsvRecords(input: string): BulkRecord[] {
  const lines = input
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length <= 1) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((entry) => entry.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? '').trim();
    });

    return {
      fullName: row.fullName ?? row.name ?? row.primaryName ?? '',
      dateOfBirth: row.dateOfBirth || undefined,
      nationality: row.nationality || undefined,
      documentNumber: row.documentNumber || undefined,
      transactionType: row.transactionType || undefined,
      clientReference: row.clientReference || undefined,
    };
  });
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = i < line.length - 1 ? line[i + 1] : '';

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function toSafeString(value: unknown): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  return '';
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
