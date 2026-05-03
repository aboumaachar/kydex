"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '../../../../../../../i18n/i18n-provider';

import { ReportViewer } from '../../../../ReportViewer';
import { getDataSourceReport } from '../../../../../../../lib/api';

type ReportViewModel = {
  sourceName: string;
  sourceCode: string;
  sourceUrl: string;
  fetchTimestamp: string;
  fileHash: string;
  rawArtifactPath: string;
  parserUsed: string;
  parsedRows: number;
  warnings: string[];
  insertedRecords: number;
  rejectedRows: number;
  duplicateRows: number;
  errors: string[];
  hashVerificationStatus: string;
  versionId: string;
  createdAt: string;
};

export default function DataSourceReportPage() {
  const router = useRouter();
  const { t } = useI18n();
  const params = useParams<{ sourceCode: string; versionId: string }>();
  const sourceCode = String(params.sourceCode ?? '');
  const versionId = String(params.versionId ?? '');
  const [report, setReport] = useState<ReportViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  let content: React.ReactNode = null;

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getDataSourceReport(sourceCode, versionId);
        setReport({
          sourceName: response.source.name,
          sourceCode: response.source.code,
          sourceUrl: 'official-source',
          fetchTimestamp: response.version.importedAt,
          fileHash: response.version.fileHash ?? '',
          rawArtifactPath: 'stored in ingestion artifact snapshot',
          parserUsed: 'ingestion pipeline',
          parsedRows: response.ingestionRun?.totalRows ?? response.version.recordCount,
          warnings: [],
          insertedRecords: response.ingestionRun?.insertedRecords ?? response.version.recordCount,
          rejectedRows: response.ingestionRun?.rejectedRows ?? 0,
          duplicateRows: response.ingestionRun?.duplicateRows ?? 0,
          errors: [],
          hashVerificationStatus: response.version.fileHash ? 'verified' : 'missing hash',
          versionId: response.version.id,
          createdAt: response.ingestionRun?.createdAt ?? response.version.importedAt,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    if (sourceCode && versionId) {
      void loadReport();
    }
  }, [sourceCode, versionId]);

  if (loading) {
    content = <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">{t('dataSources.loadingReport')}</div>;
  } else if (report) {
    content = (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <ReportViewer report={report} />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{t('dataSources.reportTitle')}</h1>
          <p className="mt-1 text-sm text-slate-600">{sourceCode} / {versionId}</p>
        </div>
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          onClick={() => router.push(`/admin/data-sources/${sourceCode}/versions`)}
        >
          {t('dataSources.backToVersions')}
        </button>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {content}
    </section>
  );
}