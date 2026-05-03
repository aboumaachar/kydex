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
    <footer className="mt-12 w-full border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 text-sm md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-sm font-black tracking-[0.2em] text-slate-950">
            KX
          </div>
          <div>
            <div className="font-semibold uppercase tracking-[0.2em] text-white">KYDEX</div>
            <div className="mt-2 max-w-xl text-sm text-slate-400">
              Governed screening, case review, and audit-evidence workflows for regulated environments.
            </div>
          </div>
        </div>
        <div className="grid gap-2 text-sm">
          <div className="font-semibold text-white">Operational Boundaries</div>
          <div className="text-slate-400">KYDEX owns screening workflows, audit evidence, and compliance decision support.</div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">All rights reserved © KYDEX</div>
          <div className="flex flex-wrap gap-4 pt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            <span>Screening</span>
            <span>Cases</span>
            <span>Evidence</span>
            <span>Audit</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
