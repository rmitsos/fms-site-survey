"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateDesignRuleForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [rule, setRule] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/design-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, category, rule }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not add the design rule.");
        return;
      }
      setName("");
      setCategory("");
      setRule("");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panel">
      <form onSubmit={handleSubmit} className="inline-form">
        <label><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label><span>Category</span><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. clearance, conduit" /></label>
        <label><span>Rule</span><input value={rule} onChange={(e) => setRule(e.target.value)} placeholder="e.g. Min 300mm clearance from power conduit" required /></label>
        <button type="submit" disabled={pending}>{pending ? "Adding…" : "Add rule"}</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
