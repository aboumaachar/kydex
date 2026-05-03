"use client";

import { useCallback, useEffect, useState } from "react";
import { getSourceImportStatus, getSourceSyncRuns, importSourceFromLegacy, type SourceImportStatus, type SourceSyncRunSummary } from "../../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, StateBox, StatusPill, dateText } from "../../../_components/dashboard-shell";

type SyncState = {
  importStatus: SourceImportStatus | null;
  syncRuns: SourceSyncRunSummary[];
};

export default function DashboardOfacSyncPage() {
  const [state, setState] = useState<SyncState>({ importStatus: null, syncRuns: [] });
  const [loading, setLoading] = useState(true);
  const [runningImport, setRunningImport] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [importStatus, syncRuns] = await Promise.all([
        getSourceImportStatus("OFAC"),
        getSourceSyncRuns("OFAC"),
      ]);
      setState({ importStatus, syncRuns });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load OFAC sync state");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runLegacyImport = async () => {
    const approved = globalThis.window.confirm("Import from legacy will update local source-library metadata and may take time. Continue?");
    if (!approved) {
      return;
    }

    setRunningImport(true);
    setError("");
    setNotice("");

    try {
      const result = await importSourceFromLegacy("OFAC");
      const status = typeof result.status === "string" ? result.status : "completed";
      setNotice(`Import request completed with status: ${status}`);
      await load();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import from legacy failed");
    } finally {
      setRunningImport(false);
    }
  };

  return (
    <DashboardShell
      title="OFAC Sync & Import"
      description="Review OFAC import status and sync run history. Import from legacy is manual and never auto-runs on page load."
      actions={
        <>
          <ActionButton label={runningImport ? "Importing" : "Import From Legacy"} onClick={() => void runLegacyImport()} disabled={runningImport || loading} variant="danger" />
          <ActionButton label="Refresh" onClick={() => void load()} disabled={loading || runningImport} />
        </>
      }
    >
      <DashboardCard>
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300">Warning</p>
        <p className="mt-2 text-sm text-amber-100">Import from legacy can modify local source-library state. Use only when resyncing local OFAC copy is required.</p>
      </DashboardCard>

      {loading ? <StateBox tone="loading" title="Loading import and sync status" detail="Retrieving OFAC import counters and run logs." /> : null}
      {error ? <StateBox tone="error" title="Sync page failed" detail={error} /> : null}
      {notice ? <StateBox tone="empty" title="Action complete" detail={notice} /> : null}

      {!loading && !error ? (
        <>
          <DashboardCard>
            <h2 className="text-xl font-semibold text-white">Import Status</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Imported Lists</div>
                <div className="mt-2 text-lg font-semibold text-white">{state.importStatus?.importedListCount ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">SourceEntity</div>
                <div className="mt-2 text-lg font-semibold text-white">{state.importStatus?.sourceEntityCount ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">SourceName</div>
                <div className="mt-2 text-lg font-semibold text-white">{state.importStatus?.sourceNameCount ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">SourceNameVariant</div>
                <div className="mt-2 text-lg font-semibold text-white">{state.importStatus?.sourceNameVariantCount ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Local Copy Available</div>
                <div className="mt-2"><StatusPill value={state.importStatus?.localCopyAvailable} /></div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Last Successful Sync</div>
                <div className="mt-2 text-sm font-semibold text-white">{dateText(state.importStatus?.lastSuccessfulSyncAt ?? null)}</div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard className="overflow-x-auto">
            <h2 className="text-xl font-semibold text-white">Sync Runs</h2>
            {state.syncRuns.length === 0 ? (
              <div className="mt-4">
                <StateBox tone="empty" title="No sync runs" detail="No OFAC sync run rows are currently available." />
              </div>
            ) : (
              <table className="mt-4 min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Started</th>
                    <th className="px-3 py-3">Finished</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Imported</th>
                    <th className="px-3 py-3">Failed</th>
                    <th className="px-3 py-3">File</th>
                    <th className="px-3 py-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {state.syncRuns.map((run) => (
                    <tr key={run.id} className="border-b border-slate-900/80 text-slate-200">
                      <td className="px-3 py-3 text-xs">{dateText(run.startedAt)}</td>
                      <td className="px-3 py-3 text-xs">{dateText(run.finishedAt ?? null)}</td>
                      <td className="px-3 py-3"><StatusPill value={run.status} /></td>
                      <td className="px-3 py-3">{run.syncType}</td>
                      <td className="px-3 py-3">{run.recordsImported}</td>
                      <td className="px-3 py-3">{run.recordsFailed}</td>
                      <td className="px-3 py-3 text-xs">{run.sourceFileName || "-"}</td>
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
