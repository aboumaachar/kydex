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
const SOURCE_CODE = "LEBANON_NATIONAL_LIST";
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

export default function DashboardLebanonLocalListsPage() {
  const [state, setState] = useState<LocalListState>({
    lists: [],
    preview: null,
    translationStatus: null,
  });
  const [selectedList, setSelectedList] = useState("");
  const [lang, setLang] = useState<Lang>("ar");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const loadLists = useCallback(() => getSourceImportedLists(SOURCE_CODE), []);

  const loadPreview = useCallback(
    (listName: string, nextSkip: number) =>
      getSourceListPreview(SOURCE_CODE, listName, PAGE_SIZE, nextSkip),
    [],
  );

  const loadTranslationStatus = useCallback(async (listName: string) => {
    try {
      return await getSourceTranslationStatus(SOURCE_CODE, listName);
    } catch {
      return null;
    }
  }, []);

  const load = useCallback(
    async (listName: string, nextSkip: number) => {
      setLoading(true);
      setError("");
      try {
        const lists = await loadLists();
        const fallbackList = lists[0]?.listName ?? "Lebanon National List";
        const effective = listName || fallbackList;
        const [preview, translationStatus] = await Promise.all([
          loadPreview(effective, nextSkip),
          loadTranslationStatus(effective),
        ]);

        if (!selectedList) {
          setSelectedList(effective);
        }

        setState({ lists, preview, translationStatus });
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load Lebanon local list preview",
        );
      } finally {
        setLoading(false);
      }
    },
    [loadLists, loadPreview, loadTranslationStatus, selectedList],
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
      if (!selectedList) return;
      setDownloading(true);
      setDownloadError("");
      try {
        const data = await getSourceListDownload(SOURCE_CODE, selectedList);
        const slug = selectedList.replaceAll(/\s+/g, "-").toLowerCase();
        const ts = new Date().toISOString().slice(0, 10);
        if (format === "csv") {
          triggerBlobDownload(
            sourceDownloadToCsv(data),
            `LEBANON-NATIONAL-${slug}-${ts}.csv`,
            "text/csv;charset=utf-8",
          );
        } else {
          triggerBlobDownload(
            JSON.stringify(data, null, 2),
            `LEBANON-NATIONAL-${slug}-${ts}.json`,
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
      title="القوائم المحلية - اللائحة الوطنية"
      description="استعرض القوائم المحلية، ابحث داخلها، وبدّل بين الإنجليزية والعربية."
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
              {state.lists.map((list) => (
                <option key={list.id} value={list.listName}>
                  {list.listName} ({list.recordCount})
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700 md:col-span-1">
            <span className="text-xs tracking-[0.08em] text-slate-500">نمط العرض</span>
            <select
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="bilingual">ثنائي اللغة</option>
            </select>
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            <span className="text-xs tracking-[0.08em] text-slate-500">بحث</span>
            <input
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم، المعرف، البلد، البرنامج"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="إجمالي النتائج" value={String(state.preview?.total ?? 0)} />
          <Metric label="المعروض الآن" value={String(filteredEntities.length)} />
          <Metric label="تغطية الكيانات بالعربية" value={ts ? `${ts.entityArabicCoveragePercent}%` : "-"} />
          <Metric label="تغطية الأسماء بالعربية" value={ts ? `${ts.nameArabicCoveragePercent}%` : "-"} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton label={downloading ? "جار تجهيز CSV" : "تنزيل CSV"} disabled={downloading || !selectedList} onClick={() => void handleDownload("csv")} />
          <ActionButton label={downloading ? "جار تجهيز JSON" : "تنزيل JSON"} disabled={downloading || !selectedList} onClick={() => void handleDownload("json")} />
          <ActionButton label="السابق" disabled={!canPrev || loading} onClick={() => setSkip((v) => Math.max(0, v - PAGE_SIZE))} />
          <ActionButton label="التالي" disabled={!canNext || loading} onClick={() => setSkip((v) => v + PAGE_SIZE)} />
        </div>
        {downloadError ? <p className="mt-3 text-sm text-rose-700">{downloadError}</p> : null}
      </DashboardCard>

      {loading ? <StateBox tone="loading" title="جار تحميل القوائم المحلية" detail="يتم الآن جلب القوائم ومستوى التغطية." /> : null}
      {error ? <StateBox tone="error" title="تعذر تحميل القوائم" detail={error} /> : null}

      {!loading && !error ? (
        <DashboardCard className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="border-b border-slate-200 text-xs tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-3 py-3">المعرف</th>
                {showEnglish ? <th className="px-3 py-3">الاسم</th> : null}
                {showArabic ? <th className="px-3 py-3">الاسم بالعربية</th> : null}
                <th className="px-3 py-3">النوع</th>
                <th className="px-3 py-3">اللائحة</th>
                <th className="px-3 py-3">برامج/فئات</th>
                <th className="px-3 py-3">الدول</th>
                <th className="px-3 py-3">أسماء بديلة</th>
                <th className="px-3 py-3">آخر استيراد</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map((entity) => (
                <tr key={entity.id} className="border-b border-slate-100 text-slate-700">
                  <td className="px-3 py-3 text-xs">{entity.externalEntityId}</td>
                  {showEnglish ? <td className="px-3 py-3">{entity.primaryName}</td> : null}
                  {showArabic ? <td className="px-3 py-3">{arabicDisplay(entity)}</td> : null}
                  <td className="px-3 py-3">{entity.entityType}</td>
                  <td className="px-3 py-3">{entity.listName}</td>
                  <td className="px-3 py-3">{compactList(entity.programs).join("، ") || "-"}</td>
                  <td className="px-3 py-3">{compactList(entity.countries).join("، ") || "-"}</td>
                  <td className="px-3 py-3">{aliasCount(entity)}</td>
                  <td className="px-3 py-3 text-xs">{dateText(entity.importedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardCard>
      ) : null}
    </DashboardShell>
  );
}
