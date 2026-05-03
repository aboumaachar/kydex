"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getInquiryById, type InquiryDetail } from "../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, Metric, StateBox, StatusPill, dateText, jsonText } from "../../_components/dashboard-shell";

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

  return (
    <DashboardShell
      title="Inquiry Detail"
      description="Detailed inquiry payload and linked screening transaction metadata for analyst review."
      actions={
        <>
          <Link href="/dashboard/inquiries" className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-slate-600 hover:text-white">
            Back to Inquiries
          </Link>
          <ActionButton label="Refresh" onClick={() => void load()} disabled={loading} />
        </>
      }
    >
      {loading ? <StateBox tone="loading" title="Loading inquiry detail" detail="Fetching inquiry and transaction payloads." /> : null}
      {error ? <StateBox tone="error" title="Failed to load inquiry detail" detail={error} /> : null}

      {!loading && !error && inquiry ? (
        <>
          <DashboardCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300">Inquiry</p>
                <p className="mt-2 font-mono text-xs text-slate-300">{inquiry.id}</p>
              </div>
              <StatusPill value={inquiry.status} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Created" value={dateText(inquiry.createdAt)} />
              <Metric label="Client Type" value={inquiry.clientType || "-"} />
              <Metric label="Notary Slug" value={inquiry.notarySlug || "-"} />
              <Metric label="WordPress Site" value={inquiry.wordpressSite || "-"} />
            </div>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-xl font-semibold text-white">Transaction</h2>
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
              This payload is for decision support and traceability. Final legal or compliance outcomes must be confirmed by an authorized reviewer.
            </div>
            {!inquiry.transaction ? (
              <div className="mt-4">
                <StateBox tone="empty" title="No linked transaction" detail="This inquiry does not have a linked screening transaction row." />
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Query" value={inquiry.transaction.query} />
                  <Metric label="Normalized Query" value={inquiry.transaction.normalizedQuery || "-"} />
                  <Metric label="Source Mode" value={inquiry.transaction.sourceMode || "-"} />
                  <Metric label="Used Fallback" value={String(Boolean(inquiry.transaction.usedFallback))} />
                  <Metric label="Status" value={inquiry.transaction.status} />
                  <Metric label="Highest Score" value={String(inquiry.transaction.highestScore)} />
                  <Metric label="Match Count" value={String(inquiry.transaction.matchCount)} />
                  <Metric label="Response Time" value={inquiry.transaction.responseTimeMs !== null && inquiry.transaction.responseTimeMs !== undefined ? `${inquiry.transaction.responseTimeMs} ms` : "-"} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <Metric label="Client" value={inquiry.transaction.apiClient || "-"} />
                  <Metric label="IP" value={inquiry.transaction.ipAddress || "-"} />
                  <Metric label="Created" value={dateText(inquiry.transaction.createdAt)} />
                </div>

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Warning</p>
                  <p className="mt-2 text-sm text-slate-300">{inquiry.transaction.warning || "-"}</p>
                </div>

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Source Status JSON</p>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-300">{jsonText(inquiry.transaction.sourceStatus)}</pre>
                </div>
              </>
            )}
          </DashboardCard>

          <div className="grid gap-5 xl:grid-cols-2">
            <DashboardCard>
              <h2 className="text-xl font-semibold text-white">Original Payload</h2>
              <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-300">{jsonText(inquiry.originalPayload)}</pre>
            </DashboardCard>

            <DashboardCard>
              <h2 className="text-xl font-semibold text-white">Response Payload</h2>
              <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-300">{jsonText(inquiry.responsePayload)}</pre>
            </DashboardCard>
          </div>
        </>
      ) : null}
    </DashboardShell>
  );
}
