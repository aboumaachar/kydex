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
      title="OFAC Local Lists"
      description="Preview locally imported OFAC lists (SDN and Consolidated) with bilingual display, export, and translation coverage."
      actions={
        <ActionButton
          label="Refresh"
          onClick={() => void load(selectedList, skip)}
          disabled={loading}
        />
      }
    >
      {/* Controls */}
      <DashboardCard>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-sm text-slate-300 md:col-span-1">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">List</span>
            <select
              className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
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

          <label className="text-sm text-slate-300 md:col-span-1">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Language</span>
            <select
              className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              <option value="en">Preview local list (English)</option>
              <option value="ar">Arabic-normalized preview</option>
              <option value="bilingual">Bilingual preview</option>
            </select>
          </label>

          <label className="text-sm text-slate-300 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Search / Filter
            </span>
            <input
              className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Entity ID, name, Arabic, type, program, country"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Selected List" value={selectedList} />
          <Metric label="Local list size" value={String(state.preview?.total ?? 0)} />
          <Metric label="Page" value={String(Math.floor(skip / PAGE_SIZE) + 1)} />
        </div>
      </DashboardCard>

      {/* Arabic Coverage */}
      {ts && (
        <DashboardCard>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400">
            Arabic Coverage — {selectedList}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Metric
              label="Entity Arabic Coverage"
              value={`${ts.entityArabicCoveragePercent}%`}
            />
            <Metric label="Name Arabic Coverage" value={`${ts.nameArabicCoveragePercent}%`} />
            <Metric
              label="Entities w/ Arabic"
              value={`${ts.entitiesWithArabicNormalized} / ${ts.totalEntities}`}
            />
          </div>
          <p className="mt-3 rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
            ⚠ {ts.disclaimer}
          </p>
        </DashboardCard>
      )}

      {/* Download Bar */}
      <DashboardCard>
        <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300">Download local list</p>
        <p className="mt-1 text-xs text-slate-300">
          Download the full local copy of <strong>{selectedList}</strong> (up to 10 000 local entries).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton
            label={downloading ? "Preparing…" : "↓ Download CSV"}
            onClick={() => void handleDownload("csv")}
            disabled={downloading || loading}
          />
          <ActionButton
            label={downloading ? "Preparing…" : "↓ Download JSON"}
            onClick={() => void handleDownload("json")}
            disabled={downloading || loading}
          />
        </div>
        {downloadError && (
          <p className="mt-2 text-xs text-red-400">Download error: {downloadError}</p>
        )}
        {showArabic && (
          <p className="mt-2 text-xs text-amber-400">
            ⚠ Downloaded files include Arabic-normalized values — NOT certified legal
            translations.
          </p>
        )}
      </DashboardCard>

      {loading ? (
        <StateBox
          tone="loading"
          title="Loading local list preview"
          detail="Retrieving local preview rows from API."
        />
      ) : null}
      {error ? (
        <StateBox tone="error" title="Failed to load local list preview" detail={error} />
      ) : null}

      {!loading && !error ? (
        <DashboardCard className="max-w-full min-w-0 overflow-x-auto">
          {filteredEntities.length === 0 ? (
            <StateBox
              tone="empty"
              title="No preview rows for current selection"
              detail="Try another list or clear filters to view entities."
            />
          ) : (
            <table className="min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-3 py-3">Entity ID</th>
                  {showEnglish && <th className="px-3 py-3">Primary Name (EN)</th>}
                  {showArabic && (
                    <th className="px-3 py-3 text-amber-300/80" dir="rtl">
                      الاسم (عربي مُعيَّر)
                    </th>
                  )}
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">List</th>
                  <th className="px-3 py-3">Programs</th>
                  <th className="px-3 py-3">Countries</th>
                  <th className="px-3 py-3">Aliases</th>
                  <th className="px-3 py-3">Imported</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntities.map((entity) => (
                  <tr key={entity.id} className="border-b border-slate-900/80 text-slate-200">
                    <td className="px-3 py-3 font-mono text-xs text-slate-200">
                      <span className="block max-w-[170px] truncate" title={entity.externalEntityId}>
                        {entity.externalEntityId}
                      </span>
                    </td>
                    {showEnglish && (
                      <td className="px-3 py-3 whitespace-normal break-words text-slate-50">
                        {entity.primaryName}
                      </td>
                    )}
                    {showArabic && (
                      <td
                        className="px-3 py-3 whitespace-normal break-words text-amber-100"
                        dir="rtl"
                        title="Arabic-normalized (machine transliterated — not a certified legal translation)"
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
                            <span key={`${entity.id}-program-${program}`} className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-100">
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
            <p className="mt-2 text-[10px] text-amber-400/60">
              ⚠ Arabic column: machine-transliterated values — NOT certified legal translations.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-300">
              Showing {filteredEntities.length} preview rows on this page (take={PAGE_SIZE}).
            </p>
            <div className="flex gap-2">
              <ActionButton
                label="Previous"
                disabled={!canPrev || loading}
                onClick={() => setSkip((prev) => Math.max(0, prev - PAGE_SIZE))}
              />
              <ActionButton
                label="Next"
                disabled={!canNext || loading}
                onClick={() => setSkip((prev) => prev + PAGE_SIZE)}
              />
            </div>
          </div>
        </DashboardCard>
      ) : null}

      <DashboardCard>
        <p className="text-xs text-slate-300">
          List metadata:{" "}
          {state.lists.find((l) => l.listName === selectedList)?.recordCount ?? 0} local entries, last
          imported{" "}
          {dateText(
            state.lists.find((l) => l.listName === selectedList)?.lastImportedAt ?? null,
          )}
          .
        </p>
      </DashboardCard>
    </DashboardShell>
  );
}
