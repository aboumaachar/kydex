"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSourceImportStatus, getSourceStatus, runSourceHealthCheck, type SourceHealthCheckResult, type SourceImportStatus, type SourceRegistryItem } from "../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, Metric, StateBox, StatusPill, dateText } from "../../_components/dashboard-shell";

type LebanonState = {
  status: SourceRegistryItem | null;
  importStatus: SourceImportStatus | null;
  latestHealth: SourceHealthCheckResult | null;
};

export default function DashboardLebanonNationalListPage() {
  const [state, setState] = useState<LebanonState>({ status: null, importStatus: null, latestHealth: null });
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [status, importStatus] = await Promise.all([
        getSourceStatus("LEBANON_NATIONAL_LIST"),
        getSourceImportStatus("LEBANON_NATIONAL_LIST"),
      ]);
      setState((prev) => ({ ...prev, status, importStatus }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load Lebanon source status");
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
      const result = await runSourceHealthCheck("LEBANON_NATIONAL_LIST");
      setState((prev) => ({ ...prev, latestHealth: result }));
      await load();
    } catch (healthError) {
      setError(healthError instanceof Error ? healthError.message : "Failed to run Lebanon source health check");
    } finally {
      setRunningCheck(false);
    }
  };

  return (
    <DashboardShell
      title="حالة اللائحة الوطنية"
      description="راجع اتصال المصدر، أعداد النسخة المحلية، واستعداد النظام للاستمرار عند تعذر المصدر المباشر."
      actions={
        <>
          <ActionButton label={runningCheck ? "جار الفحص" : "تشغيل فحص الصحة"} onClick={() => void runHealthCheck()} disabled={runningCheck || loading} variant="primary" />
          <ActionButton label="تحديث" onClick={() => void load()} disabled={loading || runningCheck} />
        </>
      }
    >
      {loading ? <StateBox tone="loading" title="جار تحميل حالة المصدر" detail="يتم الآن قراءة حالة المصدر وأعداد النسخة المحلية." /> : null}
      {error ? <StateBox tone="error" title="تعذر تحميل حالة اللائحة الوطنية" detail={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <DashboardCard>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-950">صحة المصدر المباشر</h2>
              <StatusPill value={state.status?.status} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric label="الوضع الاحتياطي" value={String(Boolean(state.status?.fallbackEnabled))} />
              <Metric label="النسخة المحلية" value={String(Boolean(state.status?.localCopyAvailable))} />
              <Metric label="آخر فحص صحة" value={dateText(state.status?.lastHealthCheckAt ?? null)} />
              <Metric label="زمن الاستجابة (ms)" value={state.status?.lastLatencyMs !== null && state.status?.lastLatencyMs !== undefined ? String(state.status.lastLatencyMs) : "-"} />
              <Metric label="آخر مزامنة ناجحة" value={dateText(state.status?.lastSuccessfulSyncAt ?? null)} />
              <Metric label="آخر محاولة مزامنة" value={dateText(state.status?.lastAttemptedSyncAt ?? null)} />
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
              <p className="text-xs text-slate-500">آخر خطأ</p>
              <p className="mt-2 text-sm text-slate-700">{state.status?.lastError || "لا يوجد خطأ حديث مسجل."}</p>
            </div>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-xl font-semibold text-slate-950">أعداد النسخة المحلية</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric label="القوائم المستوردة" value={String(state.importStatus?.importedListCount ?? 0)} />
              <Metric label="الكيانات" value={String(state.importStatus?.sourceEntityCount ?? 0)} />
              <Metric label="الأسماء" value={String(state.importStatus?.sourceNameCount ?? 0)} />
              <Metric label="الأسماء البديلة" value={String(state.importStatus?.sourceNameVariantCount ?? 0)} />
            </div>

            {state.latestHealth ? (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-right">
                <p className="text-xs text-sky-700">آخر نتيجة لفحص الصحة</p>
                <p className="mt-2 text-sm text-sky-800">الحالة: {state.latestHealth.status} | HTTP: {state.latestHealth.httpStatus ?? "-"} | الزمن: {state.latestHealth.latencyMs}ms</p>
              </div>
            ) : null}
          </DashboardCard>
        </div>
      ) : null}

      <DashboardCard>
        <p className="text-sm font-medium text-emerald-800">إجراءات المصدر الوطني</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/dashboard/sources/lebanon-national-list/local-lists" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950">
            القوائم المحلية
          </Link>
          <Link href="/dashboard/sources/lebanon-national-list/sync" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950">
            المزامنة
          </Link>
          <Link href="/dashboard/sources/lebanon-national-list/downloads" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950">
            التنزيلات
          </Link>
        </div>
      </DashboardCard>
    </DashboardShell>
  );
}
