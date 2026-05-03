"use client";

import React from 'react';
import { useI18n } from '../../../../../i18n/i18n-provider';
import { type DataSourceRecordSummary } from '../../../../../lib/api';

interface Props {
  rows: DataSourceRecordSummary[];
  onOpen: (recordId: string) => void;
}

export function RecordsTable({ rows, onOpen }: Readonly<Props>) {
  const { formatDateTime, t } = useI18n();

  return (
    <table className="kydex-table min-w-full border">
      <thead>
        <tr>
          <th>{t('screening.name')}</th>
          <th>{t('dataSources.entityType')}</th>
          <th>{t('screening.nationality')}</th>
          <th>{t('screening.documentNumber')}</th>
          <th>{t('dataSources.programOrList')}</th>
          <th>{t('common.version')}</th>
          <th>{t('dataSources.importedAt')}</th>
          <th>{t('dataSources.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.primaryName}</td>
            <td>{row.entityType}</td>
            <td>{row.nationality ?? t('common.notAvailable')}</td>
            <td>{row.documentNumber ?? t('common.notAvailable')}</td>
            <td>{row.programOrListType || t('common.notAvailable')}</td>
            <td>{row.activeVersion ?? row.versionId}</td>
            <td>{formatDateTime(row.createdAt)}</td>
            <td>
              <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => onOpen(row.id)}>
                {t('common.viewDetail')}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}