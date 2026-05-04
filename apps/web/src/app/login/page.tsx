"use client";

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login, saveAuthSession } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      saveAuthSession(response);
      router.push('/screening/new');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'تعذر تسجيل الدخول.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="-mx-6 -mb-8 -mt-8 min-h-[calc(100vh-14rem)] bg-[linear-gradient(180deg,_#f7f7f0_0%,_#f2efe3_100%)] px-6 py-14 text-slate-900" dir="rtl">
      <div className="mx-auto max-w-3xl text-right">
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
          <div className="mb-8 space-y-3">
            <div className="inline-flex rounded-full border border-emerald-800/10 bg-emerald-50 px-4 py-1 text-xs font-medium text-emerald-800">
              KYDEX
            </div>
            <h1 className="text-3xl font-semibold text-slate-950 sm:text-4xl">تسجيل الدخول إلى كايدكس</h1>
            <p className="text-sm leading-7 text-slate-600">
              أدخل بيانات الوصول الخاصة بك للانتقال مباشرة إلى شاشة الفحص.
            </p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">البريد الإلكتروني</span>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                type="email"
                placeholder="أدخل البريد الإلكتروني"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">كلمة المرور</span>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                type="password"
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              disabled={loading}
              className="w-full rounded-full bg-emerald-800 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'جار تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-500">
            <div className="flex flex-wrap justify-end gap-4">
              <Link href="/" className="transition-colors hover:text-slate-900">العودة إلى الصفحة الرئيسية</Link>
              <Link href="/support" className="transition-colors hover:text-slate-900">الدعم</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
