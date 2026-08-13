"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PIN_MIN_LENGTH, PIN_MAX_LENGTH } from "@/lib/authConstants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, pin }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not sign in.");
        return;
      }
      router.push("/sessions");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <h1>FMS Site Survey</h1>
        <p className="muted">First time here? Type the email your admin registered and pick any PIN - it becomes your permanent PIN.</p>
        <label><span>Email</span><input type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></label>
        <label>
          <span>PIN</span>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            required
            minLength={PIN_MIN_LENGTH}
            maxLength={PIN_MAX_LENGTH}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder={`${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits`}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={saving || !email.trim() || pin.length < PIN_MIN_LENGTH}>
          {saving ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
