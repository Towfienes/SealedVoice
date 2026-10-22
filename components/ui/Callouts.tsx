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

/** Wax seal with a lock: the one visual for "sealed / denied" across the app. */
export function SealIcon({ size = 28 }: { size?: number }) {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 === 0 ? 11.5 : 10;
    return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="sv-seal-icon">
      <polygon points={pts} fill="currentColor" />
      <g fill="none" stroke="#fffdf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="11.2" width="8" height="5.6" rx="1" />
        <path d="M9.7 11.2V9.6a2.3 2.3 0 0 1 4.6 0v1.6" />
      </g>
    </svg>
  );
}

const REASON: Record<string, string> = {
  role: "Role check failed",
  timelock: "Time lock",
  "not-signed-in": "Not signed in",
  error: "Error",
};

/** Blocked state: wax-red band, sealed mark, and the vault's own message in a monospace block, verbatim. */
export function Denial({ title, reason, message, label }: { title?: string; reason: string; message: string; label?: string }) {
  const vault = useVault();
  const band = label ?? (vault.mode === "tide" ? "Blocked by Tide" : "Blocked (simulated)");
  return (
    <div className="sv-verdict blocked" role="alert">
      <div className="sv-verdict-band">
        <SealIcon size={22} />
        <span>{band}</span>
        <span className="sv-verdict-reason">{REASON[reason] ?? reason}</span>
      </div>
      <div className="sv-verdict-body">
        {title && <strong>{title}</strong>}
        <pre className="sv-verbatim">{message}</pre>
      </div>
    </div>
  );
}

export function Pending({ httpStatus, message, label }: { httpStatus: number; message: string; label?: string }) {
  return (
    <div className="sv-verdict pending" role="status">
      <div className="sv-verdict-band">
        <span className="sv-http">HTTP {httpStatus}</span>
        <span>{label ?? 'Pending: quorum approval'}</span>
      </div>
      <div className="sv-verdict-body">
        <strong>Requested, not granted</strong>
        <pre className="sv-verbatim">{message}</pre>
      </div>
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
