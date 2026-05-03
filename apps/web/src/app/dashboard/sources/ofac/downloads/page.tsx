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
      title="OFAC Downloads"
      description="Download local list previews of OFAC sanctions data as CSV or JSON. Exports are limited to your locally imported copy (up to 10 000 local entries)."
      actions={
        <ActionButton label="Refresh" onClick={() => void load()} disabled={loading} />
      }
    >
      {/* Disclaimer */}
      <DashboardCard>
        <p className="rounded-lg border border-amber-800/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
          ⚠ <strong>Arabic normalisation disclaimer:</strong> Arabic values included in exports
          are machine-transliterated/normalized. They are provided for reference only and are{" "}
          <strong>NOT certified legal translations</strong>. Do not use these values as the
          authoritative Arabic representation for any legal or compliance purpose.
        </p>
      </DashboardCard>

      {loading ? (
        <StateBox
          tone="loading"
          title="Loading OFAC imported lists"
          detail="Fetching list metadata and Arabic coverage statistics."
        />
      ) : null}
      {error ? (
        <StateBox tone="error" title="Failed to load OFAC lists" detail={error} />
      ) : null}

      {!loading && !error && lists.length === 0 ? (
        <StateBox
          tone="empty"
          title="No imported lists found"
          detail="Use Sync & Import to import OFAC lists before downloading."
        />
      ) : null}

      {!loading && !error && lists.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {lists.map(({ list, translationStatus, downloading, downloadError }) => {
            const ts = translationStatus;
            return (
              <DashboardCard key={list.id} className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300">
                      OFAC List
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{list.listName}</h3>
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100">
                    {list.recordCount.toLocaleString()} preview rows
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Metric label="Local list size" value={String(list.recordCount)} />
                  <Metric label="Last Imported" value={dateText(list.lastImportedAt)} />
                  {ts ? (
                    <>
                      <Metric
                        label="Entity Arabic Coverage"
                        value={`${ts.entityArabicCoveragePercent}%`}
                      />
                      <Metric
                        label="Name Arabic Coverage"
                        value={`${ts.nameArabicCoveragePercent}%`}
                      />
                    </>
                  ) : (
                    <Metric label="Arabic Coverage" value="—" />
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton
                    label={
                      downloading === "csv" ? "Preparing CSV…" : "↓ Download CSV"
                    }
                    disabled={downloading !== null}
                    onClick={() => void handleDownload(list.listName, "csv")}
                  />
                  <ActionButton
                    label={
                      downloading === "json" ? "Preparing JSON…" : "↓ Download JSON"
                    }
                    disabled={downloading !== null}
                    onClick={() => void handleDownload(list.listName, "json")}
                  />
                </div>

                {downloadError && (
                  <p className="mt-2 text-xs text-red-400">Error: {downloadError}</p>
                )}
              </DashboardCard>
            );
          })}
        </div>
      ) : null}

      <DashboardCard>
        <p className="text-xs text-slate-300">
          Downloads are generated from your local database copy. The OFAC SDN and Consolidated
          Lists are updated from the official source during scheduled sync runs. Data is current
          as of the last successful import.
        </p>
      </DashboardCard>
    </DashboardShell>
  );
}
