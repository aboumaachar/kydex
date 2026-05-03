export default function SupportPage() {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">Support & Contact</h1>
      <p className="mt-3 text-slate-600">
        Production support for Notary Council deployments and compliance operations.
      </p>
      <div className="mt-6 space-y-2 text-sm text-slate-700">
        <p>Email: support@kydex.local</p>
        <p>Operations Window: Mon-Fri 08:00-18:00 UTC</p>
        <p>Incident Escalation: Use council-approved Sev1 channel and incident runbook.</p>
      </div>
    </section>
  );
}
