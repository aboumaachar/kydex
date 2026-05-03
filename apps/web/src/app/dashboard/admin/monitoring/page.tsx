"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminMonitoringSummary, type AdminMonitoringSummary } from "../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, Metric, StateBox, StatusPill, dateText } from "../../_components/dashboard-shell";

export default function DashboardAdminMonitoringPage() {
  const [data, setData] = useState<AdminMonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getAdminMonitoringSummary();
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load monitoring summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell
      title="Admin Monitoring"
      description="Track API/OFAC health, sync failures, fallback activations, auth failures, OCR issues, and high-risk events."
      actions={<ActionButton label="Refresh" onClick={() => void load()} disabled={loading} />}
    >
      {loading ? <StateBox tone="loading" title="Loading monitoring" detail="Collecting current telemetry and alert counters." /> : null}
      {error ? <StateBox tone="error" title="Monitoring load failed" detail={error} /> : null}

      {!loading && !error && data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <DashboardCard>
              <Metric label="API Health" value={data.apiHealth} />
            </DashboardCard>
            <DashboardCard>
              <Metric label="OFAC Status" value={data.ofac.status} />
            </DashboardCard>
            <DashboardCard>
              <Metric label="Sync Failures 24h" value={String(data.ofac.syncFailures24h)} />
            </DashboardCard>
          </div>

          <DashboardCard>
            <h2 className="text-xl font-semibold text-white">Alert Counters</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Metric label="Failed Auth 1h" value={String(data.alerts.failedNotaryAuthLastHour)} />
              <Metric label="Failed Auth 24h" value={String(data.alerts.failedNotaryAuthLast24h)} />
              <Metric label="Fallback Activations 24h" value={String(data.alerts.fallbackActivations24h)} />
              <Metric label="OCR Errors 24h" value={String(data.alerts.ocrErrors24h)} />
              <Metric label="WP Errors 24h" value={String(data.alerts.wordpressPluginErrors24h)} />
              <Metric label="High Risk Matches 24h" value={String(data.alerts.highRiskMatchEvents24h)} />
            </div>
          </DashboardCard>

          <DashboardCard className="overflow-x-auto">
            <h2 className="text-xl font-semibold text-white">Recent OFAC Sync Runs</h2>
            <table className="mt-4 min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-3 py-3">Started</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Imported</th>
                  <th className="px-3 py-3">Failed</th>
                  <th className="px-3 py-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSyncRuns.map((run) => (
                  <tr key={run.id} className="border-b border-slate-900/80 text-slate-200">
                    <td className="px-3 py-3 text-xs">{dateText(run.startedAt)}</td>
                    <td className="px-3 py-3">{run.syncType}</td>
                    <td className="px-3 py-3"><StatusPill value={run.status} /></td>
                    <td className="px-3 py-3">{run.recordsImported}</td>
                    <td className="px-3 py-3">{run.recordsFailed}</td>
                    <td className="px-3 py-3 text-xs text-rose-200">{run.error || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardCard>

          <DashboardCard>
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300">Generated</p>
            <p className="mt-2 text-sm text-slate-300">Snapshot generated at {dateText(data.generatedAt)}</p>
            <p className="mt-2 text-sm text-slate-400">Last OFAC health check: {dateText(data.ofac.lastHealthCheckAt || null)}</p>
            <p className="mt-1 text-sm text-slate-400">Last OFAC successful sync: {dateText(data.ofac.lastSuccessfulSyncAt || null)}</p>
            <p className="mt-1 text-sm text-slate-400">Last OFAC error: {data.ofac.lastError || "-"}</p>
          </DashboardCard>
        </>
      ) : null}
    </DashboardShell>
  );
}
