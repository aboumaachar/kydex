"use client";

import Link from 'next/link';

const quickActions = [
  { title: 'فحص جديد', href: '/screening/new', note: 'ابدأ فحص اسم جديد فوراً.' },
  { title: 'السجلات', href: '/dashboard/screening/logs', note: 'راجع عمليات الفحص الأخيرة.' },
  { title: 'المصادر', href: '/dashboard/sources', note: 'تحقق من حالة المصادر المتاحة.' },
  { title: 'الحالات', href: '/cases', note: 'انتقل إلى الحالات التي تحتاج إلى مراجعة.' },
] as const;

const dashboardSummary = [
  { label: 'الوضع الافتراضي', value: 'فحص جديد' },
  { label: 'المصادر', value: 'جميع المصادر النشطة' },
  { label: 'التدقيق', value: 'محفوظ تلقائياً' },
] as const;

export default function DashboardPage() {
  return (
    <section className="space-y-6" dir="rtl">
      <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 text-right shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:p-8">
        <div className="space-y-4">
          <p className="text-sm font-medium text-emerald-800">لوحة KYDEX</p>
          <h1 className="text-3xl font-semibold text-slate-950 sm:text-4xl">ابدأ من الفحص</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            هذه الصفحة تعرض فقط المسارات الأساسية للعمل اليومي: تشغيل فحص جديد، مراجعة السجلات، متابعة المصادر، وفتح الحالات التي تحتاج إلى مراجعة.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Link href="/screening/new" className="rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
            فحص جديد
          </Link>
          <Link href="/dashboard/screening/logs" className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50">
            السجلات
          </Link>
          <Link href="/dashboard/sources" className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50">
            المصادر
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.85fr)]">
        <div className="rounded-[1.75rem] border border-white/80 bg-white/85 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <h2 className="text-xl font-semibold text-slate-950">ماذا تفعل الآن؟</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {quickActions.map((card) => (
              <Link key={card.title} href={card.href} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-right transition-colors hover:border-slate-300 hover:bg-white">
                <div className="text-sm font-semibold text-slate-950">{card.title}</div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{card.note}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/80 bg-white/85 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <h2 className="text-xl font-semibold text-slate-950">ملخص سريع</h2>
          <div className="mt-5 space-y-3">
            {dashboardSummary.map((item) => (
              <div key={item.label} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-right">
                <div className="text-sm text-slate-500">{item.label}</div>
                <div className="mt-1 text-base font-semibold text-slate-950">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href="/cases" className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-medium text-slate-800 transition-colors hover:border-slate-300 hover:bg-white">
              الحالات
            </Link>
            <Link href="/admin/audit-logs" className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-medium text-slate-800 transition-colors hover:border-slate-300 hover:bg-white">
              التدقيق
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}
