'use client';

import { useState } from 'react';

type Match = {
  source: string;
  entityId: string;
  primaryName?: string;
  matchedName?: string;
  listName?: string;
  programs?: string[];
  score: number;
  riskLevel: string;
  matchReason: string;
};

type ScreeningResponse = {
  status: string;
  query: string;
  highestScore: number;
  auditId: string;
  matches: Match[];
  disclaimer: string;
};

const statusLabel: Record<string, string> = {
  clear: 'No material match found',
  weak_possible_match: 'Possible match — review suggested',
  review_required: 'Possible match — review required',
  strong_potential_match: 'Strong potential match — manual verification required',
};

export function KydexScreeningWidget({
  endpoint,
  apiKey,
}: {
  endpoint: string;
  apiKey: string;
}) {
  const [query, setQuery] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [clientReference, setClientReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreeningResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-kydex-notary-key': apiKey,
        },
        body: JSON.stringify({
          query,
          dateOfBirth: dateOfBirth || undefined,
          nationality: nationality || undefined,
          clientReference: clientReference || undefined,
          source: 'notary_webpage',
          screeningType: 'ofac',
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Screening request failed.');
      }

      setResult(payload);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">KYDEX Screening</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">OFAC name screening</h2>
        <p className="mt-2 text-sm text-slate-600">
          Search KYDEX’s locally synchronized OFAC index. Results are decision-support outputs and require professional review.
        </p>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Full name
          <input
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter full name"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Date of birth, optional
            <input
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Nationality, optional
            <input
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={nationality}
              onChange={(event) => setNationality(event.target.value)}
              placeholder="Lebanese"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Reference, optional
          <input
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
            value={clientReference}
            onChange={(event) => setClientReference(event.target.value)}
            placeholder="Internal file/reference number"
          />
        </label>

        <button
          type="button"
          disabled={!query.trim() || loading}
          onClick={submit}
          className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Screening…' : 'Run KYDEX screening'}
        </button>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-950">{statusLabel[result.status] ?? result.status}</p>
              <p className="text-sm text-slate-600">Highest score: {result.highestScore}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              Audit: {result.auditId}
            </span>
          </div>

          {result.matches?.length ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="p-3">Matched name</th>
                    <th className="p-3">List</th>
                    <th className="p-3">Program</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.matches.map((match) => (
                    <tr key={`${match.entityId}-${match.score}`} className="border-t border-slate-100">
                      <td className="p-3">{match.primaryName ?? match.matchedName}</td>
                      <td className="p-3">{match.listName ?? 'OFAC'}</td>
                      <td className="p-3">{match.programs?.join(', ') || '—'}</td>
                      <td className="p-3">{match.score}</td>
                      <td className="p-3">{statusLabel[match.riskLevel] ?? match.riskLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-slate-500">{result.disclaimer}</p>
        </div>
      ) : null}
    </section>
  );
}
