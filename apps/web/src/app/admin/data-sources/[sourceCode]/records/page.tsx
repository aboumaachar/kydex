"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '../../../../../i18n/i18n-provider';
import { getDataSourceRecords, getDataSourceVersions, type DataSourceRecordFilters, type DataSourceRecordsResponse, type DataSourceVersionSummary } from '../../../../../lib/api';
import { RecordsTable } from './RecordsTable';

function buildFilters(searchParams: URLSearchParams): DataSourceRecordFilters {
  return {
    q: searchParams.get('q') ?? '',
    alias: searchParams.get('alias') ?? '',
    nationality: searchParams.get('nationality') ?? '',
    entityType: searchParams.get('entityType') ?? '',
    documentNumber: searchParams.get('documentNumber') ?? '',
    program: searchParams.get('program') ?? '',
    versionId: searchParams.get('versionId') ?? '',
    sort: searchParams.get('sort') ?? 'created_desc',
    page: Number(searchParams.get('page') ?? '1'),
    limit: Number(searchParams.get('limit') ?? '25'),
  };
}

export default function DataSourceRecordsPage() {
  const router = useRouter();
  const { formatNumber, t } = useI18n();
  const params = useParams<{ sourceCode: string }>();
  const searchParams = useSearchParams();
  const sourceCode = String(params.sourceCode ?? '');
  const searchKey = searchParams.toString();
  const [response, setResponse] = useState<DataSourceRecordsResponse | null>(null);
  const [versions, setVersions] = useState<DataSourceVersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formState, setFormState] = useState<DataSourceRecordFilters>(buildFilters(searchParams));

  const activeFilters = useMemo(() => buildFilters(searchParams), [searchKey]);

  useEffect(() => {
    setFormState(buildFilters(searchParams));
  }, [searchKey, searchParams]);

  useEffect(() => {
    if (!sourceCode) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [records, sourceVersions] = await Promise.all([
          getDataSourceRecords(sourceCode, activeFilters),
          getDataSourceVersions(sourceCode),
        ]);
        setResponse(records);
        setVersions(sourceVersions);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load records');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [activeFilters, sourceCode]);

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new URLSearchParams();

    Object.entries({ ...formState, page: 1 }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        query.set(key, String(value));
      }
    });

    router.push(`/admin/data-sources/${sourceCode}/records?${query.toString()}`);
  };

  const goToPage = (page: number) => {
    const query = new URLSearchParams(searchKey);
    query.set('page', String(page));
    router.push(`/admin/data-sources/${sourceCode}/records?${query.toString()}`);
  };

  let content: JSX.Element | null = null;

  if (loading) {
    content = <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">{t('dataSources.loadingRecords')}</div>;
  } else if (response) {
    content = (
      <>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {formatNumber(response.total)} {t('dataSources.matchedRecords')} {t('dataSources.page')} {formatNumber(response.page)} {t('dataSources.of')} {formatNumber(Math.max(Math.ceil(response.total / response.limit), 1))}.
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <RecordsTable rows={response.records} onOpen={(recordId) => router.push(`/admin/data-sources/${sourceCode}/records/${recordId}`)} />
        </div>
        <div className="flex items-center justify-end gap-3">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50" disabled={response.page <= 1} onClick={() => goToPage(response.page - 1)}>{t('dataSources.previous')}</button>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50" disabled={response.page * response.limit >= response.total} onClick={() => goToPage(response.page + 1)}>{t('dataSources.next')}</button>
        </div>
      </>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{t('dataSources.recordsTitle')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('dataSources.canonicalSource')}: {sourceCode}</p>
        </div>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => router.push(`/admin/data-sources/${sourceCode}/versions`)}>
          {t('dataSources.backToVersions')}
        </button>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4" onSubmit={submitFilters}>
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder={t('dataSources.nameOrNormalized')} value={formState.q ?? ''} onChange={(event) => setFormState((current) => ({ ...current, q: event.target.value }))} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder={t('dataSources.aliasContains')} value={formState.alias ?? ''} onChange={(event) => setFormState((current) => ({ ...current, alias: event.target.value }))} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder={t('screening.nationality')} value={formState.nationality ?? ''} onChange={(event) => setFormState((current) => ({ ...current, nationality: event.target.value }))} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder={t('dataSources.programList')} value={formState.program ?? ''} onChange={(event) => setFormState((current) => ({ ...current, program: event.target.value }))} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder={t('screening.documentNumber')} value={formState.documentNumber ?? ''} onChange={(event) => setFormState((current) => ({ ...current, documentNumber: event.target.value }))} />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formState.entityType ?? ''} onChange={(event) => setFormState((current) => ({ ...current, entityType: event.target.value }))}>
          <option value="">{t('dataSources.allEntityTypes')}</option>
          <option value="PERSON">Person</option>
          <option value="ENTITY">Entity</option>
          <option value="VESSEL">Vessel</option>
        </select>
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formState.versionId ?? ''} onChange={(event) => setFormState((current) => ({ ...current, versionId: event.target.value }))}>
          <option value="">{t('dataSources.allVersions')}</option>
          {versions.map((version) => (
            <option key={version.id} value={version.id}>{version.versionLabel} ({version.status})</option>
          ))}
        </select>
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formState.sort ?? 'created_desc'} onChange={(event) => setFormState((current) => ({ ...current, sort: event.target.value }))}>
          <option value="created_desc">{t('dataSources.newestFirst')}</option>
          <option value="created_asc">{t('dataSources.oldestFirst')}</option>
          <option value="name_asc">{t('dataSources.nameAsc')}</option>
          <option value="name_desc">{t('dataSources.nameDesc')}</option>
        </select>
        <div className="flex items-center gap-3 md:col-span-4">
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="submit">{t('common.applyFilters')}</button>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" type="button" onClick={() => router.push(`/admin/data-sources/${sourceCode}/records`)}>{t('common.reset')}</button>
        </div>
      </form>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {content}
    </section>
  );
}