"use client";

import { useState } from "react";
import type { designRules } from "@/db/schema";

type DesignRuleRecord = typeof designRules.$inferSelect;

export default function DesignRulesList({ initialRules }: { initialRules: DesignRuleRecord[] }) {
  const [rules, setRules] = useState(initialRules);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/design-rules/${id}`, { method: "DELETE" });
      if (res.ok) setRules((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <table className="data-table">
      <thead>
        <tr><th>Name</th><th>Category</th><th>Rule</th><th></th></tr>
      </thead>
      <tbody>
        {rules.map((r) => (
          <tr key={r.id}>
            <td>{r.name}</td>
            <td>{r.category || <span className="muted">—</span>}</td>
            <td>{r.rule}</td>
            <td>
              <button type="button" className="text-button" onClick={() => handleDelete(r.id)} disabled={deletingId === r.id}>
                {deletingId === r.id ? "Removing…" : "Remove"}
              </button>
            </td>
          </tr>
        ))}
        {rules.length === 0 ? <tr><td colSpan={4} className="muted">No design rules yet.</td></tr> : null}
      </tbody>
    </table>
  );
}
