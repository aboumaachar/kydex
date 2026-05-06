"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '../../../../../../i18n/i18n-provider';
import { getDataSourceRecordDetail, type DataSourceRecordDetail } from '../../../../../../lib/api';

export default function DataSourceRecordDetailPage() {
  const router = useRouter();
  const { formatDateTime, t } = useI18n();
  const params = useParams<{ sourceCode: string; recordId: string }>();
  const sourceCode = String(params.sourceCode ?? '');
  const recordId = String(params.recordId ?? '');
  const [record, setRecord] = useState<DataSourceRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sourceCode || !recordId) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const detail = await getDataSourceRecordDetail(sourceCode, recordId);
        setRecord(detail);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load record detail');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [recordId, sourceCode]);

  let content: JSX.Element | null = null;

  if (loading) {
    content = <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">{t('dataSources.loadingRecordDetail')}</div>;
  } else if (record) {
    content = (
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t('dataSources.identity')}</h2>
            <dl className="mt-3 grid gap-2 text-sm text-slate-700">
              <div><dt className="font-medium">{t('dataSources.primaryName')}</dt><dd>{record.primaryName}</dd></div>
              <div><dt className="font-medium">{t('dataSources.normalizedName')}</dt><dd>{record.normalizedName}</dd></div>
              <div><dt className="font-medium">{t('dataSources.arabicNormalizedName')}</dt><dd>{record.arabicNormalizedName ?? t('common.notAvailable')}</dd></div>
              <div><dt className="font-medium">{t('dataSources.latinTransliteratedName')}</dt><dd>{record.latinTransliteratedName ?? t('common.notAvailable')}</dd></div>
              <div><dt className="font-medium">{t('dataSources.aliases')}</dt><dd>{record.aliases.join(', ') || t('common.notAvailable')}</dd></div>
              <div><dt className="font-medium">{t('dataSources.normalizedAliases')}</dt><dd>{record.normalizedAliases?.join(', ') || t('common.notAvailable')}</dd></div>
              <div><dt className="font-medium">{t('dataSources.arabicNormalizedAliases')}</dt><dd>{record.arabicNormalizedAliases?.join(', ') || t('common.notAvailable')}</dd></div>
              <div><dt className="font-medium">{t('dataSources.entityType')}</dt><dd>{record.entityType}</dd></div>
              <div><dt className="font-medium">{t('screening.nationality')}</dt><dd>{record.nationality ?? t('common.notAvailable')}</dd></div>
              <div><dt className="font-medium">{t('dataSources.dateOfBirth')}</dt><dd>{record.dateOfBirth ?? t('common.notAvailable')}</dd></div>
              <div><dt className="font-medium">{t('dataSources.documents')}</dt><dd>{record.documentNumbers.join(', ') || t('common.notAvailable')}</dd></div>
              <div><dt className="font-medium">{t('dataSources.programOrList')}</dt><dd>{record.programOrListType || t('common.notAvailable')}</dd></div>
            </dl>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t('dataSources.versionProvenance')}</h2>
            <dl className="mt-3 grid gap-2 text-sm text-slate-700">
              <div><dt className="font-medium">{t('dataSources.versionLabel')}</dt><dd>{record.versionLabel}</dd></div>
              <div><dt className="font-medium">{t('dataSources.versionStatus')}</dt><dd>{record.versionStatus}</dd></div>
              <div><dt className="font-medium">{t('dataSources.versionFileHash')}</dt><dd>{record.versionFileHash ?? t('common.notAvailable')}</dd></div>
              <div><dt className="font-medium">{t('dataSources.importedAt')}</dt><dd>{formatDateTime(record.importedAt)}</dd></div>
              <div><dt className="font-medium">{t('dataSources.externalReference')}</dt><dd>{record.externalReference ?? t('common.notAvailable')}</dd></div>
            </dl>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-white">{t('dataSources.rawPayload')}</h2>
          <pre className="mt-4 overflow-x-auto text-xs leading-6 text-slate-200">{JSON.stringify(record.rawPayload, null, 2)}</pre>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{t('dataSources.recordDetail')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('common.source')}: {sourceCode}</p>
        </div>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => router.push(`/admin/data-sources/${sourceCode}/records`)}>
          {t('dataSources.backToRecords')}
        </button>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {content}
    </section>
  );
}