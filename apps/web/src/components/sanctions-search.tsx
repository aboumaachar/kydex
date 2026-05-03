"use client";

import { useState, useEffect } from "react";
// Using simple glyphs/icons instead of lucide-react to avoid extra dependency

interface SanctionResult {
  id: string;
  name: string;
  type: string;
  source: string;
  country?: string;
  aliases?: string[];
  programs?: string[];
  matchScore?: number;
}

export default function SanctionsSearch() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SanctionResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || query.length < 2) {
      setError("يرجى إدخال اسم من حرفين على الأقل");
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(`/api/sanctions/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطأ في البحث');
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="أدخل الاسم للبحث..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="rounded bg-primary px-4 py-2 text-white" disabled={isSearching}>
          {isSearching ? 'جاري البحث...' : '🔍 بحث'}
        </button>
      </form>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      {results !== null && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="rounded bg-green-50 p-6 text-center">
              لا توجد نتائج مطابقة
            </div>
          ) : (
            results.map(r => (
              <div key={r.id} className="rounded border bg-amber-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-amber-900">{r.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{r.type} — {r.source}</div>
                  </div>
                  {r.matchScore && <div className="text-right font-bold">{Math.round(r.matchScore * 100)}%</div>}
                </div>
                {r.aliases && r.aliases.length > 0 && (
                  <div className="mt-2 text-sm">الأسماء البديلة: {r.aliases.join('، ')}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
