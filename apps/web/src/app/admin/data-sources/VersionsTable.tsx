"use client";

import React from 'react';
import { useI18n } from '../../../i18n/i18n-provider';

export interface VersionRow {
  versionId: string;
  importedAt: string;
  fileHash: string;
  parsedRows: number;
  inserted: number;
  rejected: number;
  duplicates: number;
  status: string;
  isActive: boolean;
}

interface Props {
  data: VersionRow[];
  canMutate: boolean;
  onActivate: (versionId: string) => void;
  onViewReport: (versionId: string) => void;
  onArchive: (versionId: string) => void;
  onViewRecords: (versionId: string) => void;
}

export const VersionsTable: React.FC<Props> = ({ data, canMutate, onActivate, onViewReport, onArchive, onViewRecords }) => {
  const { formatDateTime, formatNumber, t } = useI18n();

  return (
    <table className="kydex-table min-w-full border">
      <thead>
        <tr>
          <th>{t('dataSources.versionId')}</th>
          <th>{t('dataSources.importedAt')}</th>
          <th>{t('dataSources.fileHash')}</th>
          <th>{t('dataSources.parsedRows')}</th>
          <th>{t('dataSources.inserted')}</th>
          <th>{t('dataSources.rejected')}</th>
          <th>{t('dataSources.duplicates')}</th>
          <th>{t('common.status')}</th>
          <th>{t('dataSources.active')}</th>
          <th>{t('dataSources.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.versionId}>
            <td>{row.versionId}</td>
            <td>{formatDateTime(row.importedAt)}</td>
            <td>{row.fileHash}</td>
            <td>{formatNumber(row.parsedRows)}</td>
            <td>{formatNumber(row.inserted)}</td>
            <td>{formatNumber(row.rejected)}</td>
            <td>{formatNumber(row.duplicates)}</td>
            <td>{row.status}</td>
            <td>{row.isActive ? '✔' : ''}</td>
            <td>
              <div className="flex flex-wrap gap-2">
                {canMutate && !row.isActive && row.status !== 'FAILED' && (
                  <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onActivate(row.versionId)}>{t('dataSources.setActive')}</button>
                )}
                <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onViewReport(row.versionId)}>{t('dataSources.viewReport')}</button>
                <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onViewRecords(row.versionId)}>{t('dataSources.viewRecords')}</button>
                {canMutate ? <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onArchive(row.versionId)}>{t('dataSources.archive')}</button> : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
