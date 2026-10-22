"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { MOCK_PERSONAS } from "@/lib/vault";
import { LockIcon, SimulatedBadge } from "./Callouts";
import { notifySessionChange, switchPersona, useSession } from "./useSession";

const NAV = [
  { href: "/report", label: "File a report" },
  { href: "/investigator", label: "Investigator" },
  { href: "/guardian", label: "Guardian" },
  { href: "/council", label: "Council" },
  { href: "/dean", label: "Insider" },
  { href: "/how-it-works", label: "How it works" },
];

const APP_ROLES = ["student", "investigator", "identity-guardian", "council"];

export function PersonaBar() {
  const { vault, session, ready } = useSession();
  const path = usePathname();
  const personaId = ready
    ? Object.entries(MOCK_PERSONAS).find(([, p]) => p.displayName === session?.displayName)?.[0] ?? ""
    : "";

  const [authError, setAuthError] = useState<string | null>(null);
  const safe = async (fn: () => Promise<void>) => {
    setAuthError(null);
    try { await fn(); } catch (e) { setAuthError(e instanceof Error ? e.message : String(e)); }
    notifySessionChange();
  };
  const appRoles = APP_ROLES.filter((r) => session?.roles.includes(r));

  return (
    <header className="sv-top">
      <div className="sv-top-row">
        <Link href="/" className="sv-brand" aria-label="SealedVoice home">
          <LockIcon size={20} />
          <span>SealedVoice</span>
        </Link>

        <div className="sv-who">
          <SimulatedBadge />
          {vault.mode === "mock" ? (
            <>
              <label htmlFor="sv-persona" className="sv-who-label">Signed in as</label>
              <select
                id="sv-persona"
                className="sv-select"
                value={personaId}
                disabled={!ready}
                onChange={(e) => switchPersona(e.target.value)}
              >
                <option value="">Signed out</option>
                {Object.entries(MOCK_PERSONAS).map(([id, p]) => (
                  <option key={id} value={id}>{p.displayName}</option>
                ))}
              </select>
            </>
          ) : ready && session?.signedIn ? (
            <>
              <span className="sv-who-name">{session.displayName || "Signed in"}</span>
              <button className="sv-btn sv-btn-quiet" onClick={() => void safe(() => vault.signOut())}>Sign out</button>
            </>
          ) : (
            <button className="sv-btn sv-btn-quiet" disabled={!ready} onClick={() => void safe(() => vault.signIn())}>Sign in</button>
          )}
        </div>
      </div>

      <nav className="sv-nav" aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined}>{n.label}</Link>
        ))}
      </nav>
      <div className="sv-roles">
        {ready && session?.signedIn && (<>
          <span className="sv-roles-label">Roles</span>
          {appRoles.map((r) => <span key={r} className="sv-badge sv-badge-role">{r}</span>)}
          {session.isRealmAdmin && <span className="sv-badge sv-badge-admin">Realm admin</span>}
          {appRoles.length === 0 && !session.isRealmAdmin && <em>no app roles</em>}
          <details className="sv-debug">
            <summary>Token roles (debug)</summary>
            <p>{session.roles.length ? session.roles.map((r) => <code key={r}>{r}</code>) : <em>none</em>}</p>
          </details>
        </>)}
        {authError && <span className="sv-auth-error" role="alert">{authError}</span>}
      </div>
    </header>
  );
}
