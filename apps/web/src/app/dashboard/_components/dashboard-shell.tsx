"use client";

type DashboardShellProps = {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardShell({ title, description, actions, children }: Readonly<DashboardShellProps>) {
  return (
    <section className="space-y-6" dir="rtl">
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-white/80 bg-white/85 p-6 text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="text-right">
              <p className="text-sm font-medium text-emerald-800">KYDEX</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-950">
            نتائج KYDEX هي مخرجات مساعدة لاتخاذ القرار، وتتطلب مراجعة بشرية مؤهلة قبل اعتماد أي قرار قانوني أو امتثالي.
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

export function DashboardCard({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <div className={`rounded-[1.5rem] border border-white/80 bg-white/85 p-5 text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.05)] ${className}`}>{children}</div>;
}

export function StateBox({
  tone,
  title,
  detail,
}: Readonly<{
  tone: "loading" | "empty" | "error";
  title: string;
  detail?: string;
}>) {
  let toneClass = "border-slate-200 bg-slate-50 text-slate-700";

  if (tone === "error") {
    toneClass = "border-rose-200 bg-rose-50 text-rose-700";
  } else if (tone === "loading") {
    toneClass = "border-sky-200 bg-sky-50 text-sky-700";
  }

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
}: Readonly<{
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}>) {
  let variantClass = "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-950";

  if (variant === "primary") {
    variantClass = "border-emerald-800 bg-emerald-800 text-white hover:bg-emerald-700";
  } else if (variant === "danger") {
    variantClass = "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClass}`}
    >
      {label}
    </button>
  );
}

export function StatusPill({ value }: Readonly<{ value: string | boolean | null | undefined }>) {
  const text = value === null || value === undefined || value === "" ? "n/a" : String(value);
  const normalized = text.toLowerCase();

  let style = "border-slate-200 bg-slate-50 text-slate-700";

  if (normalized.includes("connected") || normalized === "true") {
    style = "border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (normalized.includes("offline") || normalized.includes("failed") || normalized.includes("error") || normalized === "false") {
    style = "border-rose-200 bg-rose-50 text-rose-700";
  } else if (normalized.includes("degraded") || normalized.includes("fallback") || normalized.includes("running") || normalized.includes("pending")) {
    style = "border-amber-200 bg-amber-50 text-amber-700";
  }

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] ${style}`}>{text}</span>;
}

export function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
      <div className="text-[10px] tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
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
    return Object.prototype.toString.call(value);
  }
}
