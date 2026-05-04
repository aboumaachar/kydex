"use client";

import Link from 'next/link';
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

export default function PublicHeader() {
  const pathname = usePathname();

  if (!PUBLIC_ROUTES.has(pathname)) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-[#f7f7f0]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4" dir="rtl">
        <Link href="/" className="flex items-center gap-3 text-slate-900">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-600 shadow-lg shadow-emerald-950/10">
            <span className="text-sm font-black tracking-[0.2em] text-white">KX</span>
          </div>
          <div>
            <div className="text-lg font-semibold tracking-[0.22em]">KYDEX</div>
            <div className="text-xs text-slate-500">فحص الأسماء</div>
          </div>
        </Link>
        <nav>
          <ul className="flex items-center gap-3 text-sm text-slate-600">
            <li><Link href="/legal" className="transition-colors hover:text-slate-950">الشروط</Link></li>
            <li><Link href="/privacy" className="transition-colors hover:text-slate-950">الخصوصية</Link></li>
            <li>
              <Link href="/login" className="rounded-full bg-emerald-800 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700">
                تسجيل الدخول
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
