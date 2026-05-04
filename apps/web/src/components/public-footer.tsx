"use client";

import { usePathname } from 'next/navigation';

const PUBLIC_ROUTES: ReadonlySet<string> = new Set<string>([
  '/',
  '/about',
  '/support',
  '/legal',
  '/privacy',
  '/kydex',
  '/login',
]);

export default function PublicFooter() {
  const pathname = usePathname();

  if (!PUBLIC_ROUTES.has(pathname)) {
    return null;
  }

  return (
    <footer className="mt-12 w-full border-t border-slate-200 bg-[#f7f7f0] text-slate-600">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 text-sm md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" dir="rtl">
        <div className="flex items-start gap-4 text-right">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-600 text-sm font-black tracking-[0.2em] text-white">
            KX
          </div>
          <div>
            <div className="font-semibold uppercase tracking-[0.2em] text-slate-950">KYDEX</div>
            <div className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
              KYDEX يركز على فحص الأسماء وعرض النتائج المحتملة مع توضيح سبب ظهور كل نتيجة.
            </div>
          </div>
        </div>
        <div className="grid gap-2 text-right text-sm">
          <div className="font-semibold text-slate-950">تنبيه</div>
          <div className="leading-7 text-slate-600">نتائج KYDEX هي مخرجات مساعدة لاتخاذ القرار وتتطلب مراجعة مهنية قبل اعتماد أي قرار قانوني أو امتثالي.</div>
          <div className="text-xs tracking-[0.18em] text-slate-500">© KYDEX</div>
        </div>
      </div>
    </footer>
  );
}
