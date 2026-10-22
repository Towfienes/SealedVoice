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
    const [p, c] = await Promise.all([
      fetch("/api/policies", { headers: { Authorization: `Bearer ${await auth.getToken()}` } }),
      fetch("/api/policies?type=committed"),
    ]);
    if (p.ok) setPending(await p.json());
    if (c.ok) setCommitted(((await c.json()) as Committed[]).map((x) => x.label).filter(Boolean) as PolicyLabel[]);
  }, [auth]);

  useEffect(() => { if (auth.isAuthenticated) void refresh(); }, [auth.isAuthenticated, refresh]);

  const run = async (key: string, fn: () => Promise<string | void>) => {
    setBusy(key);
    try { const out = await fn(); say(`${key}: ${out ?? "done"}`); } catch (e: any) { say(`${key} FAILED: ${e?.message ?? e}`); }
    setBusy(null);
    await refresh();
  };

  if (auth.isLoading) return <div className="sv-callout">Loading…</div>;
  if (!auth.isAuthenticated) return <div className="sv-callout">Sign in as the realm admin (Dr. Hung) to manage policies.</div>;
  if (!isAdmin) return <div className="sv-callout warn">Forbidden: this page is for the realm admin. (The ORKs enforce the signing; this check is only UX.)</div>;

  const lastError = log.find((l) => l.includes("FAILED"));

  return (
    <div className="sv-stack">
      <div className="sv-page-head">
        <h1 className="sv-h1">Policies</h1>
        <p className="sv-lede">Three Forseti policies on one frozen contract. Create, then Approve, then Commit. Each step opens the Tide enclave.</p>
      </div>
      <div className="sv-grid-3">
      {POLICY_LABELS.map((label) => {
        const spec = POLICY_SPECS[label];
        const row = pending.find((p) => labelOfPending(p) === label);
        const done = committed.includes(label);
        const status = done ? "committed" : row ? "pending" : "none";
        return (
          <section key={label} className="sv-card sv-policy" aria-label={`Policy ${label}`}>
            <div className="sv-policy-head">
              <h2>{label}</h2>
              <span className={`sv-pill sv-pill-${status}`}>{done ? "Committed" : row ? "Pending approval" : "Not created"}</span>
            </div>
            <dl className="sv-kv">
              <dt>decrypt</dt><dd>{spec.decryptRole}</dd>
              <dt>tag</dt><dd className="sv-mono">{spec.resourceTag}</dd>
              <dt>time lock</dt><dd>{spec.requireTimeLock ? "required" : "off"}</dd>
            </dl>
            <ol className="sv-stepper">
              <li className={row || done ? "is-done" : "is-next"}>
              <button className="sv-btn" disabled={!!busy || !!row} onClick={() => run(`create ${label}`, async () => `contract ${(await createPolicy(label, auth)).slice(0, 12)}…`)}>1 · Create</button>
              </li>
              <li className={done ? "is-done" : row ? "is-next" : ""}>
              <button className="sv-btn" disabled={!!busy || !row} onClick={() => run(`approve ${label}`, () => approvePolicy(row!, auth))}>2 · Approve</button>
              </li>
              <li className={done ? "is-done" : ""}>
              <button className="sv-btn" disabled={!!busy || !row} onClick={() => run(`commit ${label}`, () => commitPolicy(row!, auth))}>3 · Commit</button>
              </li>
            </ol>
          </section>
        );
      })}
      </div>
      {lastError && (
        <div className="sv-verdict blocked" role="alert">
          <div className="sv-verdict-band"><span>Last error</span></div>
          <div className="sv-verdict-body"><pre className="sv-verbatim">{lastError}</pre></div>
        </div>
      )}
      <pre className="sv-log" aria-live="polite">{log.join("\n")}</pre>
    </div>
  );
}
