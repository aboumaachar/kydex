"use client";

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../i18n/i18n-provider';
import { login, saveAuthSession } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('admin@kydex.local');
  const [password, setPassword] = useState('KydexPass123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      saveAuthSession(response);
      router.push('/dashboard');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="-mx-6 -mb-8 -mt-8 min-h-[calc(100vh-14rem)] bg-[linear-gradient(180deg,_rgba(2,6,23,1),_rgba(15,23,42,0.98))] px-6 py-12 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)] lg:items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1 text-[11px] uppercase tracking-[0.22em] text-teal-200">
              Secure Operator Access
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
              Access the real KYDEX workflow without leaving the governed shell.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300">
              Sign in to launch screening, review case decisions, and export defensible audit evidence from the production KYDEX workspace.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <InfoTile label="Screening" value="Live + Batch" />
            <InfoTile label="Evidence" value="Timeline + Package" />
            <InfoTile label="Access" value="Role Controlled" />
          </div>

          <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/50 backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-400 text-sm font-black tracking-[0.2em] text-slate-950">
                KX
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Compliance Boundary</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  This page uses the new KYDEX visual language only. Authentication still runs through the real API session flow and continues to the real dashboard.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              <SecurityPoint title="Authenticated API session" />
              <SecurityPoint title="Governed dashboard redirect" />
              <SecurityPoint title="No mock auth provider" />
              <SecurityPoint title="Audit-ready operator context" />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur">
          <div className="rounded-[1.5rem] border border-slate-800 bg-[linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))] p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-400 text-sm font-black tracking-[0.2em] text-slate-950">
                KX
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-teal-200">KYDEX Login</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">{t('login.title')}</h2>
              </div>
            </div>

            <p className="text-sm leading-6 text-slate-400">{t('login.description')}</p>

            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{t('login.email')}</span>
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-white outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                  type="email"
                  placeholder={t('login.email')}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{t('login.password')}</span>
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-white outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                  type="password"
                  placeholder={t('login.password')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-800/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              ) : null}

              <button
                disabled={loading}
                className="w-full rounded-full bg-teal-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? t('login.signingIn') : t('login.signIn')}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-800 pt-5 text-sm text-slate-400">
              <p>Operator access is routed to the real KYDEX dashboard after successful authentication.</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-slate-500">
                <Link href="/" className="transition-colors hover:text-white">Back to Landing</Link>
                <Link href="/support" className="transition-colors hover:text-white">Support</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoTile({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function SecurityPoint({ title }: Readonly<{ title: string }>) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
      <span className="text-teal-300">•</span>
      <span className="ml-2">{title}</span>
    </div>
  );
}
