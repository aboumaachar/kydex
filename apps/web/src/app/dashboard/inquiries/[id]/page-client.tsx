"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getInquiryById, type InquiryDetail } from "../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, Metric, StateBox, StatusPill, dateText, jsonText } from "../../_components/dashboard-shell";

function formatSourceStatus(sourceStatus: unknown) {
  if (!sourceStatus || typeof sourceStatus !== "object" || Array.isArray(sourceStatus)) {
    return [] as Array<[string, string]>;
  }

  return Object.entries(sourceStatus as Record<string, unknown>).map(([key, value]) => [key, jsonText(value)]);
}

export default function DashboardInquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const inquiryId = typeof params?.id === "string" ? params.id : "";

  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!inquiryId) {
      setError("Missing inquiry id");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getInquiryById(inquiryId);
      setInquiry(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load inquiry detail");
      setInquiry(null);
    } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const transaction = inquiry?.transaction ?? null;
  const sourceStatusRows = formatSourceStatus(inquiry?.transaction?.sourceStatus);

  return (
    <DashboardShell
      title="تفاصيل الطلب"
      description="راجع بيانات الطلب وملخص عملية الفحص المرتبطة به مع إبقاء التفاصيل التقنية مخفية حتى الحاجة إليها."
      actions={
        <>
          <Link href="/dashboard/inquiries" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950">
            العودة إلى الطلبات
          </Link>
          <ActionButton label="تحديث" onClick={() => void load()} disabled={loading} />
        </>
      }
    >
      {loading ? <StateBox tone="loading" title="جار تحميل تفاصيل الطلب" detail="يتم الآن جلب بيانات الطلب وعملية الفحص المرتبطة به." /> : null}
      {error ? <StateBox tone="error" title="تعذر تحميل تفاصيل الطلب" detail={error} /> : null}

      {!loading && !error && inquiry ? (
        <>
          <DashboardCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-emerald-800">الطلب</p>
                <p className="mt-2 font-mono text-xs text-slate-500">{inquiry.id}</p>
              </div>
              <StatusPill value={inquiry.status} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="تاريخ الإنشاء" value={dateText(inquiry.createdAt)} />
              <Metric label="نوع العميل" value={inquiry.clientType || "-"} />
              <Metric label="معرف الكاتب بالعدل" value={inquiry.notarySlug || "-"} />
              <Metric label="موقع ووردبريس" value={inquiry.wordpressSite || "-"} />
            </div>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-xl font-semibold text-slate-950">ملخص عملية الفحص</h2>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-950">
              هذه البيانات مخصصة لدعم القرار وحفظ الأثر. القرار النهائي يحتاج إلى مراجعة بشرية مخولة.
            </div>
            {transaction ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric label="الاسم محل البحث" value={transaction.query} />
                  <Metric label="الصيغة المعيارية" value={transaction.normalizedQuery || "-"} />
                  <Metric label="نمط المصدر" value={transaction.sourceMode || "-"} />
                  <Metric label="استخدام الوضع الاحتياطي" value={String(Boolean(transaction.usedFallback))} />
                  <Metric label="الحالة" value={transaction.status} />
                  <Metric label="أعلى درجة" value={String(transaction.highestScore)} />
                  <Metric label="عدد النتائج" value={String(transaction.matchCount)} />
                  <Metric label="زمن الاستجابة" value={transaction.responseTimeMs !== null && transaction.responseTimeMs !== undefined ? `${transaction.responseTimeMs} ms` : "-"} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <Metric label="العميل" value={transaction.apiClient || "-"} />
                  <Metric label="عنوان IP" value={transaction.ipAddress || "-"} />
                  <Metric label="وقت الإنشاء" value={dateText(transaction.createdAt)} />
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
                  <p className="text-xs text-slate-500">تنبيه</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{transaction.warning || "-"}</p>
                </div>

                {sourceStatusRows.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
                    <p className="text-xs text-slate-500">حالة المصادر</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {sourceStatusRows.map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-xs text-slate-500">{key}</div>
                          <div className="mt-1 text-sm text-slate-800">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-4">
                <StateBox tone="empty" title="لا توجد عملية فحص مرتبطة" detail="هذا الطلب لا يحتوي على صف فحص مرتبط به." />
              </div>
            )}
          </DashboardCard>

          <div className="grid gap-5 xl:grid-cols-2">
            <DashboardCard>
              <h2 className="text-xl font-semibold text-slate-950">الطلب الأصلي</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">تم إخفاء الحمولة التقنية بشكل افتراضي لتقليل الضوضاء البصرية.</p>
              <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">إظهار التفاصيل التقنية</summary>
                <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-white p-4 text-xs text-slate-700">{jsonText(inquiry.originalPayload)}</pre>
              </details>
            </DashboardCard>

            <DashboardCard>
              <h2 className="text-xl font-semibold text-slate-950">استجابة النظام</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">يمكن فتح تفاصيل الاستجابة عند الحاجة إلى مراجعة تقنية أو تدقيقية أعمق.</p>
              <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">إظهار التفاصيل التقنية</summary>
                <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-white p-4 text-xs text-slate-700">{jsonText(inquiry.responsePayload)}</pre>
              </details>
            </DashboardCard>
          </div>
        </>
      ) : null}
    </DashboardShell>
  );
}
