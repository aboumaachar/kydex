"use client";

import React from 'react';
import { useI18n } from '../../../i18n/i18n-provider';

interface Report {
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
}

export const ReportViewer: React.FC<{ report: Report }> = ({ report }) => {
  const { formatDateTime, formatNumber, t } = useI18n();

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold">{t('dataSources.sourceMetadata')}</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>{t('dataSources.sourceName')}: {report.sourceName}</li>
          <li>{t('dataSources.sourceCode')}: {report.sourceCode}</li>
          <li>{t('dataSources.sourceUrl')}: {report.sourceUrl}</li>
          <li>{t('dataSources.fetchTimestamp')}: {formatDateTime(report.fetchTimestamp)}</li>
          <li>{t('dataSources.fileHash')}: {report.fileHash}</li>
          <li>{t('dataSources.rawArtifactPath')}: {report.rawArtifactPath}</li>
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold">{t('dataSources.parsingResults')}</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>{t('dataSources.parserUsed')}: {report.parserUsed}</li>
          <li>{t('dataSources.parsedRows')}: {formatNumber(report.parsedRows)}</li>
          <li>{t('dataSources.warnings')}: {report.warnings.join(', ') || t('common.notAvailable')}</li>
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold">{t('dataSources.ingestionResults')}</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>{t('dataSources.inserted')}: {formatNumber(report.insertedRecords)}</li>
          <li>{t('dataSources.rejected')}: {formatNumber(report.rejectedRows)}</li>
          <li>{t('dataSources.duplicates')}: {formatNumber(report.duplicateRows)}</li>
          <li>{t('dataSources.errors')}: {report.errors.join(', ') || t('common.notAvailable')}</li>
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold">{t('dataSources.integrity')}</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>{t('dataSources.hashVerificationStatus')}: {report.hashVerificationStatus}</li>
          <li>{t('dataSources.versionId')}: {report.versionId}</li>
          <li>{t('dataSources.createdAt')}: {formatDateTime(report.createdAt)}</li>
        </ul>
      </section>
    </div>
  );
};
