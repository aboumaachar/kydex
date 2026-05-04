"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSourceImportedLists,
  getSourceListDownload,
  getSourceListPreview,
  getSourceTranslationStatus,
  sourceDownloadToCsv,
  triggerBlobDownload,
  type SourceEntityPreview,
  type SourceImportedListSummary,
  type SourceListPreviewResponse,
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

const PAGE_SIZE = 25;
type Lang = "en" | "ar" | "bilingual";

type LocalListState = {
  lists: SourceImportedListSummary[];
  preview: SourceListPreviewResponse | null;
  translationStatus: SourceTranslationStatus | null;
};

function aliasCount(entity: SourceEntityPreview) {
  return entity.names.filter((n) => Boolean(n.isAlias)).length;
}

function arabicDisplay(entity: SourceEntityPreview): string {
  if (entity.normalizedArabic) return entity.normalizedArabic;
  const found = entity.names.find((n) => n.normalizedArabic);
  return found?.normalizedArabic ?? "—";
}

function compactList(values: string[]) {
  return values.filter(Boolean).map((value) => value.trim()).filter((value) => value.length > 0);
}

export default function DashboardOfacLocalListsPage() {
  const [state, setState] = useState<LocalListState>({
    lists: [],
    preview: null,
    translationStatus: null,
  });
  const [selectedList, setSelectedList] = useState("SDN List");
  const [lang, setLang] = useState<Lang>("en");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const loadLists = useCallback(() => getSourceImportedLists("OFAC"), []);

  const loadPreview = useCallback(
    (listName: string, nextSkip: number) =>
      getSourceListPreview("OFAC", listName, PAGE_SIZE, nextSkip),
    [],
  );

  const loadTranslationStatus = useCallback(async (listName: string) => {
    try {
      return await getSourceTranslationStatus("OFAC", listName);
    } catch {
      return null;
    }
  }, []);

  const load = useCallback(
    async (listName: string, nextSkip: number) => {
      setLoading(true);
      setError("");
      try {
        const [lists, preview, translationStatus] = await Promise.all([
          loadLists(),
          loadPreview(listName, nextSkip),
          loadTranslationStatus(listName),
        ]);
        const effective = listName || lists[0]?.listName || "SDN List";
        if (effective === listName) {
          setState({ lists, preview, translationStatus });
        } else {
          const [ep, es] = await Promise.all([
            loadPreview(effective, 0),
            loadTranslationStatus(effective),
          ]);
          setSelectedList(effective);
          setSkip(0);
          setState({ lists, preview: ep, translationStatus: es });
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load OFAC local list preview",
        );
      } finally {
        setLoading(false);
      }
    },
    [loadLists, loadPreview, loadTranslationStatus],
  );

  useEffect(() => {
    void load(selectedList, skip);
  }, [load, selectedList, skip]);

  const filteredEntities = useMemo(() => {
    const entities = state.preview?.entities ?? [];
    const token = search.trim().toLowerCase();
    if (!token) return entities;
    return entities.filter((entity) => {
      const corpus = [
        entity.externalEntityId,
        entity.primaryName,
        entity.normalizedArabic ?? "",
        entity.entityType,
        entity.listName,
        entity.programs.join(" "),
        entity.countries.join(" "),
        ...entity.names.map((n) => n.originalName),
        ...entity.names.map((n) => n.normalizedArabic ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return corpus.includes(token);
    });
  }, [search, state.preview?.entities]);

  const canPrev = skip > 0;
  const canNext = Boolean(state.preview && skip + PAGE_SIZE < state.preview.total);

  const handleDownload = useCallback(
    async (format: "csv" | "json") => {
      setDownloading(true);
      setDownloadError("");
      try {
        const data = await getSourceListDownload("OFAC", selectedList);
        const slug = selectedList.replaceAll(/\s+/g, "-").toLowerCase();
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
        setDownloadError(dlErr instanceof Error ? dlErr.message : "Download failed");
      } finally {
        setDownloading(false);
      }
    },
    [selectedList],
  );

  const showArabic = lang === "ar" || lang === "bilingual";
  const showEnglish = lang === "en" || lang === "bilingual";
  const ts = state.translationStatus;

  return (
    <DashboardShell
      title="القوائم المحلية لـ OFAC"
      description="استعرض القوائم المحلية، ابحث داخلها، وبدّل بين الإنجليزية والعربية بطريقة أخف وأكثر وضوحاً."
      actions={
        <ActionButton
          label="تحديث"
          onClick={() => void load(selectedList, skip)}
          disabled={loading}
        />
      }
    >
      <DashboardCard>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-sm text-slate-700 md:col-span-1">
            <span className="text-xs tracking-[0.08em] text-slate-500">القائمة</span>
            <select
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              value={selectedList}
              onChange={(e) => {
                setSelectedList(e.target.value);
                setSkip(0);
              }}
            >
              {(
                state.lists.length > 0
                  ? state.lists
                  : [
                      {
                        id: "seed",
                        sourceId: "",
                        listName: "SDN List",
                        recordCount: 0,
                        languageCoverage: [],
                        localAvailable: false,
                        lastImportedAt: new Date().toISOString(),
                      },
                    ]
              ).map((list) => (
                <option key={list.id} value={list.listName}>
                  {list.listName}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700 md:col-span-1">
            <span className="text-xs tracking-[0.08em] text-slate-500">اللغة</span>
            <select
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              <option value="en">عرض إنجليزي</option>
              <option value="ar">عرض عربي معياري</option>
              <option value="bilingual">عرض ثنائي اللغة</option>
            </select>
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            <span className="text-xs tracking-[0.08em] text-slate-500">
              البحث والتصفية
            </span>
            <input
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="المعرف، الاسم، العربية، النوع، البرنامج، الدولة"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="القائمة المختارة" value={selectedList} />
          <Metric label="حجم القائمة المحلية" value={String(state.preview?.total ?? 0)} />
          <Metric label="الصفحة" value={String(Math.floor(skip / PAGE_SIZE) + 1)} />
        </div>
      </DashboardCard>

      {ts && (
        <DashboardCard>
          <p className="text-sm font-medium text-amber-800">
            التغطية العربية - {selectedList}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Metric
              label="تغطية الكيانات بالعربية"
              value={`${ts.entityArabicCoveragePercent}%`}
            />
            <Metric label="تغطية الأسماء بالعربية" value={`${ts.nameArabicCoveragePercent}%`} />
            <Metric
              label="كيانات تحتوي على عربية"
              value={`${ts.entitiesWithArabicNormalized} / ${ts.totalEntities}`}
            />
          </div>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-950">
            {ts.disclaimer}
          </p>
        </DashboardCard>
      )}

      <DashboardCard>
        <p className="text-sm font-medium text-emerald-800">تنزيل القائمة المحلية</p>
        <p className="mt-1 text-sm leading-7 text-slate-600">
          قم بتنزيل النسخة المحلية من <strong>{selectedList}</strong> بما يصل إلى 10,000 سجل محلي.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton
            label={downloading ? "جار التجهيز" : "تنزيل CSV"}
            onClick={() => void handleDownload("csv")}
            disabled={downloading || loading}
          />
          <ActionButton
            label={downloading ? "جار التجهيز" : "تنزيل JSON"}
            onClick={() => void handleDownload("json")}
            disabled={downloading || loading}
          />
        </div>
        {downloadError && (
          <p className="mt-2 text-xs text-rose-700">خطأ في التنزيل: {downloadError}</p>
        )}
        {showArabic && (
          <p className="mt-2 text-xs text-amber-800">
            القيم العربية داخل الملف المصدّر قيم معيارية آلية وليست ترجمة قانونية معتمدة.
          </p>
        )}
      </DashboardCard>

      {loading ? (
        <StateBox
          tone="loading"
          title="جار تحميل معاينة القائمة المحلية"
          detail="يتم الآن جلب صفوف المعاينة من الواجهة البرمجية."
        />
      ) : null}
      {error ? (
        <StateBox tone="error" title="تعذر تحميل معاينة القائمة" detail={error} />
      ) : null}

      {!loading && !error ? (
        <DashboardCard className="max-w-full min-w-0 overflow-x-auto">
          {filteredEntities.length === 0 ? (
            <StateBox
              tone="empty"
              title="لا توجد صفوف للمعاينة"
              detail="جرّب قائمة أخرى أو امسح عوامل التصفية لعرض النتائج."
            />
          ) : (
            <table className="min-w-[900px] text-right text-sm">
              <thead className="border-b border-slate-200 text-xs tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">المعرف</th>
                  {showEnglish && <th className="px-3 py-3">الاسم بالإنجليزية</th>}
                  {showArabic && (
                    <th className="px-3 py-3 text-amber-800" dir="rtl">
                      الاسم العربي المعياري
                    </th>
                  )}
                  <th className="px-3 py-3">النوع</th>
                  <th className="px-3 py-3">القائمة</th>
                  <th className="px-3 py-3">البرامج</th>
                  <th className="px-3 py-3">الدول</th>
                  <th className="px-3 py-3">الأسماء البديلة</th>
                  <th className="px-3 py-3">تاريخ الاستيراد</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntities.map((entity) => (
                  <tr key={entity.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-3 font-mono text-xs text-slate-700">
                      <span className="block max-w-[170px] truncate" title={entity.externalEntityId}>
                        {entity.externalEntityId}
                      </span>
                    </td>
                    {showEnglish && (
                      <td className="px-3 py-3 whitespace-normal break-words text-slate-900">
                        {entity.primaryName}
                      </td>
                    )}
                    {showArabic && (
                      <td
                        className="px-3 py-3 whitespace-normal break-words text-amber-900"
                        dir="rtl"
                        title="قيمة عربية معيارية آلية وليست ترجمة قانونية معتمدة"
                      >
                        {arabicDisplay(entity)}
                      </td>
                    )}
                    <td className="px-3 py-3 whitespace-normal break-words">{entity.entityType}</td>
                    <td className="px-3 py-3 whitespace-normal break-words">{entity.listName}</td>
                    <td className="px-3 py-3 text-xs">
                      <div className="flex max-w-[220px] flex-wrap gap-1">
                        {compactList(entity.programs).length > 0 ? (
                          compactList(entity.programs).map((program) => (
                            <span key={`${entity.id}-program-${program}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700">
                              {program}
                            </span>
                          ))
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-normal break-words">{entity.countries.join(", ") || "—"}</td>
                    <td className="px-3 py-3">{aliasCount(entity)}</td>
                    <td className="px-3 py-3 text-xs">{dateText(entity.importedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {showArabic && (
            <p className="mt-2 text-[10px] text-amber-800">
              العمود العربي يحتوي على قيم معيارية آلية وليست ترجمة قانونية معتمدة.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-600">
              يتم عرض {filteredEntities.length} صفاً في هذه الصفحة من أصل حجم الصفحة {PAGE_SIZE}.
            </p>
            <div className="flex gap-2">
              <ActionButton
                label="السابق"
                disabled={!canPrev || loading}
                onClick={() => setSkip((prev) => Math.max(0, prev - PAGE_SIZE))}
              />
              <ActionButton
                label="التالي"
                disabled={!canNext || loading}
                onClick={() => setSkip((prev) => prev + PAGE_SIZE)}
              />
            </div>
          </div>
        </DashboardCard>
      ) : null}

      <DashboardCard>
        <p className="text-sm leading-7 text-slate-600">
          بيانات القائمة الحالية: {state.lists.find((l) => l.listName === selectedList)?.recordCount ?? 0} سجل محلي، وآخر استيراد بتاريخ{" "}
          {dateText(
            state.lists.find((l) => l.listName === selectedList)?.lastImportedAt ?? null,
          )}
          .
        </p>
      </DashboardCard>
    </DashboardShell>
  );
}
