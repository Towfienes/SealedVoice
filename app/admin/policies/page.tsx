"use client";
// Admin-only: create, approve and commit the three SealedVoice policies. Each step opens the Tide enclave for the admin.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { POLICY_LABELS, POLICY_SPECS, type PolicyLabel } from "@/lib/policies/labels";
import { approvePolicy, commitPolicy, createPolicy, labelOfPending, type PendingRow } from "@/lib/policies/flow";

type Committed = { label: PolicyLabel | null };

export default function AdminPolicies() {
  const auth = useAuth();
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [committed, setCommitted] = useState<PolicyLabel[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const say = (m: string) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${m}`, ...l].slice(0, 30));

  const isAdmin = auth.tokenRoles.some((r) => r.endsWith("tide-realm-admin"));

  const refresh = useCallback(async () => {
    const [p, c] = await Promise.all([fetch("/api/policies"), fetch("/api/policies?type=committed")]);
    if (p.ok) setPending(await p.json());
    if (c.ok) setCommitted(((await c.json()) as Committed[]).map((x) => x.label).filter(Boolean) as PolicyLabel[]);
  }, []);

  useEffect(() => { if (auth.isAuthenticated) void refresh(); }, [auth.isAuthenticated, refresh]);

  const run = async (key: string, fn: () => Promise<string | void>) => {
    setBusy(key);
    try { const out = await fn(); say(`${key}: ${out ?? "done"}`); } catch (e: any) { say(`${key} FAILED: ${e?.message ?? e}`); }
    setBusy(null);
    await refresh();
  };

  if (auth.isLoading) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!auth.isAuthenticated) return <main style={{ padding: 24 }}>Sign in as the realm admin (Dr. Hung) to manage policies.</main>;
  if (!isAdmin) return <main style={{ padding: 24 }}>Forbidden: this page is for the realm admin. (The ORKs enforce the signing; this check is only UX.)</main>;

  return (
    <main style={{ padding: 24, maxWidth: 820, margin: "0 auto", display: "grid", gap: 16 }}>
      <h1>Policies</h1>
      <p>Three Forseti policies on one frozen contract. Create, then Approve, then Commit. Each opens the Tide enclave.</p>
      {POLICY_LABELS.map((label) => {
        const spec = POLICY_SPECS[label];
        const row = pending.find((p) => labelOfPending(p) === label);
        const done = committed.includes(label);
        return (
          <section key={label} style={{ border: "1px solid #8884", borderRadius: 8, padding: 16, display: "grid", gap: 8 }}>
            <strong>{label}{done ? "  ✓ committed" : row ? "  (pending)" : ""}</strong>
            <small>decrypt = {spec.decryptRole} · tag = {spec.resourceTag} · time lock = {spec.requireTimeLock ? "required" : "off"}</small>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button disabled={!!busy || !!row} onClick={() => run(`create ${label}`, async () => `contract ${(await createPolicy(label, auth)).slice(0, 12)}…`)}>1 · Create</button>
              <button disabled={!!busy || !row} onClick={() => run(`approve ${label}`, () => approvePolicy(row!, auth))}>2 · Approve</button>
              <button disabled={!!busy || !row} onClick={() => run(`commit ${label}`, () => commitPolicy(row!, auth))}>3 · Commit</button>
            </div>
          </section>
        );
      })}
      <pre aria-live="polite" style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{log.join("\n")}</pre>
    </main>
  );
}
