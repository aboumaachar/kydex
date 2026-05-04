"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSourceImportStatus, getSourceStatus, getSourcesRegistry, type SourceImportStatus, type SourceRegistryItem } from "../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, Metric, StateBox, StatusPill, dateText } from "../_components/dashboard-shell";

type SourcesState = {
  sources: SourceRegistryItem[];
  ofacStatus: SourceRegistryItem | null;
  ofacImport: SourceImportStatus | null;
};

export default function DashboardSourcesPage() {
  const [state, setState] = useState<SourcesState>({ sources: [], ofacStatus: null, ofacImport: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [sources, ofacStatus, ofacImport] = await Promise.all([
        getSourcesRegistry(),
        getSourceStatus("OFAC"),
        getSourceImportStatus("OFAC"),
      ]);
      setState({ sources, ofacStatus, ofacImport });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load source registry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell
      title="المصادر"
      description="راجع حالة المصادر، توفر النسخة المحلية، واستعداد النظام للاستمرار في الفحص عند الحاجة."
      actions={<ActionButton label="تحديث" onClick={() => void load()} disabled={loading} />}
    >
      {loading ? <StateBox tone="loading" title="جار تحميل حالة المصادر" detail="يتم الآن قراءة حالة المصدر وبيانات الاستيراد." /> : null}
      {error ? <StateBox tone="error" title="تعذر تحميل المصادر" detail={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <DashboardCard>
            <div className="flex items-start justify-between gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-emerald-800">المصدر الأساسي</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">خدمة قوائم OFAC</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">تعرض هذه البطاقة حالة النسخة المحلية وآخر مزامنة واستعداد الوضع الاحتياطي.</p>
              </div>
              <StatusPill value={state.ofacStatus?.status} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Metric label="النسخة المحلية" value={String(Boolean(state.ofacStatus?.localCopyAvailable))} />
              <Metric label="الوضع الاحتياطي" value={String(Boolean(state.ofacStatus?.fallbackEnabled))} />
              <Metric label="آخر مزامنة" value={dateText(state.ofacImport?.lastSuccessfulSyncAt ?? state.ofacStatus?.lastSuccessfulSyncAt ?? null)} />
              <Metric label="آخر فحص صحة" value={dateText(state.ofacStatus?.lastHealthCheckAt ?? null)} />
              <Metric label="عدد الكيانات" value={String(state.ofacImport?.sourceEntityCount ?? 0)} />
              <Metric label="عدد الأسماء البديلة" value={String(state.ofacImport?.sourceNameVariantCount ?? 0)} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/dashboard/sources/ofac" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950">
                تفاصيل OFAC
              </Link>
              <Link href="/dashboard/sources/ofac/local-lists" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950">
                القوائم المحلية
              </Link>
              <Link href="/dashboard/sources/ofac/sync" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950">
                المزامنة والاستيراد
              </Link>
              <Link href="/dashboard/sources/ofac/logs" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950">
                سجلات المصدر
              </Link>
              <Link href="/dashboard/sources/ofac/downloads" className="rounded-full border border-emerald-800 bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                التنزيلات
              </Link>
            </div>
          </DashboardCard>

          <DashboardCard>
            <p className="text-sm font-medium text-emerald-800">سجل المصادر</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">المصادر المتاحة</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">يعرض هذا القسم قائمة المصادر الحالية كما تصل من واجهة المصدر في النظام.</p>

            {state.sources.length === 0 ? (
              <div className="mt-5">
                <StateBox tone="empty" title="لا توجد مصادر حالياً" detail="لا توجد صفوف مصادر مسجلة في الوقت الحالي." />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {state.sources.map((source) => (
                  <div key={source.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{source.code} - {source.name}</p>
                        <p className="mt-1 text-xs text-slate-500">آخر محاولة مزامنة: {dateText(source.lastAttemptedSyncAt ?? null)}</p>
                      </div>
                      <StatusPill value={source.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>
        </div>
      ) : null}
    </DashboardShell>
  );
}
