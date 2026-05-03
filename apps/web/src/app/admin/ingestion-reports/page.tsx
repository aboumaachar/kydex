import Link from 'next/link';

export default function IngestionReportsPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">Ingestion Reports</h1>
      <p className="mt-2 text-slate-600">
        Review source sync outcomes and ingestion run reports from the data source management flow.
      </p>
      <Link href="/admin/data-sources" className="mt-6 inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm">
        Open Data Source Management
      </Link>
    </section>
  );
}
