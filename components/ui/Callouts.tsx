"use client";
import type { ReactNode } from "react";
import { useVault } from "@/lib/vault";

export function SimulatedBadge() {
  const vault = useVault();
  if (vault.mode !== "mock") return null;
  return <span className="sv-badge sv-badge-sim" title="Mock vault: nothing here ran on Tide">SIMULATED</span>;
}

export function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

const REASON: Record<string, string> = {
  role: "Role check failed",
  timelock: "Time lock",
  "not-signed-in": "Not signed in",
  error: "Error",
};

/** The vault's own denial string, shown verbatim. */
export function Denial({ title, reason, message }: { title?: string; reason: string; message: string }) {
  return (
    <div className="sv-denial" role="alert">
      <div className="sv-denial-head">
        <span aria-hidden="true">🔒</span>
        <strong>{title ?? "Denied"}</strong>
        <span className="sv-badge sv-badge-deny">{REASON[reason] ?? reason}</span>
      </div>
      <pre className="sv-verbatim">{message}</pre>
    </div>
  );
}

export function Pending({ httpStatus, message }: { httpStatus: number; message: string }) {
  return (
    <div className="sv-pending" role="status">
      <div className="sv-denial-head">
        <span className="sv-http">HTTP {httpStatus}</span>
        <strong>Pending, not granted</strong>
        <span className="sv-badge sv-badge-pend">Needs 2 of 3 admins</span>
      </div>
      <pre className="sv-verbatim">{message}</pre>
    </div>
  );
}

export function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="sv-panel">
      <header className="sv-panel-head">
        <h2>{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function SignInPrompt({ what }: { what: string }) {
  return (
    <div className="sv-callout">
      <strong>Sign in to {what}.</strong> Use the sign-in control in the bar above.
    </div>
  );
}
