"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  createAdminNotaryKey,
  listAdminNotaries,
  listAdminNotaryKeys,
  rotateAdminNotaryKey,
  suspendAdminNotaryKey,
  activateAdminNotaryKey,
  revokeAdminNotaryKey,
  type AdminNotaryKeySummary,
  type AdminNotaryProfileSummary,
} from "../../../../lib/api";
import { ActionButton, DashboardCard, DashboardShell, StateBox, StatusPill, dateText } from "../../_components/dashboard-shell";

type State = {
  notaries: AdminNotaryProfileSummary[];
  keys: AdminNotaryKeySummary[];
};

export default function DashboardAdminNotariesPage() {
  const [state, setState] = useState<State>({ notaries: [], keys: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [secret, setSecret] = useState("");
  const [notarySlug, setNotarySlug] = useState("sandranassif");
  const [displayName, setDisplayName] = useState("Sandra Nassif Kallab");
  const [label, setLabel] = useState("Production notary key");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [notaries, keys] = await Promise.all([listAdminNotaries(), listAdminNotaryKeys()]);
      setState({ notaries, keys });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load admin notary data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createKey = async () => {
    setError("");
    setSecret("");

    try {
      const created = await createAdminNotaryKey({ notarySlug, displayName, label });
      setSecret(created.rawKey);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create notary key");
    }
  };

  const mutateKey = async (id: string, action: "rotate" | "suspend" | "activate" | "revoke") => {
    setError("");
    if (action !== "rotate") {
      setSecret("");
    }

    try {
      if (action === "rotate") {
        const rotated = await rotateAdminNotaryKey(id);
        setSecret(rotated.rawKey);
      } else if (action === "suspend") {
        await suspendAdminNotaryKey(id);
      } else if (action === "activate") {
        await activateAdminNotaryKey(id);
      } else {
        await revokeAdminNotaryKey(id);
      }
      await load();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Key update failed");
    }
  };

  const renderRevoke = (id: string, status: AdminNotaryKeySummary["status"]) => {
    if (status !== "ACTIVE" && status !== "SUSPENDED") {
      return null;
    }
    return <ActionButton label="Revoke" onClick={() => void mutateKey(id, "revoke")} variant="danger" />;
  };

  return (
    <DashboardShell
      title="Admin Notaries"
      description="Manage notary profiles, membership posture, and API key lifecycle for production screening surfaces."
      actions={<ActionButton label="Refresh" onClick={() => void load()} disabled={loading} />}
    >
      {error ? <StateBox tone="error" title="Admin request failed" detail={error} /> : null}
      {secret ? (
        <DashboardCard>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300">Key Secret</p>
          <p className="mt-2 text-sm text-amber-100">Store this key now. It is never shown again after this response.</p>
          <p className="mt-3 break-all rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-100">{secret}</p>
        </DashboardCard>
      ) : null}

      <DashboardCard>
        <h2 className="text-xl font-semibold text-white">Create Notary Key</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
            value={notarySlug}
            onChange={(event) => setNotarySlug(event.target.value)}
            placeholder="notary slug"
          />
          <input
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="display name"
          />
          <input
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="key label"
          />
        </div>
        <div className="mt-4">
          <ActionButton label="Create key" onClick={() => void createKey()} />
        </div>
      </DashboardCard>

      {loading ? (
        <StateBox tone="loading" title="Loading notary administration" detail="Fetching notary profiles and key inventory." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <DashboardCard>
            <h2 className="text-xl font-semibold text-white">Notary Profiles</h2>
            {state.notaries.length === 0 ? (
              <div className="mt-4">
                <StateBox tone="empty" title="No notaries found" detail="Create a key to initialize a notary profile." />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {state.notaries.map((notary) => (
                  <div key={notary.slug} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{notary.displayName}</p>
                        <p className="mt-1 text-xs text-slate-400">slug: {notary.slug}</p>
                        <p className="mt-1 text-xs text-slate-400">plan: {notary.planName}</p>
                        <p className="mt-1 text-xs text-slate-400">manual/image usage: {notary.monthlyUsageManual}/{notary.monthlyUsageImage}</p>
                      </div>
                      <StatusPill value={notary.membershipStatus} />
                    </div>
                    <div className="mt-3">
                      <Link href={`/dashboard/admin/notaries/${notary.slug}`} className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300 hover:text-teal-200">
                        Open detail
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>

          <DashboardCard className="overflow-x-auto">
            <h2 className="text-xl font-semibold text-white">Notary Keys</h2>
            {state.keys.length === 0 ? (
              <div className="mt-4">
                <StateBox tone="empty" title="No keys available" detail="Create a key to begin protected plugin access." />
              </div>
            ) : (
              <table className="mt-4 min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Notary</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Last Used</th>
                    <th className="px-3 py-3">Failed Auth</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.keys.map((key) => (
                    <tr key={key.id} className="border-b border-slate-900/80 text-slate-200">
                      <td className="px-3 py-3">
                        <p className="font-medium text-white">{key.notarySlug}</p>
                        <p className="text-xs text-slate-500">{key.label || "-"}</p>
                      </td>
                      <td className="px-3 py-3"><StatusPill value={key.status} /></td>
                      <td className="px-3 py-3 text-xs">{dateText(key.lastUsedAt || null)}</td>
                      <td className="px-3 py-3 text-xs">{key.failedAuthCount}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <ActionButton label="Rotate" onClick={() => void mutateKey(key.id, "rotate")} />
                          {key.status === "ACTIVE" ? <ActionButton label="Suspend" onClick={() => void mutateKey(key.id, "suspend")} variant="danger" /> : null}
                          {key.status === "SUSPENDED" ? <ActionButton label="Activate" onClick={() => void mutateKey(key.id, "activate")} /> : null}
                          {renderRevoke(key.id, key.status)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DashboardCard>
        </div>
      )}
    </DashboardShell>
  );
}
