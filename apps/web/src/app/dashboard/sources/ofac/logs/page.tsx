"use client";

import { useCallback, useEffect, useState } from "react";
import { getSourceStatus, getSourceSyncRuns, type SourceRegistryItem, type SourceSyncRunSummary } from "../../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, StateBox, StatusPill, dateText } from "../../../_components/dashboard-shell";

type LogsState = {
  status: SourceRegistryItem | null;
  syncRuns: SourceSyncRunSummary[];
};

export default function DashboardOfacLogsPage() {
  const [state, setState] = useState<LogsState>({ status: null, syncRuns: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [status, syncRuns] = await Promise.all([
        getSourceStatus("OFAC"),
        getSourceSyncRuns("OFAC"),
      ]);
      setState({ status, syncRuns });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load OFAC source logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell
      title="OFAC Source Logs"
      description="Connection and synchronization log surface for OFAC source operations."
      actions={<ActionButton label="Refresh" onClick={() => void load()} disabled={loading} />}
    >
      {loading ? <StateBox tone="loading" title="Loading OFAC logs" detail="Reading latest source status and sync run history." /> : null}
      {error ? <StateBox tone="error" title="Could not load source logs" detail={error} /> : null}

      {!loading && !error ? (
        <>
          <DashboardCard>
            <h2 className="text-xl font-semibold text-white">Latest Connection Snapshot</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Status</div>
                <div className="mt-2"><StatusPill value={state.status?.status} /></div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Last Health Check</div>
                <div className="mt-2 text-sm font-semibold text-white">{dateText(state.status?.lastHealthCheckAt ?? null)}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Latency</div>
                <div className="mt-2 text-sm font-semibold text-white">{state.status?.lastLatencyMs !== null && state.status?.lastLatencyMs !== undefined ? `${state.status.lastLatencyMs} ms` : "-"}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Last Error</div>
                <div className="mt-2 text-xs text-rose-200">{state.status?.lastError || "-"}</div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard className="overflow-x-auto">
            <h2 className="text-xl font-semibold text-white">Sync Run Logs</h2>
            {state.syncRuns.length === 0 ? (
              <div className="mt-4">
                <StateBox tone="empty" title="No sync logs available" detail="No OFAC sync run rows were returned." />
              </div>
            ) : (
              <table className="mt-4 min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Started</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Imported</th>
                    <th className="px-3 py-3">Updated</th>
                    <th className="px-3 py-3">Failed</th>
                    <th className="px-3 py-3">Finished</th>
                    <th className="px-3 py-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {state.syncRuns.map((run) => (
                    <tr key={run.id} className="border-b border-slate-900/80 text-slate-200">
                      <td className="px-3 py-3 text-xs">{dateText(run.startedAt)}</td>
                      <td className="px-3 py-3"><StatusPill value={run.status} /></td>
                      <td className="px-3 py-3">{run.syncType}</td>
                      <td className="px-3 py-3">{run.recordsImported}</td>
                      <td className="px-3 py-3">{run.recordsUpdated}</td>
                      <td className="px-3 py-3">{run.recordsFailed}</td>
                      <td className="px-3 py-3 text-xs">{dateText(run.finishedAt ?? null)}</td>
                      <td className="px-3 py-3 text-xs text-rose-200">{run.error || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DashboardCard>
        </>
      ) : null}
    </DashboardShell>
  );
}
