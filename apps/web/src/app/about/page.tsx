export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">About KYDEX</h1>
      <p className="mt-3 text-slate-600">
        KYDEX is a compliance workflow and audit-evidence system used by council and regulated teams to
        run governed screening, escalation workflows, and evidence exports.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-6 text-sm text-slate-700">
        <li>Role-based screening and review operations</li>
        <li>Case lifecycle with SLA breach visibility</li>
        <li>Signed timeline exports and immutable audit chain</li>
      </ul>
    </section>
  );
}
