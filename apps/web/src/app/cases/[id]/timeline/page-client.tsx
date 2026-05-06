"use client";

import { useState } from 'react';
import { useI18n } from '../../../../i18n/i18n-provider';
import { downloadComplianceTimeline } from '../../../../lib/api';

type TimelinePageProps = {
  params: {
    id: string;
  };
};

export default function CaseTimelinePage({ params }: Readonly<TimelinePageProps>) {
  const { t } = useI18n();
  const [message, setMessage] = useState('');

  const onDownload = async () => {
    try {
      const blob = await downloadComplianceTimeline(params.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `case-${params.id}-timeline.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(t('timeline.downloaded'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('timeline.failed'));
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">{t('timeline.title')}</h1>
      <p className="mt-2 text-slate-600">{t('timeline.description')}</p>
      <button onClick={onDownload} className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
        {t('timeline.download')}
      </button>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
