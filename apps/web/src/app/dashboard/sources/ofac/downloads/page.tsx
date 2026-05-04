"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSourceImportedLists,
  getSourceTranslationStatus,
  getSourceListDownload,
  sourceDownloadToCsv,
  triggerBlobDownload,
  type SourceImportedListSummary,
  type SourceTranslationStatus,
} from "../../../../../lib/api";
import {
  ActionButton,
  DashboardCard,
  DashboardShell,
  Metric,
  StateBox,
  dateText,
} from "../../../_components/dashboard-shell";

type ListDownloadState = {
  list: SourceImportedListSummary;
  translationStatus: SourceTranslationStatus | null;
  downloading: "csv" | "json" | null;
  downloadError: string;
};

export default function DashboardOfacDownloadsPage() {
  const [lists, setLists] = useState<ListDownloadState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const importedLists = await getSourceImportedLists("OFAC");

      // Load translation status for each list in parallel
      const statuses = await Promise.all(
        importedLists.map(async (list) => {
          try {
            return await getSourceTranslationStatus("OFAC", list.listName);
          } catch {
            return null;
          }
        }),
      );

      setLists(
        importedLists.map((list, i) => ({
          list,
          translationStatus: statuses[i] ?? null,
          downloading: null,
          downloadError: "",
        })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load OFAC imported lists",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDownload = useCallback(
    async (listName: string, format: "csv" | "json") => {
      setLists((prev) =>
        prev.map((s) =>
          s.list.listName === listName
            ? { ...s, downloading: format, downloadError: "" }
            : s,
        ),
      );
      try {
        const data = await getSourceListDownload("OFAC", listName);
        const slug = listName.replaceAll(/\s+/g, "-").toLowerCase();
        const ts = new Date().toISOString().slice(0, 10);
        if (format === "csv") {
          triggerBlobDownload(
            sourceDownloadToCsv(data),
            `OFAC-${slug}-${ts}.csv`,
            "text/csv;charset=utf-8",
          );
        } else {
          triggerBlobDownload(
            JSON.stringify(data, null, 2),
            `OFAC-${slug}-${ts}.json`,
            "application/json",
          );
        }
      } catch (dlErr) {
        setLists((prev) =>
          prev.map((s) =>
            s.list.listName === listName
              ? {
                  ...s,
                  downloadError: dlErr instanceof Error ? dlErr.message : "Download failed",
                }
              : s,
          ),
        );
      } finally {
        setLists((prev) =>
          prev.map((s) => (s.list.listName === listName ? { ...s, downloading: null } : s)),
        );
      }
    },
    [],
  );

  return (
    <DashboardShell
      title="تنزيلات OFAC"
      description="قم بتنزيل النسخة المحلية من القوائم بصيغة CSV أو JSON مع توضيح مستوى التغطية العربية لكل قائمة."
      actions={
        <ActionButton label="تحديث" onClick={() => void load()} disabled={loading} />
      }
    >
      <DashboardCard>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
          القيم العربية داخل التنزيلات هي قيم معيارية آلية للاسترشاد فقط، وليست ترجمة قانونية معتمدة.
        </p>
      </DashboardCard>

      {loading ? (
        <StateBox
          tone="loading"
          title="جار تحميل القوائم المستوردة"
          detail="يتم الآن جلب بيانات القوائم ومستوى التغطية العربية لكل قائمة."
        />
      ) : null}
      {error ? (
        <StateBox tone="error" title="تعذر تحميل قوائم OFAC" detail={error} />
      ) : null}

      {!loading && !error && lists.length === 0 ? (
        <StateBox
          tone="empty"
          title="لا توجد قوائم مستوردة"
          detail="استخدم صفحة المزامنة والاستيراد قبل محاولة التنزيل."
        />
      ) : null}

      {!loading && !error && lists.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {lists.map(({ list, translationStatus, downloading, downloadError }) => {
            const ts = translationStatus;
            return (
              <DashboardCard key={list.id} className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-800">قائمة OFAC</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950">{list.listName}</h3>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {list.recordCount.toLocaleString()} صف
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Metric label="حجم القائمة المحلية" value={String(list.recordCount)} />
                  <Metric label="آخر استيراد" value={dateText(list.lastImportedAt)} />
                  {ts ? (
                    <>
                      <Metric
                        label="تغطية الكيانات بالعربية"
                        value={`${ts.entityArabicCoveragePercent}%`}
                      />
                      <Metric
                        label="تغطية الأسماء بالعربية"
                        value={`${ts.nameArabicCoveragePercent}%`}
                      />
                    </>
                  ) : (
                    <Metric label="التغطية العربية" value="—" />
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton
                    label={
                      downloading === "csv" ? "جار تجهيز CSV" : "تنزيل CSV"
                    }
                    disabled={downloading !== null}
                    onClick={() => void handleDownload(list.listName, "csv")}
                  />
                  <ActionButton
                    label={
                      downloading === "json" ? "جار تجهيز JSON" : "تنزيل JSON"
                    }
                    disabled={downloading !== null}
                    onClick={() => void handleDownload(list.listName, "json")}
                  />
                </div>

                {downloadError && (
                  <p className="mt-2 text-xs text-rose-700">خطأ: {downloadError}</p>
                )}
              </DashboardCard>
            );
          })}
        </div>
      ) : null}

      <DashboardCard>
        <p className="text-sm leading-7 text-slate-600">
          يتم إنشاء هذه التنزيلات من النسخة المحلية داخل قاعدة البيانات، وتبقى صالحة حتى آخر استيراد ناجح من المصدر.
        </p>
      </DashboardCard>
    </DashboardShell>
  );
}
