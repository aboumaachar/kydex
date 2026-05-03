"use client";

import { useState } from 'react';
import { useI18n } from '../../../../i18n/i18n-provider';
import { apiRequest, getAuthToken } from '../../../../lib/api';

type EvidencePageProps = {
  params: {
    id: string;
  };
};

export default function CaseEvidencePage({ params }: Readonly<EvidencePageProps>) {
  const { t } = useI18n();
  const [message, setMessage] = useState('');

  const generatePackage = async () => {
    try {
      const response = await apiRequest<{ evidencePackageId?: string }>(`/cases/${params.id}/evidence-package`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      setMessage(`${t('evidence.created')}: ${response.evidencePackageId ?? 'ok'}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('evidence.failed'));
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">{t('evidence.title')}</h1>
      <p className="mt-2 text-slate-600">{t('evidence.description')}</p>
      <button onClick={generatePackage} className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
        {t('evidence.generate')}
      </button>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
