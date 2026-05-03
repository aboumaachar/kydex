"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/i18n-provider';
import { isAuthenticated, logout } from '../lib/api';
import LanguageSwitcher from './language-switcher';

const SHELL_LINKS = [
  { href: '/screening/new', label: 'nav.newScreening' },
  { href: '/screening/bulk', label: 'nav.bulkScreening' },
  { href: '/screening/document-extraction', label: 'nav.documentExtraction' },
  { href: '/cases', label: 'nav.cases' },
  { href: '/profile', label: 'nav.profile' },
  { href: '/admin/system-health', label: 'nav.systemHealth' },
  { href: '/admin/integrations', label: 'nav.integrations' },
  { href: '/admin/audit-logs', label: 'nav.audit' },
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

export default function AuthShell({ children }: AuthShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { dir, t } = useI18n();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  const isPublicRoute = useMemo(() => PUBLIC_ROUTES.has(pathname), [pathname]);
  const isAuthedRoute = !isPublicRoute && authed;

  useEffect(() => {
    const authenticated = isAuthenticated();
    setAuthed(authenticated);

    if (!isPublicRoute && !authenticated) {
      router.replace('/login');
      setChecked(true);
      return;
    }

    if (isPublicRoute && authenticated) {
      router.replace('/dashboard');
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
      <div className={isAuthedRoute ? 'border-b border-slate-800 bg-slate-950/95 text-slate-200 backdrop-blur' : 'border-b border-slate-200/70 bg-white/60 backdrop-blur'}>
        <div className={`mx-auto flex ${isAuthedRoute ? 'max-w-[1600px]' : 'max-w-6xl'} items-center justify-between gap-4 px-4 py-3 lg:px-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Link href={authed ? '/dashboard' : '/'} className={isAuthedRoute ? 'flex items-center gap-3 text-white' : 'text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase'}>
              {isAuthedRoute ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-400 text-xs font-black tracking-[0.2em] text-slate-950 shadow-lg shadow-teal-950/40">
                    KX
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white">KYDEX</div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Governed Operations</div>
                  </div>
                </>
              ) : (
                t('common.appName')
              )}
            </Link>
            {isAuthedRoute ? (
              <div className="hidden rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400 xl:flex">
                Real session. Real routes. Visual layer only.
              </div>
            ) : null}
          </div>
          <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            {isAuthedRoute ? (
              <Link href="/" className="hidden rounded-full border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300 transition-colors hover:border-slate-700 hover:text-white md:inline-flex">
                Public Site
              </Link>
            ) : null}
            <LanguageSwitcher />
          </div>
        </div>
      </div>
      {isAuthedRoute ? (
        <header className="border-b border-slate-800 bg-[linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.96))]">
          <nav className={`mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 lg:px-6 ${dir === 'rtl' ? 'lg:flex-row-reverse' : 'lg:flex-row'} lg:items-center lg:justify-between`}>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-teal-300">Operations Shell</p>
              <p className="mt-2 text-sm text-slate-400">Dashboard, screening, cases, and audit surfaces remain wired to the live KYDEX application.</p>
            </div>
            <div className={`flex flex-wrap items-center gap-2 ${dir === 'rtl' ? 'justify-end' : ''}`}>
              {SHELL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300 transition-colors hover:border-teal-500/30 hover:bg-slate-900 hover:text-white"
                >
                  {t(link.label)}
                </Link>
              ))}
              <button
                onClick={logout}
                className="rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-teal-200 transition-colors hover:border-teal-400/50 hover:bg-teal-500/20 hover:text-white"
              >
                {t('nav.logout')}
              </button>
            </div>
          </nav>
        </header>
      ) : null}
      <main className={isAuthedRoute ? 'min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.12),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_48%,_#111827_100%)]' : 'mx-auto max-w-6xl px-6 py-8'}>
        {isAuthedRoute ? <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">{children}</div> : children}
      </main>
    </>
  );
}
