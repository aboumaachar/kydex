import React from "react";

export function Progress({ value = 0, className = "" }: { value?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`w-full bg-slate-800 rounded ${className}`}>
      <div style={{ width: `${pct}%` }} className="bg-teal-600 h-1 rounded" />
    </div>
  );
}

export default Progress;
