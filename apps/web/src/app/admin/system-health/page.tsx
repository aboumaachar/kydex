"use client";

import { useEffect, useState } from 'react';
import { apiRequest, getAuthToken } from '../../../lib/api';

type HealthResponse = {
  status?: string;
  checks?: Record<string, { ok: boolean; message?: string }>;
};

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<HealthResponse>('/health/preflight', {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
      .then((data) => setHealth(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load health status'));
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">System Health</h1>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      <p className="mt-2 text-slate-600">Status: {health?.status ?? 'loading'}</p>
      <ul className="mt-4 list-disc space-y-1 pl-6 text-sm text-slate-700">
        {Object.entries(health?.checks ?? {}).map(([key, value]) => (
          <li key={key}>
            {key}: {value.ok ? 'ok' : 'not ok'}
          </li>
        ))}
      </ul>
    </section>
  );
}
