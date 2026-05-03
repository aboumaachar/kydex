"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSourceImportStatus, getSourceStatus, getSourcesRegistry, type SourceImportStatus, type SourceRegistryItem } from "../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, Metric, StateBox, StatusPill, dateText } from "../_components/dashboard-shell";

type SourcesState = {
  sources: SourceRegistryItem[];
  ofacStatus: SourceRegistryItem | null;
  ofacImport: SourceImportStatus | null;
};

export default function DashboardSourcesPage() {
  const [state, setState] = useState<SourcesState>({ sources: [], ofacStatus: null, ofacImport: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [sources, ofacStatus, ofacImport] = await Promise.all([
        getSourcesRegistry(),
        getSourceStatus("OFAC"),
        getSourceImportStatus("OFAC"),
      ]);
      setState({ sources, ofacStatus, ofacImport });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load source registry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell
      title="Source Library"
      description="Monitor official source health, local copy availability, and fallback readiness for KYDEX screening."
      actions={<ActionButton label="Refresh" onClick={() => void load()} disabled={loading} />}
    >
      {loading ? <StateBox tone="loading" title="Loading source registry" detail="Retrieving source cards and OFAC import status." /> : null}
      {error ? <StateBox tone="error" title="Failed to load sources" detail={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <DashboardCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300">Primary Source</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">OFAC Sanctions List Service</h2>
                <p className="mt-2 text-sm text-slate-400">Operational card for local copy, fallback posture, and synchronization activity.</p>
              </div>
              <StatusPill value={state.ofacStatus?.status} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Metric label="Local Copy" value={String(Boolean(state.ofacStatus?.localCopyAvailable))} />
              <Metric label="Fallback Enabled" value={String(Boolean(state.ofacStatus?.fallbackEnabled))} />
              <Metric label="Last Sync" value={dateText(state.ofacImport?.lastSuccessfulSyncAt ?? state.ofacStatus?.lastSuccessfulSyncAt ?? null)} />
              <Metric label="Last Health" value={dateText(state.ofacStatus?.lastHealthCheckAt ?? null)} />
              <Metric label="SourceEntity" value={String(state.ofacImport?.sourceEntityCount ?? 0)} />
              <Metric label="SourceNameVariant" value={String(state.ofacImport?.sourceNameVariantCount ?? 0)} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/dashboard/sources/ofac" className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-slate-600 hover:text-white">
                OFAC Details
              </Link>
              <Link href="/dashboard/sources/ofac/local-lists" className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-slate-600 hover:text-white">
                Local Lists
              </Link>
              <Link href="/dashboard/sources/ofac/sync" className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-slate-600 hover:text-white">
                Sync & Import
              </Link>
              <Link href="/dashboard/sources/ofac/logs" className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-slate-600 hover:text-white">
                Source Logs
              </Link>
              <Link href="/dashboard/sources/ofac/downloads" className="rounded-full border border-teal-800 bg-teal-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200 transition-colors hover:border-teal-600 hover:text-white">
                Downloads ↓
              </Link>
            </div>
          </DashboardCard>

          <DashboardCard>
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300">Source Registry</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Available Sources</h2>
            <p className="mt-2 text-sm text-slate-400">Current KYDEX source registry from /api/v1/sources.</p>

            {state.sources.length === 0 ? (
              <div className="mt-5">
                <StateBox tone="empty" title="No sources found" detail="No source rows are currently registered." />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {state.sources.map((source) => (
                  <div key={source.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{source.code} - {source.name}</p>
                        <p className="mt-1 text-xs text-slate-400">Last attempted sync: {dateText(source.lastAttemptedSyncAt ?? null)}</p>
                      </div>
                      <StatusPill value={source.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>
        </div>
      ) : null}
    </DashboardShell>
  );
}
