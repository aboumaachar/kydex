"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/i18n-provider';
import {
  createIntegrationKey,
  IntegrationKeySummary,
  listIntegrationKeys,
  rotateIntegrationKey,
  updateIntegrationKeyStatus,
} from '../../../lib/api';

const CAPABILITIES = ['screen', 'bulk-screen', 'status', 'usage'];

function toList(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export default function AdminIntegrationsPage() {
  const { t } = useI18n();
  const [keys, setKeys] = useState<IntegrationKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [secretNotice, setSecretNotice] = useState('');
  const [name, setName] = useState('Notary Core Plugin');
  const [domains, setDomains] = useState('localhost');
  const [ips, setIps] = useState('127.0.0.1');
  const [capabilities, setCapabilities] = useState<string[]>(['screen', 'status', 'usage']);
  const [enabled, setEnabled] = useState(true);

  const canSubmit = useMemo(() => name.trim().length >= 3 && capabilities.length > 0, [capabilities.length, name]);

  const loadKeys = async () => {
    setLoading(true);
    setError('');

    try {
      const nextKeys = await listIntegrationKeys();
      setKeys(nextKeys);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load integration keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadKeys();
  }, []);

  const toggleCapability = (capability: string) => {
    setCapabilities((previous) =>
      previous.includes(capability)
        ? previous.filter((entry) => entry !== capability)
        : [...previous, capability],
    );
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSecretNotice('');

    try {
      const created = await createIntegrationKey({
        name,
        capabilities,
        allowedDomains: toList(domains),
        allowedIps: toList(ips),
        enabled,
      });
      setSecretNotice(created.rawKey);
      await loadKeys();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create integration key');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRotate = async (keyId: string) => {
    setError('');
    setSecretNotice('');

    try {
      const rotated = await rotateIntegrationKey(keyId);
      setSecretNotice(rotated.rawKey);
      await loadKeys();
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : 'Failed to rotate integration key');
    }
  };

  const handleStatusChange = async (keyId: string, status: 'ACTIVE' | 'DISABLED' | 'REVOKED') => {
    setError('');

    try {
      await updateIntegrationKeyStatus(keyId, status);
      await loadKeys();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update integration key');
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{t('integrations.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('integrations.description')}</p>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {secretNotice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">{t('integrations.secretLabel')}</p>
          <p className="mt-2 break-all font-mono text-xs">{secretNotice}</p>
        </div>
      ) : null}

      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleCreate}>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('integrations.createTitle')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('integrations.createDescription')}</p>
        </div>
        <input
          className="rounded-lg border border-slate-300 px-4 py-2"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('integrations.keyName')}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <textarea
            className="min-h-28 rounded-lg border border-slate-300 px-4 py-2"
            value={domains}
            onChange={(event) => setDomains(event.target.value)}
            placeholder={t('integrations.allowedDomains')}
          />
          <textarea
            className="min-h-28 rounded-lg border border-slate-300 px-4 py-2"
            value={ips}
            onChange={(event) => setIps(event.target.value)}
            placeholder={t('integrations.allowedIps')}
          />
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-700">{t('integrations.capabilities')}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {CAPABILITIES.map((capability) => (
              <label key={capability} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={capabilities.includes(capability)}
                  onChange={() => toggleCapability(capability)}
                />
                <span>{capability}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          <span>{t('integrations.enabled')}</span>
        </label>
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {submitting ? t('integrations.creating') : t('integrations.createKey')}
        </button>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{t('integrations.existingKeys')}</h2>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700" onClick={() => void loadKeys()}>
            {t('common.refresh')}
          </button>
        </div>

        {loading ? <p className="mt-4 text-sm text-slate-600">{t('integrations.loading')}</p> : null}
        {!loading && keys.length === 0 ? <p className="mt-4 text-sm text-slate-600">{t('integrations.empty')}</p> : null}

        {!loading && keys.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('integrations.keyName')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.status')}</th>
                  <th className="px-4 py-3 font-medium">{t('integrations.capabilities')}</th>
                  <th className="px-4 py-3 font-medium">{t('integrations.restrictions')}</th>
                  <th className="px-4 py-3 font-medium">{t('integrations.lastUsed')}</th>
                  <th className="px-4 py-3 font-medium">{t('integrations.usageCount')}</th>
                  <th className="px-4 py-3 font-medium">{t('dataSources.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keys.map((key) => {
                  let toggleButton: React.ReactNode = null;
                  if (key.status === 'ACTIVE') {
                    toggleButton = (
                      <button type="button" className="rounded border border-slate-300 px-3 py-1 text-xs" onClick={() => void handleStatusChange(key.id, 'DISABLED')}>
                        {t('integrations.disable')}
                      </button>
                    );
                  } else if (key.status === 'DISABLED') {
                    toggleButton = (
                      <button type="button" className="rounded border border-slate-300 px-3 py-1 text-xs" onClick={() => void handleStatusChange(key.id, 'ACTIVE')}>
                        {t('integrations.enable')}
                      </button>
                    );
                  }

                  const showRevoke = key.status === 'ACTIVE' || key.status === 'DISABLED';

                  return (
                  <tr key={key.id}>
                    <td className="px-4 py-3 text-slate-900">
                      <p className="font-medium">{key.name}</p>
                      <p className="text-xs text-slate-500">{key.id}</p>
                    </td>
                    <td className="px-4 py-3">{key.status}</td>
                    <td className="px-4 py-3">{key.capabilities.join(', ') || t('common.none')}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p>{t('integrations.allowedDomains')}: {key.allowedDomains.join(', ') || t('common.none')}</p>
                      <p>{t('integrations.allowedIps')}: {key.allowedIps.join(', ') || t('common.none')}</p>
                    </td>
                    <td className="px-4 py-3">{key.lastUsedAt ?? t('common.notAvailable')}</td>
                    <td className="px-4 py-3">{key.usageCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="rounded border border-slate-300 px-3 py-1 text-xs" onClick={() => void handleRotate(key.id)}>
                          {t('integrations.rotate')}
                        </button>
                        {toggleButton}
                        {showRevoke ? (
                          <button type="button" className="rounded border border-rose-300 px-3 py-1 text-xs text-rose-700" onClick={() => void handleStatusChange(key.id, 'REVOKED')}>
                            {t('integrations.revoke')}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}