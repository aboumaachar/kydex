"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getInquiries, type InquirySummary } from "../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, StateBox, StatusPill, dateText } from "../_components/dashboard-shell";

const PAGE_SIZE = 50;

export default function DashboardInquiriesPage() {
  const [items, setItems] = useState<InquirySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getInquiries(PAGE_SIZE, 0);
      setItems(response.items);
      setTotal(response.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell
      title="Incoming Inquiries"
      description="Review inquiry traffic and related screening transaction summaries."
      actions={<ActionButton label="Refresh" onClick={() => void load()} disabled={loading} />}
    >
      {loading ? <StateBox tone="loading" title="Loading inquiries" detail="Fetching inquiry list and linked transaction summaries." /> : null}
      {error ? <StateBox tone="error" title="Failed to load inquiries" detail={error} /> : null}

      {!loading && !error ? (
        <DashboardCard className="overflow-x-auto">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Inquiry Queue</h2>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total {total}</p>
          </div>

          {items.length === 0 ? (
            <StateBox tone="empty" title="No inquiries" detail="No incoming inquiries are currently stored." />
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-3 py-3">Inquiry ID</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Client Type</th>
                  <th className="px-3 py-3">Notary</th>
                  <th className="px-3 py-3">Transaction Query</th>
                  <th className="px-3 py-3">Source Mode</th>
                  <th className="px-3 py-3">Fallback</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-900/80 text-slate-200">
                    <td className="px-3 py-3 font-mono text-xs text-slate-300">{item.id}</td>
                    <td className="px-3 py-3 text-xs">{dateText(item.createdAt)}</td>
                    <td className="px-3 py-3">{item.clientType || "-"}</td>
                    <td className="px-3 py-3">{item.notarySlug || "-"}</td>
                    <td className="px-3 py-3">{item.transaction?.query || "-"}</td>
                    <td className="px-3 py-3"><StatusPill value={item.transaction?.sourceMode} /></td>
                    <td className="px-3 py-3"><StatusPill value={item.transaction?.usedFallback} /></td>
                    <td className="px-3 py-3"><StatusPill value={item.status} /></td>
                    <td className="px-3 py-3">
                      <Link href={`/dashboard/inquiries/${item.id}`} className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 transition-colors hover:border-slate-600 hover:text-white">
                        Open
                      </Link>
                    </td>
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
