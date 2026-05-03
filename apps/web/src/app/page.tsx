import Link from 'next/link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const workflowSteps = [
  {
    step: '01',
    title: 'Ingest Official Sources',
    description: 'Validate official sanctions and compliance datasets before they become searchable in production.',
  },
  {
    step: '02',
    title: 'Version and Audit',
    description: 'Hash, timestamp, and preserve active source versions so every decision is reproducible.',
  },
  {
    step: '03',
    title: 'Run Governed Screening',
    description: 'Search local lists, document evidence, and route results through governed decision workflows.',
  },
  {
    step: '04',
    title: 'Export Evidence',
    description: 'Generate case-ready timelines, evidence packages, and reviewer decisions for audit and escalation.',
  },
];

const trustPillars = [
  'Local dataset search with governed source activation',
  'Case review and escalation workflows for operational teams',
  'Evidence exports and audit timelines for defensible decisions',
  'Role-aware interfaces for screening, review, and administration',
];

const planTiers = [
  {
    name: 'Operator',
    detail: 'For single teams starting governed screening.',
    price: '$0',
    cadence: '/month',
    cta: 'Start Free',
    href: '/login',
    featured: false,
    features: ['50 screenings monthly', 'Dashboard access', 'Core audit visibility', 'Single-workspace use'],
  },
  {
    name: 'Professional',
    detail: 'For institutions running repeated compliance operations.',
    price: '$49',
    cadence: '/month',
    cta: 'Upgrade Workflow',
    href: '/login',
    featured: true,
    features: ['500 screenings monthly', 'Integration API access', 'Expanded evidence retention', 'Operational reporting'],
  },
  {
    name: 'Enterprise',
    detail: 'For high-volume, multi-team, regulated deployments.',
    price: 'Custom',
    cadence: '',
    cta: 'Contact Operations',
    href: '/support',
    featured: false,
    features: ['Unlimited screening volume', 'Custom deployment workflows', 'Extended retention policies', 'Dedicated rollout support'],
  },
];

export default function Page() {
  return (
    <div className="-mx-6 -mb-8 -mt-8 overflow-hidden bg-slate-950 text-white">
      <section className="relative isolate overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.24),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.18),_transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.94),_rgba(2,6,23,1))]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)] lg:items-center">
          <div className="space-y-8">
            <Badge className="border border-teal-500/30 bg-teal-500/10 px-4 py-1 text-[11px] uppercase tracking-[0.24em] text-teal-200">
              Governed Compliance Platform
            </Badge>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
                KYDEX unifies screening, review, and audit evidence in one operational shell.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Move from raw source ingestion to defensible case decisions with a single workflow designed for regulated teams.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/login">
                <Button size="lg" className="rounded-full bg-teal-500 px-7 text-slate-950 hover:bg-teal-400">
                  Access KYDEX
                </Button>
              </Link>
              <a href="#workflow">
                <Button size="lg" variant="outline" className="rounded-full border-slate-700 bg-transparent px-7 text-slate-200 hover:bg-slate-900 hover:text-white">
                  Explore Workflow
                </Button>
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Screening Modes" value="Live + Batch" />
              <Metric label="Evidence Output" value="Timeline + Package" />
              <Metric label="Operational Scope" value="Cases + Sources + Audit" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur">
            <div className="rounded-[1.5rem] border border-teal-500/20 bg-[linear-gradient(180deg,_rgba(17,24,39,0.95),_rgba(15,23,42,0.95))] p-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-teal-300">Operational Preview</p>
                  <p className="mt-2 text-xl font-semibold">KYDEX Workflow Spine</p>
                </div>
                <div className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                  Active
                </div>
              </div>
              <div className="mt-6 space-y-4 text-sm text-slate-300">
                <PreviewRow title="Source Integrity" value="Verified active versions" />
                <PreviewRow title="Screening State" value="Governed with evidence capture" />
                <PreviewRow title="Case Review" value="Reviewer decision + escalation" />
                <PreviewRow title="Exports" value="Timeline and evidence package" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-6 py-18">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-teal-300">Workflow</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A single path from source control to case-ready evidence.</h2>
            <p className="mt-4 text-base leading-7 text-slate-400">
              The visual language comes from the donor KYDEX shell, but the route behavior stays anchored to the real operational product.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {workflowSteps.map((item) => (
              <Card key={item.step} className="border-slate-800 bg-slate-900/70 text-white shadow-none">
                <CardHeader>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-xs font-semibold tracking-[0.2em] text-teal-200">
                    {item.step}
                  </div>
                  <CardTitle className="text-xl text-white">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-6 text-slate-400">{item.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-18 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.22em] text-teal-300">Trust</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Built for disciplined operations, not decorative dashboards.</h2>
            <p className="text-base leading-7 text-slate-400">
              KYDEX keeps the operational spine visible: source activation, governed screening, case review, and exportable evidence remain first-class surfaces.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {trustPillars.map((pillar) => (
              <div key={pillar} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
                <div className="mb-3 h-2 w-14 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400" />
                {pillar}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-slate-950">
        <div className="mx-auto max-w-6xl px-6 py-18">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-teal-300">Pricing</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Commercial tiers mapped to operational depth.</h2>
            <p className="mt-4 text-base leading-7 text-slate-400">
              Keep the public KYDEX story clear while preserving the real authentication and case-processing flows behind login.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {planTiers.map((tier) => (
              <Card
                key={tier.name}
                className={tier.featured ? 'border-teal-500/40 bg-[linear-gradient(180deg,_rgba(20,184,166,0.14),_rgba(15,23,42,0.92))] text-white shadow-none' : 'border-slate-800 bg-slate-900/70 text-white shadow-none'}
              >
                <CardHeader>
                  <CardTitle className="text-2xl text-white">{tier.name}</CardTitle>
                  <CardDescription className="text-sm leading-6 text-slate-400">{tier.detail}</CardDescription>
                  <div className="pt-4 text-white">
                    <span className="text-4xl font-semibold">{tier.price}</span>
                    {tier.cadence ? <span className="ml-1 text-slate-400">{tier.cadence}</span> : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm text-slate-300">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-teal-300" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={tier.href} className="mt-6 block">
                    {tier.featured ? (
                      <Button className="w-full rounded-full bg-teal-400 text-slate-950 hover:bg-teal-300">
                        {tier.cta}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full rounded-full border border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800">
                        {tier.cta}
                      </Button>
                    )}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function PreviewRow({ title, value }: Readonly<{ title: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
      <span className="text-slate-400">{title}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}
