export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-3 text-slate-600">
        KYDEX follows data minimization and evidence governance principles designed for regulated council
        operations.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-6 text-sm text-slate-700">
        <li>Only compliance-essential personal data is stored</li>
        <li>Document redaction and retention controls are enforced by policy</li>
        <li>Audit and evidence artifacts are access-controlled and immutable</li>
        <li>Screening evidence is retained for investigator review and controlled governance workflows</li>
      </ul>
    </section>
  );
}
