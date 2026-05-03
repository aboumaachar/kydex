import React from 'react';

export const StatusBadge: React.FC<{ health: string }> = ({ health }) => {
  if (health === 'OK') return <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">OK</span>;
  if (health === 'STALE') return <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">STALE</span>;
  if (health === 'WARNING') return <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">WARNING</span>;
  if (health === 'ERROR') return <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">ERROR</span>;
  if (health === 'NEEDS_SYNC') return <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">NEEDS SYNC</span>;
  if (health === 'DISABLED') return <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">DISABLED</span>;
  return <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">{health}</span>;
};
