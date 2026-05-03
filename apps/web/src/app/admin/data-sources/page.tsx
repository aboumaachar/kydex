"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../../i18n/i18n-provider';

import { DataSourcesTable, DataSourceRow } from './DataSourcesTable';
import { disableDataSource, enableDataSource, getDataSources, syncOfficialSources, type DataSourceSummary } from '../../../lib/api';

function toRow(source: DataSourceSummary): DataSourceRow {
  const activeVersion = source.currentActiveVersion ?? source.versions.find((version) => version.status === 'ACTIVE') ?? source.versions[0];
  const latestVersion = source.versions[0] ?? null;

  return {
    code: source.code,
    name: source.name,
    status: source.status,
    lastFullSync: source.syncStatus.lastFullSyncAt ?? '',
    lastSuccessfulSync: source.syncStatus.lastSuccessfulSyncAt ?? '',
    lastFailedSync: source.syncStatus.lastFailedSyncAt ?? '',
    activeVersion: activeVersion?.versionLabel ?? '',
    recordCount: source.syncStatus.recordCount ?? activeVersion?.recordCount ?? 0,
    fileHash: source.syncStatus.fileHash ?? activeVersion?.fileHash ?? '',
    health: source.syncStatus.syncHealth,
    lastSyncActor: source.syncStatus.lastSyncActor ?? '',
    syncDurationMs: source.syncStatus.lastSyncDurationMs ?? null,
    rejectedRows: source.syncStatus.rejectedRows ?? 0,
    latestVersionId: latestVersion?.id ?? null,
    syncHistoryPath: source.syncHistoryPath,
    staleWarning: source.syncStatus.staleWarning ?? null,
  };
}

export default function AdminDataSourcesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [rows, setRows] = useState<DataSourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [syncingCode, setSyncingCode] = useState('');

  const loadSources = async () => {
    setLoading(true);
    setError('');

    try {
      const sources = await getDataSources();
      setRows(sources.map(toRow));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load data sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSources();
  }, []);

  const handleSync = async (code: string) => {
    setSyncingCode(code);
    setError('');
    setNotice('');

    try {
      const result = await syncOfficialSources(code === 'ALL' ? undefined : [code]);
      setNotice(
        result.synchronized > 0
          ? `Synchronized ${result.synchronized} source${result.synchronized === 1 ? '' : 's'} successfully.`
          : 'No sources were synchronized.',
      );
      await loadSources();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Sync failed');
    } finally {
      setSyncingCode('');
    }
  };

  const handleViewVersions = (code: string) => {
    router.push(`/admin/data-sources/${code}/versions`);
  };

  const handleViewRecords = (code: string) => {
    router.push(`/admin/data-sources/${code}/records`);
  };

  const handleViewReport = (code: string, versionId: string) => {
    router.push(`/admin/data-sources/${code}/versions/${versionId}/report`);
  };

  const handleViewSyncHistory = (code: string) => {
    router.push(`/admin/data-sources/${code}/sync-history`);
  };

  const handleToggleEnabled = async (code: string, nextStatus: 'ACTIVE' | 'DISABLED') => {
    setError('');

    try {
      if (nextStatus === 'ACTIVE') {
        await enableDataSource(code);
      } else {
        await disableDataSource(code);
      }

      await loadSources();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update source status');
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{t('dataSources.title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('dataSources.description')}</p>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={loading || syncingCode.length > 0}
            onClick={() => void handleSync('ALL')}
          >
            {syncingCode === 'ALL' ? t('dataSources.syncingAll') : t('dataSources.syncAll')}
          </button>
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            onClick={() => void loadSources()}
          >
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">{t('dataSources.loading')}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <DataSourcesTable
            data={rows}
            onSync={(code) => void handleSync(code)}
            onToggleEnabled={(code, nextStatus) => void handleToggleEnabled(code, nextStatus)}
            onViewVersions={handleViewVersions}
            onViewRecords={handleViewRecords}
            onViewReport={handleViewReport}
            onViewSyncHistory={handleViewSyncHistory}
          />
        </div>
      )}
    </section>
  );
}
