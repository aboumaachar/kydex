"use client";

import { useCallback, useEffect, useState } from "react";
import { getSourceImportStatus, getSourceSyncRuns, syncLebanonNationalList, type SourceImportStatus, type SourceSyncRunSummary } from "../../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, StateBox, StatusPill, dateText } from "../../../_components/dashboard-shell";

type SyncState = {
  importStatus: SourceImportStatus | null;
  syncRuns: SourceSyncRunSummary[];
};

export default function DashboardLebanonSyncPage() {
  const [state, setState] = useState<SyncState>({ importStatus: null, syncRuns: [] });
  const [loading, setLoading] = useState(true);
  const [runningSync, setRunningSync] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [importStatus, syncRuns] = await Promise.all([
        getSourceImportStatus("LEBANON_NATIONAL_LIST"),
        getSourceSyncRuns("LEBANON_NATIONAL_LIST"),
      ]);
      setState({ importStatus, syncRuns });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load Lebanon sync state");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runSync = async () => {
    const approved = globalThis.window.confirm("سيتم تنزيل ملف اللائحة الوطنية واستيراده إلى النسخة المحلية. هل تريد المتابعة؟");
    if (!approved) {
      return;
    }

    setRunningSync(true);
    setError("");
    setNotice("");

    try {
      const result = await syncLebanonNationalList();
      const status = typeof result.status === "string" ? result.status : "completed";
      setNotice(`اكتمل طلب المزامنة بالحالة: ${status}`);
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "فشلت مزامنة اللائحة الوطنية");
    } finally {
      setRunningSync(false);
    }
  };

  return (
    <DashboardShell
      title="مزامنة واستيراد اللائحة الوطنية"
      description="راجع حالة الاستيراد وآخر عمليات المزامنة اليومية أو اليدوية للمصدر اللبناني الوطني."
      actions={
        <>
          <ActionButton label={runningSync ? "جار المزامنة" : "تشغيل المزامنة الآن"} onClick={() => void runSync()} disabled={runningSync || loading} variant="primary" />
          <ActionButton label="تحديث" onClick={() => void load()} disabled={loading || runningSync} />
        </>
      }
    >
      <DashboardCard>
        <p className="text-sm font-medium text-amber-800">تنبيه</p>
        <p className="mt-2 text-sm leading-7 text-amber-950">إذا تعذر تنزيل الملف الرسمي، سيبقى آخر إصدار محلي صالح مستخدماً دون حذف البيانات الحالية.</p>
      </DashboardCard>

      {loading ? <StateBox tone="loading" title="جار تحميل حالة الاستيراد والمزامنة" detail="يتم الآن جلب العدادات وآخر العمليات." /> : null}
      {error ? <StateBox tone="error" title="تعذر تحميل صفحة المزامنة" detail={error} /> : null}
      {notice ? <StateBox tone="empty" title="اكتملت العملية" detail={notice} /> : null}

      {!loading && !error ? (
        <>
          <DashboardCard>
            <h2 className="text-xl font-semibold text-slate-950">حالة الاستيراد</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-[10px] tracking-[0.08em] text-slate-500">القوائم المستوردة</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{state.importStatus?.importedListCount ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-[10px] tracking-[0.08em] text-slate-500">الكيانات</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{state.importStatus?.sourceEntityCount ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-[10px] tracking-[0.08em] text-slate-500">الأسماء</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{state.importStatus?.sourceNameCount ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-[10px] tracking-[0.08em] text-slate-500">الأسماء البديلة</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{state.importStatus?.sourceNameVariantCount ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-[10px] tracking-[0.08em] text-slate-500">النسخة المحلية</div>
                <div className="mt-2"><StatusPill value={state.importStatus?.localCopyAvailable} /></div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-[10px] tracking-[0.08em] text-slate-500">آخر مزامنة ناجحة</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{dateText(state.importStatus?.lastSuccessfulSyncAt ?? null)}</div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard className="overflow-x-auto">
            <h2 className="text-xl font-semibold text-slate-950">عمليات المزامنة</h2>
            {state.syncRuns.length === 0 ? (
              <div className="mt-4">
                <StateBox tone="empty" title="لا توجد عمليات مزامنة" detail="لا توجد صفوف متاحة حالياً لعمليات مزامنة اللائحة الوطنية." />
              </div>
            ) : (
              <table className="mt-4 min-w-full text-right text-sm">
                <thead className="border-b border-slate-200 text-xs tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-3 py-3">بدأت</th>
                    <th className="px-3 py-3">انتهت</th>
                    <th className="px-3 py-3">الحالة</th>
                    <th className="px-3 py-3">النوع</th>
                    <th className="px-3 py-3">تم الاستيراد</th>
                    <th className="px-3 py-3">فشل</th>
                    <th className="px-3 py-3">الملف</th>
                    <th className="px-3 py-3">الخطأ</th>
                  </tr>
                </thead>
                <tbody>
                  {state.syncRuns.map((run) => (
                    <tr key={run.id} className="border-b border-slate-100 text-slate-700">
                      <td className="px-3 py-3 text-xs">{dateText(run.startedAt)}</td>
                      <td className="px-3 py-3 text-xs">{dateText(run.finishedAt ?? null)}</td>
                      <td className="px-3 py-3"><StatusPill value={run.status} /></td>
                      <td className="px-3 py-3">{run.syncType}</td>
                      <td className="px-3 py-3">{run.recordsImported}</td>
                      <td className="px-3 py-3">{run.recordsFailed}</td>
                      <td className="px-3 py-3 text-xs">{run.sourceFileName || "-"}</td>
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
