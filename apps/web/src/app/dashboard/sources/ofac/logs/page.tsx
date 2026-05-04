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
      title="سجلات OFAC"
      description="راجع آخر حالة اتصال وآخر عمليات المزامنة بدون عرض تقني زائد عن الحاجة."
      actions={<ActionButton label="تحديث" onClick={() => void load()} disabled={loading} />}
    >
      {loading ? <StateBox tone="loading" title="جار تحميل السجلات" detail="يتم الآن قراءة حالة المصدر وآخر عمليات المزامنة." /> : null}
      {error ? <StateBox tone="error" title="تعذر تحميل السجلات" detail={error} /> : null}

      {!loading && !error ? (
        <>
          <DashboardCard>
            <h2 className="text-xl font-semibold text-slate-950">آخر لقطة اتصال</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-[10px] tracking-[0.08em] text-slate-500">الحالة</div>
                <div className="mt-2"><StatusPill value={state.status?.status} /></div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-[10px] tracking-[0.08em] text-slate-500">آخر فحص صحة</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{dateText(state.status?.lastHealthCheckAt ?? null)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-[10px] tracking-[0.08em] text-slate-500">زمن الاستجابة</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{state.status?.lastLatencyMs !== null && state.status?.lastLatencyMs !== undefined ? `${state.status.lastLatencyMs} ms` : "-"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-[10px] tracking-[0.08em] text-slate-500">آخر خطأ</div>
                <div className="mt-2 text-xs text-rose-700">{state.status?.lastError || "-"}</div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard className="overflow-x-auto">
            <h2 className="text-xl font-semibold text-slate-950">عمليات المزامنة</h2>
            {state.syncRuns.length === 0 ? (
              <div className="mt-4">
                <StateBox tone="empty" title="لا توجد سجلات مزامنة" detail="لم يتم إرجاع أي صفوف مزامنة حالياً." />
              </div>
            ) : (
              <table className="mt-4 min-w-full text-right text-sm">
                <thead className="border-b border-slate-200 text-xs tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-3 py-3">بدأت</th>
                    <th className="px-3 py-3">الحالة</th>
                    <th className="px-3 py-3">النوع</th>
                    <th className="px-3 py-3">تم الاستيراد</th>
                    <th className="px-3 py-3">تم التحديث</th>
                    <th className="px-3 py-3">فشل</th>
                    <th className="px-3 py-3">انتهت</th>
                    <th className="px-3 py-3">الخطأ</th>
                  </tr>
                </thead>
                <tbody>
                  {state.syncRuns.map((run) => (
                    <tr key={run.id} className="border-b border-slate-100 text-slate-700">
                      <td className="px-3 py-3 text-xs">{dateText(run.startedAt)}</td>
                      <td className="px-3 py-3"><StatusPill value={run.status} /></td>
                      <td className="px-3 py-3">{run.syncType}</td>
                      <td className="px-3 py-3">{run.recordsImported}</td>
                      <td className="px-3 py-3">{run.recordsUpdated}</td>
                      <td className="px-3 py-3">{run.recordsFailed}</td>
                      <td className="px-3 py-3 text-xs">{dateText(run.finishedAt ?? null)}</td>
                      <td className="px-3 py-3 text-xs text-rose-700">{run.error || "-"}</td>
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
