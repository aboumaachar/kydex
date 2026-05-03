"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';

const DashboardNav = dynamic(() => import('../../components/dashboard-nav'), { ssr: false });

const overviewMetrics = [
  { label: 'Screening Modes', value: 'Live + Batch', detail: 'Single and batch entry points stay on the real KYDEX routes.' },
  { label: 'Case Handling', value: 'Reviewer Ready', detail: 'Case review and escalation remain first-class operational surfaces.' },
  { label: 'Evidence Output', value: 'Timeline + Package', detail: 'Audit evidence continues to flow through the live product.' },
  { label: 'Session Posture', value: 'Role Controlled', detail: 'Authentication and access control are unchanged.' },
] as const;

const actionCards = [
  { title: 'Run New Screening', href: '/screening/new', note: 'Start a governed screening run against active sources.' },
  { title: 'Bulk Screening', href: '/screening/bulk', note: 'Queue multi-record checks and monitor batch progress.' },
  { title: 'Document Extraction', href: '/screening/document-extraction', note: 'Extract fields, confirm them, and send them into screening.' },
  { title: 'Review Cases', href: '/cases', note: 'Work high-priority decisions, escalations, and evidence review.' },
] as const;

const routeRows = [
  { title: 'Dashboard', href: '/dashboard', scope: 'Overview shell', state: 'Active' },
  { title: 'New Screening', href: '/screening/new', scope: 'Live screening workflow', state: 'Ready' },
  { title: 'Bulk Screening', href: '/screening/bulk', scope: 'Queued volume checks', state: 'Ready' },
  { title: 'Document Extraction', href: '/screening/document-extraction', scope: 'Document-to-screen flow', state: 'Ready' },
  { title: 'Cases', href: '/cases', scope: 'Review and escalation queue', state: 'Active' },
  { title: 'Data Sources', href: '/admin/data-sources', scope: 'Source control surface', state: 'Governed' },
] as const;

const workflowSpine = [
  { step: '01', title: 'Source Control', description: 'Official data source activation and version control stay anchored to the live admin surfaces.' },
  { step: '02', title: 'Governed Screening', description: 'Operational screening routes remain intact for real searches and case generation.' },
  { step: '03', title: 'Reviewer Decision', description: 'Case handling and escalation logic stay owned by KYDEX.' },
  { step: '04', title: 'Evidence Export', description: 'Audit packages and compliance timelines remain part of the real product workflow.' },
] as const;

const controlNotes = [
  'No donor authentication or donor search logic is used here.',
  'All route targets continue to point at the real KYDEX operational app.',
  'The dashboard shell is restyled for hierarchy, density, and product feel only.',
] as const;

export default function DashboardPage() {
  return (
    <section className="relative pb-8 pt-20 lg:pt-0">
      <DashboardNav />
      <div className="space-y-6 lg:pr-80">
        <section className="rounded-[2rem] border border-slate-800 bg-[linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(2,6,23,0.92))] p-6 text-white shadow-2xl shadow-slate-950/40 lg:p-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_360px]">
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Governed Operations</p>
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  KYDEX dashboard shell for live screening, case review, and audit evidence.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-400">
                  The operational functionality remains KYDEX-owned. Phase 4 only reshapes the layout, navigation, and visual hierarchy around the real authenticated workflow.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/screening/new" className="inline-flex rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300">
                  Run New Screening
                </Link>
                <Link href="/cases" className="inline-flex rounded-full border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white">
                  Open Cases
                </Link>
                <Link href="/admin/data-sources" className="inline-flex rounded-full border border-slate-700 bg-transparent px-5 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-teal-500/30 hover:bg-slate-900 hover:text-white">
                  Review Sources
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{metric.label}</div>
                    <div className="mt-3 text-2xl font-semibold text-white">{metric.value}</div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{metric.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-teal-300">Workflow Spine</div>
                  <div className="mt-2 text-lg font-semibold text-white">Control Surface</div>
                </div>
                <div className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                  Active
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {workflowSpine.map((item) => (
                  <div key={item.step} className="rounded-[1.25rem] border border-slate-800 bg-slate-900/80 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-[11px] font-semibold tracking-[0.2em] text-teal-200">
                        {item.step}
                      </div>
                      <div className="text-sm font-semibold text-white">{item.title}</div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.85fr)]">
          <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 text-white shadow-xl shadow-slate-950/30">
            <div className="flex flex-col gap-3 border-b border-slate-800 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-teal-300">Operational Directory</div>
                <h2 className="mt-2 text-2xl font-semibold">Live KYDEX Surfaces</h2>
              </div>
              <div className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Route-aware shell
              </div>
            </div>
            <div className="overflow-x-auto px-3 py-3 sm:px-6 sm:py-4">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm text-slate-300">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-3 py-2 font-medium">Surface</th>
                    <th className="px-3 py-2 font-medium">Scope</th>
                    <th className="px-3 py-2 font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {routeRows.map((row) => (
                    <tr key={row.href} className="rounded-2xl border border-slate-800 bg-slate-900/70">
                      <td className="rounded-l-2xl px-3 py-3">
                        <Link href={row.href} className="font-semibold text-white transition-colors hover:text-teal-300">
                          {row.title}
                        </Link>
                        <div className="mt-1 text-xs text-slate-500">{row.href}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-400">{row.scope}</td>
                      <td className="rounded-r-2xl px-3 py-3">
                        <span className="inline-flex rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-teal-200">
                          {row.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-6 text-white shadow-xl shadow-slate-950/30">
              <div className="text-[11px] uppercase tracking-[0.22em] text-teal-300">Control Notes</div>
              <h2 className="mt-2 text-2xl font-semibold">Phase 4 Guardrails</h2>
              <div className="mt-5 space-y-3">
                {controlNotes.map((note) => (
                  <div key={note} className="rounded-[1.25rem] border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm leading-6 text-slate-300">
                    {note}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-800 bg-[linear-gradient(180deg,_rgba(20,184,166,0.12),_rgba(2,6,23,0.92))] p-6 text-white shadow-xl shadow-slate-950/30">
              <div className="text-[11px] uppercase tracking-[0.22em] text-teal-300">Operational Summary</div>
              <h2 className="mt-2 text-2xl font-semibold">Visual refresh, real workflow</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The dashboard no longer carries council language, and the surface now matches the KYDEX landing and login shell without changing authentication, screening, or evidence behavior.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link href="/admin/system-health" className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 px-4 py-4 text-sm font-medium text-slate-200 transition-colors hover:border-teal-500/30 hover:text-white">
                  System Health
                </Link>
                <Link href="/admin/audit-logs" className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 px-4 py-4 text-sm font-medium text-slate-200 transition-colors hover:border-teal-500/30 hover:text-white">
                  Audit Logs
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {actionCards.map((card) => (
            <Link key={card.title} href={card.href} className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5 text-white shadow-lg shadow-slate-950/20 transition-transform transition-colors hover:-translate-y-0.5 hover:border-teal-500/30 hover:bg-slate-900/80">
              <div className="text-[11px] uppercase tracking-[0.2em] text-teal-300">Action Surface</div>
              <h2 className="mt-3 text-xl font-semibold">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{card.note}</p>
            </Link>
          ))}
        </section>
      </div>
    </section>
  );
}
