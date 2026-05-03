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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
        <Link href="/" className="flex items-center gap-3 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-950/40">
            <span className="text-sm font-black tracking-[0.2em]">KX</span>
          </div>
          <div>
            <div className="text-lg font-semibold tracking-[0.22em]">KYDEX</div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Compliance Intelligence</div>
          </div>
        </Link>
        <nav>
          <ul className="flex items-center gap-3 text-sm text-slate-300">
            <li><Link href="/about" className="transition-colors hover:text-white">About</Link></li>
            <li><Link href="/legal" className="transition-colors hover:text-white">Legal</Link></li>
            <li><Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link></li>
            <li>
              <Link href="/login" className="rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 font-medium text-teal-300 transition-colors hover:border-teal-400/50 hover:bg-teal-500/20 hover:text-white">
                Sign In
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
