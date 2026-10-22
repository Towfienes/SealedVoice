"use client";
import { useCallback, useEffect, useState } from "react";
import { useVault, setMockPersona, type Session } from "@/lib/vault";

const EVT = "sv-session-change";

export function notifySessionChange() {
  window.dispatchEvent(new Event(EVT));
}

/** Mock mode only: pick a persona ("" = signed out) and tell every subscribed component. */
export function switchPersona(id: string) {
  setMockPersona(id);
  notifySessionChange();
}

/** session is null until mounted, so server and first client render match. */
export function useSession() {
  const vault = useVault();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Only update when the session really changed; a fresh-but-equal object must not re-render (render-loop guard).
    const sync = () => {
      const next = vault.session();
      setSession((prev) =>
        prev && prev.signedIn === next.signedIn && prev.displayName === next.displayName &&
        prev.isRealmAdmin === next.isRealmAdmin && prev.roles.join(",") === next.roles.join(",")
          ? prev
          : next,
      );
    };
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [vault]);

  return { vault, session, ready: session !== null };
}

export function useReports() {
  const { vault, session } = useSession();
  const [reports, setReports] = useState<Awaited<ReturnType<typeof vault.listReports>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setReports(await vault.listReports());
      setError(null);
    } catch (e) {
      setReports([]);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [vault]);

  const signedIn = session?.signedIn;
  useEffect(() => {
    if (signedIn === undefined) return;
    void reload();
  }, [signedIn, session?.displayName, reload]);

  return { reports, error, reload };
}
