"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminUsageSummary, type AdminUsageSummary } from "../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, Metric, StateBox, StatusPill, dateText } from "../../_components/dashboard-shell";

export default function DashboardAdminUsagePage() {
  const [summary, setSummary] = useState<AdminUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminUsageSummary();
      setSummary(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load usage summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell
      title="Admin Usage"
      description="Observe monthly KYDEX usage against plan limits to support billing and abuse-control readiness."
      actions={<ActionButton label="Refresh" onClick={() => void load()} disabled={loading} />}
    >
      {loading ? <StateBox tone="loading" title="Loading usage" detail="Fetching usage totals and per-notary rows." /> : null}
      {error ? <StateBox tone="error" title="Usage load failed" detail={error} /> : null}

      {!loading && !error && summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <DashboardCard>
              <Metric label="Total Notaries" value={String(summary.totalNotaries)} />
            </DashboardCard>
            <DashboardCard>
              <Metric label="Manual Searches (Month)" value={String(summary.totals.manual)} />
            </DashboardCard>
            <DashboardCard>
              <Metric label="Image Searches (Month)" value={String(summary.totals.image)} />
            </DashboardCard>
          </div>

          <DashboardCard className="overflow-x-auto">
            <h2 className="text-xl font-semibold text-white">Per-notary Usage</h2>
            <table className="mt-4 min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-3 py-3">Notary</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Limit (M/I)</th>
                  <th className="px-3 py-3">Usage (M/I)</th>
                  <th className="px-3 py-3">Billing End</th>
                </tr>
              </thead>
              <tbody>
                {summary.items.map((item) => (
                  <tr key={item.slug} className="border-b border-slate-900/80 text-slate-200">
                    <td className="px-3 py-3">
                      <p className="font-medium text-white">{item.displayName}</p>
                      <p className="text-xs text-slate-500">{item.slug}</p>
                    </td>
                    <td className="px-3 py-3"><StatusPill value={item.membershipStatus} /></td>
                    <td className="px-3 py-3">{item.planName}</td>
                    <td className="px-3 py-3">{item.planLimitManualSearches}/{item.planLimitImageSearches}</td>
                    <td className="px-3 py-3">{item.monthlyUsageManual}/{item.monthlyUsageImage}</td>
                    <td className="px-3 py-3 text-xs">{dateText(item.billingPeriodEnd || null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardCard>
        </>
      ) : null}
    </DashboardShell>
  );
}
