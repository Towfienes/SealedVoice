"use client";
// DEV-ONLY, not linked from the nav. Answers one question for the video: is DecryptTimeLock bound to the ciphertext?
// A council-role user decrypts the same council envelope with (a) its stored tags, (b) the lock changed to a past epoch,
// (c) the lock tag removed. Results are shown verbatim. Nothing here "fixes" anything.
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { policyBytes } from "@/lib/vault/tide";

interface Row { id: string; alias: string; createdAt: number; envelopes: { council: { ciphertext: string; tags: string[]; unlockAt?: number } } }
interface Outcome { label: string; tags: string[]; result: string }

const LOCK = "DecryptTimeLock:";

export default function Lab() {
  const auth = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    (async () => {
      const res = await fetch("/api/reports", { headers: { Authorization: `Bearer ${await auth.getToken()}` } });
      if (res.ok) setRows(await res.json());
      else setErr(`GET /api/reports -> HTTP ${res.status} ${await res.text()}`);
    })();
  }, [auth.isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const attempt = async (r: Row) => {
    setBusy(true); setOutcomes([]); setErr("");
    const env = r.envelopes.council;
    const past = Math.floor(Date.now() / 1000) - 3600;
    const variants: { label: string; tags: string[] }[] = [
      { label: "(a) stored tags, unchanged", tags: env.tags },
      { label: `(b) ${LOCK} changed to a past epoch (${past})`, tags: env.tags.map((t) => (t.startsWith(LOCK) ? `${LOCK}${past}` : t)) },
      { label: "(c) lock tag removed", tags: env.tags.filter((t) => !t.startsWith(LOCK)) },
    ];
    const out: Outcome[] = [];
    try {
      const policy = await policyBytes("council");
      for (const v of variants) {
        let result: string;
        try {
          const [plain] = await auth.doDecrypt([{ encrypted: env.ciphertext, tags: v.tags }], policy);
          result = `OPENED: ${typeof plain === "string" ? plain : new TextDecoder().decode(plain)}`;
        } catch (e: any) {
          result = `DENIED: ${String(e?.message ?? e)}`;
        }
        out.push({ ...v, result });
        setOutcomes([...out]);
      }
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    setBusy(false);
  };

  if (auth.isLoading) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!auth.isAuthenticated) return <main style={{ padding: 24 }}>Sign in as the council seat (Guardian Minh, user <code>minh</code>) first.</main>;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }}>
      <h1>Lab: is the time lock bound to the ciphertext?</h1>
      <p>Dev-only. Pick a report; this tries to open its council envelope three ways. You need the <code>council</code> role.</p>
      {err && <pre role="alert" style={{ whiteSpace: "pre-wrap" }}>{err}</pre>}
      {rows.map((r) => (
        <div key={r.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <code>{r.alias}</code>
          <span>unlock {r.envelopes.council.unlockAt ? new Date(r.envelopes.council.unlockAt * 1000).toLocaleString() : "?"}</span>
          <button disabled={busy} onClick={() => attempt(r)}>Try 3 ways</button>
        </div>
      ))}
      {outcomes.map((o) => (
        <section key={o.label} style={{ border: "1px solid #8884", borderRadius: 8, padding: 12 }}>
          <strong>{o.label}</strong>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>tags: {JSON.stringify(o.tags)}</pre>
          <pre style={{ whiteSpace: "pre-wrap" }}>{o.result}</pre>
        </section>
      ))}
    </main>
  );
}
