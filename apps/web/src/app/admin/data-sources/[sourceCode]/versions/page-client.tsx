"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '../../../../../i18n/i18n-provider';

import { VersionsTable, type VersionRow } from '../../VersionsTable';
import {
  activateDataSourceVersion,
  archiveDataSourceVersion,
  getStoredUser,
  getDataSourceIngestionRuns,
  getDataSourceVersions,
  type DataSourceVersionSummary,
  type IngestionRunSummary,
} from '../../../../../lib/api';

type PendingAction =
  | { type: 'activate'; versionId: string }
  | { type: 'archive'; versionId: string }
  | null;

function buildRows(versions: DataSourceVersionSummary[], runs: IngestionRunSummary[]): VersionRow[] {
  return versions.map((version) => {
    const run = runs.find((entry) => entry.versionId === version.id);
    return {
      versionId: version.id,
      importedAt: version.importedAt,
      fileHash: version.fileHash ?? '',
      parsedRows: run?.totalRows ?? version.recordCount,
      inserted: run?.insertedRecords ?? version.recordCount,
      rejected: run?.rejectedRows ?? 0,
      duplicates: run?.duplicateRows ?? 0,
      status: version.status,
      isActive: version.status === 'ACTIVE',
    };
  });
}

export default function DataSourceVersionsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const params = useParams<{ sourceCode: string }>();
  const sourceCode = String(params.sourceCode ?? '');
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [submitting, setSubmitting] = useState(false);
  const [canMutate, setCanMutate] = useState(false);

  const pendingLabel = useMemo(() => {
    if (!pendingAction) {
      return '';
    }

    return pendingAction.type === 'activate' ? t('dataSources.setActive') : t('dataSources.archive');
  }, [pendingAction, t]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [versions, runs] = await Promise.all([
        getDataSourceVersions(sourceCode),
        getDataSourceIngestionRuns(sourceCode),
      ]);
      setRows(buildRows(versions, runs));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sourceCode) {
      void loadData();
    }
  }, [sourceCode]);

  useEffect(() => {
    const user = getStoredUser();
    setCanMutate(user?.role === 'SUPER_ADMIN' || user?.role === 'COUNCIL_ADMIN');
  }, []);

  const executePendingAction = async () => {
    if (!pendingAction) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (pendingAction.type === 'activate') {
        await activateDataSourceVersion(sourceCode, pendingAction.versionId);
      } else {
        await archiveDataSourceVersion(sourceCode, pendingAction.versionId);
      }

      setPendingAction(null);
      await loadData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Version action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{t('dataSources.versionsTitle')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('dataSources.sourceCodeLabel')}: {sourceCode}</p>
        </div>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => router.push('/admin/data-sources')}>
          {t('dataSources.backToSources')}
        </button>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">{t('dataSources.loadingVersions')}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <VersionsTable
            canMutate={canMutate}
            data={rows}
            onActivate={(versionId) => setPendingAction({ type: 'activate', versionId })}
            onArchive={(versionId) => setPendingAction({ type: 'archive', versionId })}
            onViewReport={(versionId) => router.push(`/admin/data-sources/${sourceCode}/versions/${versionId}/report`)}
            onViewRecords={(versionId) => router.push(`/admin/data-sources/${sourceCode}/records?versionId=${versionId}`)}
          />
        </div>
      )}

      {pendingAction && canMutate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">{t('dataSources.confirmAction')} {pendingLabel}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {pendingAction.type === 'activate'
                ? t('dataSources.confirmActivateBody')
                : t('dataSources.confirmArchiveBody')}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => setPendingAction(null)}>{t('common.cancel')}</button>
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={submitting}
                onClick={() => void executePendingAction()}
              >
                {submitting ? t('common.loading') : pendingLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}