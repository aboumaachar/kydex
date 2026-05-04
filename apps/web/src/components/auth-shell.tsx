"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/i18n-provider';
import { getStoredUser, isAuthenticated, logout } from '../lib/api';
import LanguageSwitcher from './language-switcher';

const PRIMARY_LINKS = [
  { href: '/screening/new', label: 'فحص جديد' },
  { href: '/dashboard/screening/logs', label: 'السجلات' },
  { href: '/dashboard/sources', label: 'المصادر' },
  { href: '/cases', label: 'الحالات' },
] as const;

const ADMIN_LINKS = [
  { href: '/admin/users', label: 'المستخدمون' },
  { href: '/dashboard/admin/notaries', label: 'كتاب العدل ومفاتيح API' },
  { href: '/admin/data-sources', label: 'مصادر البيانات' },
  { href: '/admin/audit-logs', label: 'سجلات التدقيق' },
  { href: '/admin/system-health', label: 'صحة النظام' },
  { href: '/dashboard/admin/monitoring', label: 'مراقبة النظام' },
] as const;

const PUBLIC_ROUTES: ReadonlySet<string> = new Set<string>([
  '/',
  '/about',
  '/support',
  '/legal',
  '/privacy',
  '/kydex',
  '/login',
]);

type AuthShellProps = {
  readonly children: React.ReactNode;
};

function redirectTargetForShell(isPublicRoute: boolean, authenticated: boolean) {
  if (!isPublicRoute && !authenticated) {
    return '/login';
  }

  if (isPublicRoute && authenticated) {
    return '/screening/new';
  }

  return null;
}

function AuthBrand({ authed }: Readonly<{ authed: boolean }>) {
  if (!authed) {
    return 'KYDEX';
  }

  return (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-600 text-xs font-black tracking-[0.2em] text-white shadow-lg shadow-emerald-950/10">
        KX
      </div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-950">KYDEX</div>
        <div className="text-[10px] text-slate-500">فحص الأسماء</div>
      </div>
    </>
  );
}

function AuthNavigation({ dir, isAdmin }: Readonly<{ dir: string; isAdmin: boolean }>) {
  return (
    <header className="border-b border-slate-200 bg-white/90">
      <nav className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 lg:px-6">
        <div className={`flex flex-wrap items-center gap-2 ${dir === 'rtl' ? 'justify-end' : ''}`}>
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-950"
            >
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              href="/admin/system-health"
              className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 transition-colors hover:border-emerald-400 hover:bg-emerald-100"
            >
              الإدارة
            </Link>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
            <div className={`mb-2 text-xs font-semibold text-emerald-900 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>الإدارة</div>
            <div className={`flex flex-wrap items-center gap-2 ${dir === 'rtl' ? 'justify-end' : ''}`}>
              {ADMIN_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-900 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className={`flex flex-wrap items-center gap-2 ${dir === 'rtl' ? 'justify-end' : ''}`}>
          <button
            onClick={logout}
            className="rounded-full bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            تسجيل الخروج
          </button>
        </div>
      </nav>
    </header>
  );
}

export default function AuthShell({ children }: AuthShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { dir, t } = useI18n();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const isPublicRoute = useMemo(() => PUBLIC_ROUTES.has(pathname), [pathname]);
  const isAuthedRoute = !isPublicRoute && authed;

  useEffect(() => {
    const authenticated = isAuthenticated();
    setAuthed(authenticated);
    const currentRole = getStoredUser()?.role?.toUpperCase() ?? '';
    setIsAdmin(['SUPER_ADMIN', 'COUNCIL_ADMIN', 'ADMIN'].includes(currentRole));

    const redirectTarget = redirectTargetForShell(isPublicRoute, authenticated);
    if (redirectTarget) {
      router.replace(redirectTarget);
      setChecked(true);
      return;
    }

    setChecked(true);
  }, [isPublicRoute, router]);

  if (!checked) {
    return (
      <main className="min-h-[40vh] bg-slate-950 px-6 py-10 text-sm text-slate-400">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900/60 px-6 py-6 backdrop-blur">
          {t('common.checkingSession')}
        </div>
      </main>
    );
  }

  return (
    <>
      <div className={isAuthedRoute ? 'border-b border-slate-200 bg-[#f7f7f0]/95 text-slate-800 backdrop-blur' : 'border-b border-slate-200/70 bg-white/60 backdrop-blur'}>
        <div className={`mx-auto flex ${isAuthedRoute ? 'max-w-[1600px]' : 'max-w-6xl'} items-center justify-between gap-4 px-4 py-3 lg:px-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Link href={authed ? '/screening/new' : '/'} className={isAuthedRoute ? 'flex items-center gap-3 text-slate-900' : 'text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase'}>
              <AuthBrand authed={isAuthedRoute} />
            </Link>
          </div>
          <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
      {isAuthedRoute ? <AuthNavigation dir={dir} isAdmin={isAdmin} /> : null}
      <main className={isAuthedRoute ? 'min-h-screen bg-[linear-gradient(180deg,_#f7f7f0_0%,_#f2efe3_100%)]' : 'mx-auto max-w-6xl px-6 py-8'}>
        {isAuthedRoute ? <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">{children}</div> : children}
      </main>
    </>
  );
}
