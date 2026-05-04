import Link from 'next/link';

const steps = [
  {
    title: 'أدخل الاسم',
    description: 'ابدأ باسم كامل أو جزء من الاسم للبحث عبر مصادر الفحص المتاحة.',
  },
  {
    title: 'راجع النتائج المحتملة',
    description: 'يعرض KYDEX الأسماء القريبة مع سبب ظهور كل نتيجة بشكل واضح.',
  },
  {
    title: 'احفظ أثر التدقيق',
    description: 'يتم حفظ رقم الحالة وسجل الفحص لدعم المراجعة المهنية عند الحاجة.',
  },
] as const;

export default function Page() {
  return (
    <div className="-mx-6 -mb-8 -mt-8 overflow-hidden bg-[linear-gradient(180deg,_#f7f7f0_0%,_#f2efe3_100%)] text-slate-900" dir="rtl">
      <section className="relative overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,118,110,0.16),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(180,83,9,0.12),_transparent_34%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center">
            <div className="space-y-7 text-right">
              <div className="inline-flex rounded-full border border-emerald-800/10 bg-white/70 px-4 py-1 text-xs font-medium text-emerald-800">
                KYDEX
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                  فحص الأسماء عبر KYDEX
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-700">
                  ابحث عن اسم أو جزء من الاسم لمراجعة النتائج المحتملة عبر مصادر الفحص المتاحة، مع حفظ أثر التدقيق للمراجعة المهنية.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <Link href="/login" className="rounded-full bg-emerald-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                  تسجيل الدخول لبدء الفحص
                </Link>
                <Link href="/support" className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50">
                  طلب الوصول
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-right">
                <div className="text-sm font-medium text-slate-500">ابدأ من البحث</div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-500">
                  أدخل الاسم الكامل أو جزءاً من الاسم
                </div>
                <div className="mt-4 flex justify-end">
                  <Link href="/login" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                    تسجيل الدخول
                  </Link>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  الوصول إلى الفحص يتطلب جلسة دخول صالحة. لا يتم عرض أي نتائج عامة دون تسجيل الدخول.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-6 text-right shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <div className="text-xs font-semibold tracking-[0.2em] text-emerald-700">0{index + 1}</div>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">{step.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-6 py-5 text-right text-sm leading-7 text-amber-950">
          نتائج KYDEX هي مخرجات مساعدة لاتخاذ القرار، ولا تُعد حكماً قانونياً نهائياً. يجب إجراء مراجعة مهنية قبل اتخاذ أي قرار قانوني أو امتثالي.
        </div>
      </section>
    </div>
  );
}
