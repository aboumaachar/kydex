"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DataSourceSyncHistoryEntry,
  getDataSourceReport,
  getDataSourceSyncHistory,
  syncOfficialSources,
} from '../../../../../lib/api';
import { useI18n } from '../../../../../i18n/i18n-provider';

export default function DataSourceSyncHistoryPage() {
  const router = useRouter();
  const params = useParams<{ sourceCode: string }>();
  const sourceCode = String(params.sourceCode ?? '');
  const { formatDateTime, formatNumber, t } = useI18n();
  const [rows, setRows] = useState<DataSourceSyncHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState('');
  const [error, setError] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    setError('');

    try {
      const history = await getDataSourceSyncHistory(sourceCode);
      setRows(history);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load sync history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sourceCode) {
      void loadHistory();
    }
  }, [sourceCode]);

  const downloadMetadata = async (entry: DataSourceSyncHistoryEntry) => {
    if (!entry.versionId) {
      return;
    }

    const metadata = await getDataSourceReport(sourceCode, entry.versionId);
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${sourceCode}-${entry.versionId}-metadata.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const retrySync = async () => {
    setSubmitting(sourceCode);
    setError('');

    try {
      await syncOfficialSources([sourceCode]);
      await loadHistory();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Failed to retry source sync');
    } finally {
      setSubmitting('');
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{t('dataSources.syncHistoryTitle')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('dataSources.sourceCodeLabel')}: {sourceCode}</p>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={submitting.length > 0}
            onClick={() => void retrySync()}
          >
            {submitting ? t('dataSources.syncingAll') : t('dataSources.retryFailedSync')}
          </button>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => router.push('/admin/data-sources')}>
            {t('dataSources.backToSources')}
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">{t('dataSources.loadingSyncHistory')}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="kydex-table min-w-full border">
            <thead>
              <tr>
                <th>{t('dataSources.versionId')}</th>
                <th>{t('dataSources.sourceCode')}</th>
                <th>{t('dataSources.startedAt')}</th>
                <th>{t('dataSources.completedAt')}</th>
                <th>{t('common.status')}</th>
                <th>{t('dataSources.parsedRows')}</th>
                <th>{t('dataSources.inserted')}</th>
                <th>{t('dataSources.rejected')}</th>
                <th>{t('dataSources.fileHash')}</th>
                <th>{t('dataSources.triggeredBy')}</th>
                <th>{t('dataSources.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.runId}>
                  <td>{entry.versionId ?? entry.runId}</td>
                  <td>{entry.source}</td>
                  <td>{formatDateTime(entry.startedAt)}</td>
                  <td>{formatDateTime(entry.completedAt)}</td>
                  <td>{entry.status}</td>
                  <td>{formatNumber(entry.parsedRows)}</td>
                  <td>{formatNumber(entry.insertedRecords)}</td>
                  <td>{formatNumber(entry.rejectedRows)}</td>
                  <td className="max-w-40 truncate">{entry.fileHash ?? t('common.notAvailable')}</td>
                  <td>{entry.triggeredBy ?? t('common.notAvailable')}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {entry.versionId ? (
                        <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => router.push(`/admin/data-sources/${sourceCode}/versions/${entry.versionId}/report`)}>
                          {t('dataSources.viewReport')}
                        </button>
                      ) : null}
                      {entry.versionId ? (
                        <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => void downloadMetadata(entry)}>
                          {t('dataSources.downloadMetadata')}
                        </button>
                      ) : null}
                      {entry.status === 'FAILED' ? (
                        <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => void retrySync()}>
                          {t('dataSources.retryFailedSync')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}