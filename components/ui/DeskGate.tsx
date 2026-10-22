"use client";
import { useState, type ReactNode } from "react";
import { MOCK_PERSONAS } from "@/lib/vault";
import { Denial } from "./Callouts";
import { BusyLabel } from "./Spinner";
import { notifySessionChange, switchPersona, useSession } from "./useSession";

export type Need = { kind: "role"; role: string } | { kind: "admin" };

interface Props {
  need: Need;
  desk: string;        // e.g. "investigator desk"
  persona: string;     // display name, e.g. "Inspector Lan"
  personaId: keyof typeof MOCK_PERSONAS;
  hint: string;        // what this persona can and cannot do
  children: ReactNode;
}

/** Signed out: a clear "sign in as <persona>" card. Wrong role: a notice, but the page (and its attempt button) stays. */
export function DeskGate({ need, desk, persona, personaId, hint, children }: Props) {
  const { vault, session, ready } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <div className="sv-gate-skeleton" aria-hidden="true" />;

  if (!session?.signedIn) {
    const go = async () => {
      setError(null);
      if (vault.mode === "mock") { switchPersona(personaId); return; }
      setBusy(true);
      try { await vault.signIn(); notifySessionChange(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
      setBusy(false);
    };
    return (
      <div className="sv-card sv-gate">
        <h2>Sign in as {persona}</h2>
        <p>{hint}</p>
        <p className="sv-hint">
          {vault.mode === "mock"
            ? `This is the ${desk}. Mock mode: one click switches to ${persona} (simulated).`
            : `This is the ${desk}. At the TideCloak login, use the ${persona} account.`}
        </p>
        <div>
          <button className="sv-btn sv-btn-seal sv-btn-lg" onClick={go} disabled={busy} aria-busy={busy}>
            {busy ? <BusyLabel label="Opening Tide sign-in…" /> : vault.mode === "mock" ? `Continue as ${persona}` : "Sign in with TideCloak"}
          </button>
        </div>
        {error && <Denial reason="error" message={error} />}
      </div>
    );
  }

  const ok = need.kind === "admin" ? session.isRealmAdmin : session.roles.includes(need.role);
  const needLabel = need.kind === "admin" ? "a realm admin" : `the ${need.role} role`;
  return (
    <div className="sv-stack">
      {!ok && (
        <div className="sv-callout warn" role="status">
          <strong>This desk is for {needLabel}.</strong> You are {session.displayName || "signed in without a name"}.
          {" "}You can still try. The refusal below is part of the demo.
          {vault.mode === "mock" && (
            <> <button className="sv-btn sv-btn-ghost sv-btn-inline" onClick={() => switchPersona(personaId)}>Switch to {persona}</button></>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
