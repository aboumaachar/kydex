"use client";

import React from 'react';
import { useI18n } from '../../../i18n/i18n-provider';
import { StatusBadge } from './StatusBadge';
import { ActionMenu } from './ActionMenu';

export interface DataSourceRow {
  code: string;
  name: string;
  status: string;
  lastFullSync: string;
  lastSuccessfulSync: string;
  lastFailedSync: string;
  activeVersion: string;
  recordCount: number;
  fileHash: string;
  health: string;
  lastSyncActor: string;
  syncDurationMs: number | null;
  rejectedRows: number;
  latestVersionId: string | null;
  syncHistoryPath?: string;
  staleWarning?: string | null;
}

interface Props {
  data: DataSourceRow[];
  onSync: (code: string) => void;
  onToggleEnabled: (code: string, nextStatus: 'ACTIVE' | 'DISABLED') => void;
  onViewVersions: (code: string) => void;
  onViewRecords: (code: string) => void;
  onViewReport: (code: string, versionId: string) => void;
  onViewSyncHistory: (code: string) => void;
}

export const DataSourcesTable: React.FC<Props> = ({ data, onSync, onToggleEnabled, onViewVersions, onViewRecords, onViewReport, onViewSyncHistory }) => {
  const { formatDateTime, formatNumber, t } = useI18n();

  const formatDuration = (milliseconds: number | null) => {
    if (!milliseconds || milliseconds <= 0) {
      return t('common.notAvailable');
    }

    const seconds = Math.round(milliseconds / 1000);
    return `${seconds}s`;
  };

  return (
    <table className="kydex-table min-w-full border">
      <thead>
        <tr>
          <th>{t('dataSources.sourceName')}</th>
          <th>{t('dataSources.sourceCode')}</th>
          <th>{t('common.status')}</th>
          <th>{t('dataSources.lastFullSync')}</th>
          <th>{t('dataSources.lastSuccessfulSync')}</th>
          <th>{t('dataSources.lastFailedSync')}</th>
          <th>{t('dataSources.activeVersion')}</th>
          <th>{t('dataSources.recordCount')}</th>
          <th>{t('dataSources.fileHash')}</th>
          <th>{t('dataSources.health')}</th>
          <th>{t('dataSources.lastSyncActor')}</th>
          <th>{t('dataSources.syncDuration')}</th>
          <th>{t('dataSources.rejected')}</th>
          <th>{t('dataSources.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.code} className="align-top">
            <td>{row.name}</td>
            <td>{row.code}</td>
            <td>{row.status}</td>
            <td>{row.lastFullSync ? formatDateTime(row.lastFullSync) : t('common.notAvailable')}</td>
            <td>{row.lastSuccessfulSync ? formatDateTime(row.lastSuccessfulSync) : t('common.notAvailable')}</td>
            <td>{row.lastFailedSync ? formatDateTime(row.lastFailedSync) : t('common.notAvailable')}</td>
            <td>{row.activeVersion}</td>
            <td>{formatNumber(row.recordCount)}</td>
            <td className="max-w-40 truncate">{row.fileHash || t('common.notAvailable')}</td>
            <td><StatusBadge health={row.health} /></td>
            <td>{row.lastSyncActor || t('common.notAvailable')}</td>
            <td>{formatDuration(row.syncDurationMs)}</td>
            <td>{formatNumber(row.rejectedRows)}</td>
            <td>
              <ActionMenu
                code={row.code}
                status={row.status}
                latestVersionId={row.latestVersionId}
                onSync={onSync}
                onToggleEnabled={onToggleEnabled}
                onViewVersions={onViewVersions}
                onViewRecords={onViewRecords}
                onViewReport={onViewReport}
                onViewSyncHistory={onViewSyncHistory}
              />
              {row.staleWarning ? <p className="mt-2 max-w-xs text-xs text-amber-700">{row.staleWarning}</p> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
