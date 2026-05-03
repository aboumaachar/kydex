"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Operations",
    items: [
      { href: "/dashboard", label: "Overview", icon: "01" },
      { href: "/screening/new", label: "New Screening", icon: "02" },
      { href: "/screening/bulk", label: "Bulk Screening", icon: "03" },
      { href: "/screening/document-extraction", label: "Document Extraction", icon: "04" },
      { href: "/cases", label: "Cases", icon: "05" },
      { href: "/profile", label: "Profile", icon: "06" },
    ],
  },
  {
    title: "Source Intelligence",
    items: [
      { href: "/dashboard/sources", label: "Sources", icon: "11" },
      { href: "/dashboard/sources/ofac", label: "OFAC Status", icon: "12" },
      { href: "/dashboard/sources/ofac/local-lists", label: "OFAC Local Lists", icon: "13" },
      { href: "/dashboard/sources/ofac/sync", label: "OFAC Sync", icon: "14" },
      { href: "/dashboard/sources/ofac/logs", label: "OFAC Logs", icon: "15" },
      { href: "/dashboard/screening/logs", label: "Screening Logs", icon: "16" },
      { href: "/dashboard/inquiries", label: "Inquiries", icon: "17" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/dashboard/admin/notaries", label: "Admin Notaries", icon: "18" },
      { href: "/dashboard/admin/subscriptions", label: "Admin Subscriptions", icon: "19" },
      { href: "/dashboard/admin/usage", label: "Admin Usage", icon: "20" },
      { href: "/dashboard/admin/monitoring", label: "Admin Monitoring", icon: "21" },
      { href: "/admin/data-sources", label: "Data Sources", icon: "07" },
      { href: "/admin/system-health", label: "System Health", icon: "08" },
      { href: "/admin/integrations", label: "Integrations", icon: "09" },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: "10" },
    ],
  },
];

export default function DashboardNav() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const allItems = navGroups.flatMap((group) => group.items);
  const activeItem = allItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 text-white backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-cyan-400 text-xs font-black tracking-[0.2em] text-slate-950 shadow-lg shadow-teal-950/40">
            KX
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[0.2em]">KYDEX</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Operations</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Active Surface</div>
            <div className="text-sm text-slate-200">{activeItem?.label ?? 'Operations'}</div>
          </div>
          <button type="button" onClick={() => setIsMobileOpen(!isMobileOpen)} className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
          {isMobileOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}

      <aside className={`fixed top-0 right-0 z-50 h-full w-80 border-l border-slate-800 bg-[linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(15,23,42,0.98))] text-slate-200 shadow-2xl shadow-slate-950/50 transition-transform lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-800 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-400 text-sm font-black tracking-[0.2em] text-slate-950 shadow-lg shadow-teal-950/40">
                KX
              </div>
              <div>
                <span className="text-sm font-bold uppercase tracking-[0.2em] text-white">KYDEX</span>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Operations Console</div>
              </div>
            </div>
            <div className="mt-5 rounded-[1.5rem] border border-teal-500/20 bg-teal-500/10 p-4 text-sm leading-6 text-slate-300">
              <p className="text-[10px] uppercase tracking-[0.22em] text-teal-200">Governed Shell</p>
              <p className="mt-2">Visual hierarchy is refreshed here without touching real screening, case, or audit flows.</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            {navGroups.map((group) => (
              <div key={group.title} className="mb-6">
                <div className="mb-3 px-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">{group.title}</div>
                <ul className="space-y-2">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center justify-between gap-3 rounded-[1.25rem] border px-4 py-3 text-sm transition-colors ${isActive ? 'border-teal-400/40 bg-teal-500/10 text-white shadow-lg shadow-slate-950/20' : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-teal-500/30 hover:bg-slate-900 hover:text-white'}`}
                        >
                          <span className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-semibold tracking-[0.16em] ${isActive ? 'bg-slate-950 text-teal-200' : 'bg-slate-900 text-teal-300'}`}>
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </span>
                          <span className={`text-[10px] uppercase tracking-[0.18em] ${isActive ? 'text-teal-200' : 'text-slate-500'}`}>
                            Open
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-800 p-4">
            <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Boundary</div>
              <div className="mt-2 text-sm text-slate-300">KYDEX-owned routes remain intact. This rail only changes navigation presentation.</div>
              <Link href="/" className="mt-4 inline-flex rounded-full border border-slate-700 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition-colors hover:border-slate-600 hover:text-white">Public Site</Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
