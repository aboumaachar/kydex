export default function LegalPage() {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">Legal Terms</h1>
      <p className="mt-3 text-slate-600">
        KYDEX is operated as council compliance infrastructure. Use is restricted to authorized users and
        audited workflows.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-6 text-sm text-slate-700">
        <li>Use restricted to approved legal/compliance operations</li>
        <li>Screening outputs are decision support only and are not automated legal determinations</li>
        <li>Audit records are retained under governance policy and subject to authorized review</li>
        <li>Unauthorized use is prohibited and monitored</li>
      </ul>
    </section>
  );
}
