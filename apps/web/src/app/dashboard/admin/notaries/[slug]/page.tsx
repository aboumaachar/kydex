"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminNotaryBySlug, getAdminNotaryKeyUsage, type AdminNotaryProfileDetail, type AdminNotaryKeyUsage } from "../../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, Metric, StateBox, StatusPill, dateText } from "../../../_components/dashboard-shell";

export default function DashboardAdminNotaryDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = useMemo(() => (typeof params?.slug === "string" ? params.slug : ""), [params]);
  const pageTitle = slug ? `Notary Detail: ${slug}` : "Notary Detail";

  const [profile, setProfile] = useState<AdminNotaryProfileDetail | null>(null);
  const [usageByKey, setUsageByKey] = useState<Record<string, AdminNotaryKeyUsage>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError("");

    try {
      const details = await getAdminNotaryBySlug(slug);
      setProfile(details);

      const usageEntries = await Promise.all(
        details.keys.map(async (key) => {
          const usage = await getAdminNotaryKeyUsage(key.id);
          return [key.id, usage] as const;
        }),
      );

      setUsageByKey(Object.fromEntries(usageEntries));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load notary detail");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell
      title={pageTitle}
      description="Review membership posture, billing window, key state, and per-key usage for one notary profile."
      actions={<ActionButton label="Refresh" onClick={() => void load()} disabled={loading} />}
    >
      {loading ? <StateBox tone="loading" title="Loading notary detail" detail="Fetching profile, keys, and key usage." /> : null}
      {error ? <StateBox tone="error" title="Detail load failed" detail={error} /> : null}

      {!loading && !error && profile ? (
        <>
          <DashboardCard>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300">Profile</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{profile.displayName}</h2>
                <p className="mt-1 text-sm text-slate-400">slug: {profile.slug}</p>
                <p className="mt-1 text-sm text-slate-400">plan: {profile.planName}</p>
              </div>
              <StatusPill value={profile.membershipStatus} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Metric label="Manual Limit" value={String(profile.planLimitManualSearches)} />
              <Metric label="Image Limit" value={String(profile.planLimitImageSearches)} />
              <Metric label="Billing End" value={dateText(profile.billingPeriodEnd || null)} />
              <Metric label="Monthly Manual" value={String(profile.monthlyUsageManual)} />
              <Metric label="Monthly Image" value={String(profile.monthlyUsageImage)} />
              <Metric label="Trial Ends" value={dateText(profile.trialEndsAt || null)} />
            </div>
          </DashboardCard>

          <DashboardCard className="overflow-x-auto">
            <h2 className="text-xl font-semibold text-white">Key Usage</h2>
            {profile.keys.length === 0 ? (
              <div className="mt-4">
                <StateBox tone="empty" title="No keys for this notary" detail="Create a key in the notary admin page." />
              </div>
            ) : (
              <table className="mt-4 min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Key</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Day (M/I)</th>
                    <th className="px-3 py-3">Month (M/I)</th>
                    <th className="px-3 py-3">Auth Failures</th>
                    <th className="px-3 py-3">Reset At</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.keys.map((key) => {
                    const usage = usageByKey[key.id];
                    return (
                      <tr key={key.id} className="border-b border-slate-900/80 text-slate-200">
                        <td className="px-3 py-3">
                          <p className="font-medium text-white">{key.label || key.id}</p>
                          <p className="text-xs text-slate-500">created: {dateText(key.createdAt)}</p>
                        </td>
                        <td className="px-3 py-3"><StatusPill value={key.status} /></td>
                        <td className="px-3 py-3">{usage ? `${usage.day.manualSearches}/${usage.day.imageSearches}` : "-"}</td>
                        <td className="px-3 py-3">{usage ? `${usage.month.manualSearches}/${usage.month.imageSearches}` : "-"}</td>
                        <td className="px-3 py-3">{usage?.month.authFailures ?? "-"}</td>
                        <td className="px-3 py-3 text-xs">{usage ? dateText(usage.resetAt) : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </DashboardCard>
        </>
      ) : null}
    </DashboardShell>
  );
}
