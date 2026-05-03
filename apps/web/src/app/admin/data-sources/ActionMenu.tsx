"use client";

import React from 'react';
import { useI18n } from '../../../i18n/i18n-provider';

interface Props {
  code: string;
  status: string;
  latestVersionId: string | null;
  onSync: (code: string) => void;
  onToggleEnabled: (code: string, nextStatus: 'ACTIVE' | 'DISABLED') => void;
  onViewVersions: (code: string) => void;
  onViewRecords: (code: string) => void;
  onViewReport: (code: string, versionId: string) => void;
  onViewSyncHistory: (code: string) => void;
}

export const ActionMenu: React.FC<Props> = ({ code, status, latestVersionId, onSync, onToggleEnabled, onViewVersions, onViewRecords, onViewReport, onViewSyncHistory }) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap gap-2">
      <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onSync(code)}>{t('dataSources.sync')}</button>
      <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onToggleEnabled(code, status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE')}>
        {status === 'ACTIVE' ? t('dataSources.disable') : t('dataSources.enable')}
      </button>
      <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onViewVersions(code)}>{t('dataSources.versions')}</button>
      <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onViewSyncHistory(code)}>{t('dataSources.syncHistory')}</button>
      <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onViewRecords(code)}>{t('dataSources.records')}</button>
      {latestVersionId ? (
        <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onViewReport(code, latestVersionId)}>
          {t('dataSources.lastReport')}
        </button>
      ) : null}
    </div>
  );
};
