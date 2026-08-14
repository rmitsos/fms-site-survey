"use client";

import { useState, useEffect, useRef } from "react";

export type FmsWorkOrder = {
  customerWorkId: string;
  subscriberName: string;
  street: string;
  municipality: string;
  phase: string;
  operationalStatus: string;
};

export default function WorkOrderSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (customerWorkId: string, workOrder: FmsWorkOrder | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<FmsWorkOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function search(q: string) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/fms/work-orders?q=${encodeURIComponent(q.trim())}&limit=10`);
        if (res.ok) {
          const body = await res.json();
          setResults(body.workOrders ?? []);
          setOpen(true);
        }
      } catch {
        // silent - the user can still type manually
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    onChange(v, null);
    search(v);
  }

  function handleSelect(wo: FmsWorkOrder) {
    setQuery(wo.customerWorkId);
    setOpen(false);
    onChange(wo.customerWorkId, wo);
  }

  return (
    <div ref={containerRef} className="wo-search">
      <input
        value={query}
        onChange={handleInputChange}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder="Search by ID, name, street, municipality…"
      />
      {loading && <span className="wo-search-loading">…</span>}
      {open && results.length > 0 && (
        <ul className="wo-search-results">
          {results.map((wo) => (
            <li key={wo.customerWorkId}>
              <button type="button" onClick={() => handleSelect(wo)}>
                <strong>{wo.customerWorkId}</strong>
                <span>{[wo.subscriberName, wo.street, wo.municipality].filter(Boolean).join(" · ")}</span>
                <span className="muted">{wo.phase} · {wo.operationalStatus}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
