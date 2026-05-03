"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, getScreeningLogs, type ScreeningLogRow } from "../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, StateBox, StatusPill, dateText } from "../../_components/dashboard-shell";

const PAGE_SIZE = 50;

type ErrorState = {
  kind: "unauthorized" | "notFound" | "network" | "server" | "generic";
  message: string;
};

export default function DashboardScreeningLogsPage() {
  const [items, setItems] = useState<ScreeningLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getScreeningLogs(PAGE_SIZE, 0);
      setItems(Array.isArray(response.items) ? response.items : []);
    } catch (loadError) {
      if (loadError instanceof ApiRequestError) {
        if (loadError.status === 401 || loadError.status === 403) {
          setError({ kind: "unauthorized", message: "Session expired or unauthorized. Please sign in again." });
        } else if (loadError.status === 404) {
          setError({ kind: "notFound", message: "Endpoint unavailable or not yet exposed." });
        } else if (loadError.status === 500) {
          setError({ kind: "server", message: "Server error while loading screening logs." });
        } else if (loadError.kind === "network") {
          setError({ kind: "network", message: "KYDEX API is unreachable. Check that the API server is running." });
        } else {
          setError({ kind: "generic", message: loadError.message || "Failed to load screening logs." });
        }
      } else {
        setError({ kind: "generic", message: "Failed to load screening logs." });
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell
      title="Screening Logs"
      description="Transaction-level screening log surface for query behavior, fallback usage, and response timing. Records support investigator review and are not final determinations."
      actions={<ActionButton label="Refresh" onClick={() => void load()} disabled={loading} />}
    >
      {loading ? <StateBox tone="loading" title="Loading screening logs" detail="Requesting /api/v1/screening/logs." /> : null}

      {!loading && error ? (
        <DashboardCard>
          <StateBox tone={error.kind === "notFound" ? "empty" : "error"} title={error.message} />
          {error.kind === "unauthorized" ? (
            <div className="mt-4">
              <Link
                href="/login"
                className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
              >
                Go to Login
              </Link>
            </div>
          ) : null}
        </DashboardCard>
      ) : null}

      {!loading && !error ? (
        <DashboardCard className="overflow-x-auto">
          {items.length === 0 ? (
            <StateBox tone="empty" title="No screening transactions" detail="No screening log rows were returned." />
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-3 py-3">Query</th>
                  <th className="px-3 py-3">Normalized Query</th>
                  <th className="px-3 py-3">Source Mode</th>
                  <th className="px-3 py-3">Used Fallback</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">IP</th>
                  <th className="px-3 py-3">Response Time</th>
                  <th className="px-3 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-slate-900/80 text-slate-200">
                    <td className="px-3 py-3">{row.query}</td>
                    <td className="px-3 py-3">{row.normalizedQuery || "-"}</td>
                    <td className="px-3 py-3"><StatusPill value={row.sourceMode} /></td>
                    <td className="px-3 py-3"><StatusPill value={row.usedFallback} /></td>
                    <td className="px-3 py-3"><StatusPill value={row.status} /></td>
                    <td className="px-3 py-3">{row.highestScore}</td>
                    <td className="px-3 py-3">{row.apiClient || "-"}</td>
                    <td className="px-3 py-3">{row.ipAddress || "-"}</td>
                    <td className="px-3 py-3">{row.responseTimeMs !== null && row.responseTimeMs !== undefined ? `${row.responseTimeMs} ms` : "-"}</td>
                    <td className="px-3 py-3 text-xs">{dateText(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DashboardCard>
      ) : null}
    </DashboardShell>
  );
}
