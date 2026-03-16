"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2, X } from "lucide-react";

interface MushroomResult {
  inaturalist_id: number;
  latin_name: string;
  common_name: string | null;
  image_url: string | null;
}

interface Props {
  value: MushroomResult | null;
  onChange: (mushroom: MushroomResult | null) => void;
}

export function MushroomSearch({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MushroomResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchMushrooms = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/mushrooms/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchMushrooms(val), 400);
  };

  const handleSelect = (m: MushroomResult) => {
    onChange(m);
    setQuery("");
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
        {value.image_url ? (
          <img
            src={value.image_url}
            alt={value.latin_name}
            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground text-lg">
            🍄
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium italic">{value.latin_name}</p>
          {value.common_name && (
            <p className="text-xs text-muted-foreground">{value.common_name}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="flex-shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Начните вводить название гриба (рус., лат., англ.)..."
          className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[28rem] overflow-y-auto rounded-xl border border-white/15 bg-zinc-900 shadow-2xl">
          {results.map((m, i) => (
            <button
              key={m.inaturalist_id}
              type="button"
              onClick={() => handleSelect(m)}
              className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/10 ${i > 0 ? "border-t border-white/10" : ""}`}
            >
              {m.image_url ? (
                <img
                  src={m.image_url}
                  alt={m.latin_name}
                  className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-3xl">
                  🍄
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold italic text-white">{m.latin_name}</p>
                {m.common_name && (
                  <p className="mt-0.5 truncate text-sm text-zinc-400">
                    {m.common_name}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-white/15 bg-zinc-900 p-4 text-center text-sm text-zinc-400 shadow-2xl">
          Ничего не найдено
        </div>
      )}
    </div>
  );
}
