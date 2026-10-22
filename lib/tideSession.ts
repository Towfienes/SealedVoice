"use client";
// Guards against the Tide SDK's silent re-login.
//
// When the Tide enclave in this browser profile holds a session key that does not match the app's token ("session key
// mismatch"), heimdall calls requireReloginCallback, which in @tidecloak/js is
//   login({ idpHint: "tide", prompt: "login", redirectUri: location.href })
// i.e. a FULL PAGE NAVIGATION. Any in-flight doEncrypt/doDecrypt is killed with the page and nothing is shown.
// We intercept exactly that call (the app's own sign-in uses a different login() shape), reject the in-flight
// operation with a readable error, and show a banner instead of navigating.
import { IAMService } from "@tidecloak/js";
import { rejectAllPending } from "./forcedRelogin";

export { raceForcedRelogin } from "./forcedRelogin";
const USER_KEY = "sv-session-user";

export function currentUsername(): string {
  try { return String(IAMService.getValueFromToken("preferred_username") ?? ""); } catch { return ""; }
}

/** Idempotent. Call after IAMService.initIAM has created the client. */
export function installReloginGuard(onForced: (message: string) => void): void {
  const tc = (IAMService as any)._tc;
  if (!tc || tc.__svReloginGuard) return;
  const original = tc.login.bind(tc);
  tc.__svReloginGuard = true;
  tc.login = (opts?: { idpHint?: string; prompt?: string }) => {
    if (opts?.prompt === "login" && opts?.idpHint === "tide") {
      const message =
        `Tide requires re-authentication: the Tide enclave in this browser does not match the signed-in token ` +
        `(typically a session key mismatch) for '${currentUsername() || "unknown user"}'. ` +
        `Sign out and sign in again as this persona in THIS browser profile, then retry.`;
      console.warn("[SealedVoice] blocked Tide forced re-login:", message);
      const err = new Error(message);
      rejectAllPending(err);
      onForced(message);
      return Promise.resolve();
    }
    return original(opts);
  };
}

/**
 * Compare the account in the token with the one this tab last saw. A different account after a re-auth means the
 * browser's Tide/SSO session belongs to someone else (e.g. Dr. Hung signed in inside Mai's profile).
 */
export function checkIdentityChange(): { from: string; to: string } | null {
  const now = currentUsername();
  if (!now) return null;
  let prev = "";
  try { prev = sessionStorage.getItem(USER_KEY) ?? ""; sessionStorage.setItem(USER_KEY, now); } catch { /* private mode */ }
  return prev && prev !== now ? { from: prev, to: now } : null;
}
