"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSourceImportStatus, getSourceStatus, runSourceHealthCheck, type SourceHealthCheckResult, type SourceImportStatus, type SourceRegistryItem } from "../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, Metric, StateBox, StatusPill, dateText } from "../../_components/dashboard-shell";

type OfacState = {
  status: SourceRegistryItem | null;
  importStatus: SourceImportStatus | null;
  latestHealth: SourceHealthCheckResult | null;
};

export default function DashboardOfacPage() {
  const [state, setState] = useState<OfacState>({ status: null, importStatus: null, latestHealth: null });
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [status, importStatus] = await Promise.all([
        getSourceStatus("OFAC"),
        getSourceImportStatus("OFAC"),
      ]);
      setState((prev) => ({ ...prev, status, importStatus }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load OFAC status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runHealthCheck = async () => {
    setRunningCheck(true);
    setError("");

    try {
      const result = await runSourceHealthCheck("OFAC");
      setState((prev) => ({ ...prev, latestHealth: result }));
      await load();
    } catch (healthError) {
      setError(healthError instanceof Error ? healthError.message : "Failed to run OFAC health check");
    } finally {
      setRunningCheck(false);
    }
  };

  return (
    <DashboardShell
      title="OFAC Source Status"
      description="Inspect OFAC connectivity, local source-library counts, and fallback readiness."
      actions={
        <>
          <ActionButton label={runningCheck ? "Running Check" : "Run Health-Check"} onClick={() => void runHealthCheck()} disabled={runningCheck || loading} variant="primary" />
          <ActionButton label="Refresh" onClick={() => void load()} disabled={loading || runningCheck} />
        </>
      }
    >
      {loading ? <StateBox tone="loading" title="Loading OFAC source status" detail="Reading source health and local import counts." /> : null}
      {error ? <StateBox tone="error" title="OFAC status failed" detail={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <DashboardCard>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Live Source Health</h2>
              <StatusPill value={state.status?.status} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric label="Fallback Enabled" value={String(Boolean(state.status?.fallbackEnabled))} />
              <Metric label="Local Copy Available" value={String(Boolean(state.status?.localCopyAvailable))} />
              <Metric label="Last Health Check" value={dateText(state.status?.lastHealthCheckAt ?? null)} />
              <Metric label="Latency (ms)" value={state.status?.lastLatencyMs !== null && state.status?.lastLatencyMs !== undefined ? String(state.status.lastLatencyMs) : "-"} />
              <Metric label="Last Successful Sync" value={dateText(state.status?.lastSuccessfulSyncAt ?? null)} />
              <Metric label="Last Attempted Sync" value={dateText(state.status?.lastAttemptedSyncAt ?? null)} />
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Last Error</p>
              <p className="mt-2 text-sm text-slate-300">{state.status?.lastError || "No recent source error recorded."}</p>
            </div>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-xl font-semibold text-white">Local Source Library Counts</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric label="Imported Lists" value={String(state.importStatus?.importedListCount ?? 0)} />
              <Metric label="SourceEntity" value={String(state.importStatus?.sourceEntityCount ?? 0)} />
              <Metric label="SourceName" value={String(state.importStatus?.sourceNameCount ?? 0)} />
              <Metric label="SourceNameVariant" value={String(state.importStatus?.sourceNameVariantCount ?? 0)} />
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Fallback Status</p>
              <p className="mt-2 text-sm text-slate-300">
                {state.status?.fallbackEnabled && state.status?.localCopyAvailable
                  ? "Fallback can serve local OFAC copy when live source is degraded or offline."
                  : "Fallback is not currently ready for local-only continuity."}
              </p>
            </div>

            {state.latestHealth ? (
              <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200">Latest Health-Check Result</p>
                <p className="mt-2 text-sm text-cyan-100">Status: {state.latestHealth.status} | HTTP: {state.latestHealth.httpStatus ?? "-"} | Latency: {state.latestHealth.latencyMs}ms</p>
              </div>
            ) : null}
          </DashboardCard>
        </div>
      ) : null}

      <DashboardCard>
        <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300">OFAC Actions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/dashboard/sources/ofac/local-lists" className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-slate-600 hover:text-white">
            Open Local Lists
          </Link>
          <Link href="/dashboard/sources/ofac/sync" className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-slate-600 hover:text-white">
            Open Sync
          </Link>
          <Link href="/dashboard/sources/ofac/logs" className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-slate-600 hover:text-white">
            Open Logs
          </Link>
        </div>
      </DashboardCard>
    </DashboardShell>
  );
}
