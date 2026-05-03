"use client";

import dynamic from "next/dynamic";

const DashboardNav = dynamic(() => import("../../../components/dashboard-nav"), { ssr: false });

type DashboardShellProps = {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardShell({ title, description, actions, children }: DashboardShellProps) {
  return (
    <section className="relative pb-8 pt-20 lg:pt-0">
      <DashboardNav />
      <div className="space-y-6 lg:pr-80">
        <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-6 text-white shadow-xl shadow-slate-950/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-teal-300">KYDEX Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
          <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            KYDEX outputs are decision-support signals. Final legal and compliance determinations require qualified human review.
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

export function DashboardCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5 text-white shadow-lg shadow-slate-950/20 ${className}`}>{children}</div>;
}

export function StateBox({
  tone,
  title,
  detail,
}: {
  tone: "loading" | "empty" | "error";
  title: string;
  detail?: string;
}) {
  const toneClass = tone === "error"
    ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
    : tone === "loading"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
      : "border-slate-700 bg-slate-900/70 text-slate-200";

  return (
    <div className={`rounded-[1.25rem] border p-4 ${toneClass}`}>
      <p className="text-sm font-semibold">{title}</p>
      {detail ? <p className="mt-2 text-sm opacity-90">{detail}</p> : null}
    </div>
  );
}

export function ActionButton({
  label,
  onClick,
  disabled,
  variant = "secondary",
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const variantClass = variant === "primary"
    ? "border-teal-500/40 bg-teal-500/20 text-teal-100 hover:border-teal-400/60 hover:bg-teal-500/30"
    : variant === "danger"
      ? "border-rose-500/40 bg-rose-500/20 text-rose-100 hover:border-rose-400/60 hover:bg-rose-500/30"
      : "border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-600 hover:text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClass}`}
    >
      {label}
    </button>
  );
}

export function StatusPill({ value }: { value: string | boolean | null | undefined }) {
  const text = value === null || value === undefined || value === "" ? "n/a" : String(value);
  const normalized = text.toLowerCase();

  const style = normalized.includes("connected") || normalized === "true"
    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-100"
    : normalized.includes("offline") || normalized.includes("failed") || normalized.includes("error") || normalized === "false"
      ? "border-rose-500/40 bg-rose-500/20 text-rose-100"
      : normalized.includes("degraded") || normalized.includes("fallback") || normalized.includes("running") || normalized.includes("pending")
        ? "border-amber-500/40 bg-amber-500/20 text-amber-100"
        : "border-slate-700 bg-slate-900/80 text-slate-200";

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${style}`}>{text}</span>;
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-300">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}

export function dateText(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function jsonText(value: unknown) {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
