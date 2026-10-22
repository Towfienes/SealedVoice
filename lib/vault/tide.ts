"use client";
// Real vault: TideCloak login + Forseti-governed encryption. Every denial carries the exact ORK/Tide text.
// One doEncrypt per envelope; each envelope's tags are stored with it and passed back unchanged on decrypt.
import { useMemo, useRef } from "react";
import { IAMService } from "@tidecloak/js";
import { useAuth } from "@/hooks/useAuth";
import { base64ToBytes } from "@/lib/tideSerialization";
import { ENVELOPE_LABEL, envelopeTags, type PolicyLabel } from "@/lib/policies/labels";
import type {
  EnvelopeKind, OpenResult, Receipt, ReportDraft, ReportRecord, ReporterIdentity, Role,
  RoleRequestResult, SealedEnvelope, Session, Vault,
} from "./types";

const DISPLAY: Record<string, string> = {
  admin: "Dr. Hung (Head of School)",
  mai: "Mai (student)",
  council: "Inspector Lan",
  minh: "Guardian Minh",
};

const policyCache = new Map<PolicyLabel, Uint8Array>();

export async function policyBytes(label: PolicyLabel): Promise<Uint8Array> {
  const hit = policyCache.get(label);
  if (hit) return hit;
  const res = await fetch("/api/policies?type=committed");
  if (!res.ok) throw new Error(`Could not load committed policies (HTTP ${res.status})`);
  const rows = (await res.json()) as { label: PolicyLabel | null; data: string }[];
  for (const r of rows) if (r.label) policyCache.set(r.label, base64ToBytes(r.data));
  const bytes = policyCache.get(label);
  if (!bytes) throw new Error(`Policy '${label}' is not committed yet. An admin must commit it at /admin/policies.`);
  return bytes;
}

const now = () => Math.floor(Date.now() / 1000);

async function digestOf(parts: string[]): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts.join("|")));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

export function classifyDenial(message: string): "timelock" | "role" | "error" {
  if (/Time lock/i.test(message)) return "timelock";
  if (/role|denied|deny|forbidden|not allowed|not authori[sz]ed|unauthori[sz]ed|policy/i.test(message)) return "role";
  return "error";
}

type AuthCtx = ReturnType<typeof useAuth>;

/**
 * The vault object must be referentially stable: components subscribe to it in useEffect deps.
 * It changes only when the sign-in state changes. All calls read the latest auth through a ref.
 */
export function useTideVault(): Vault {
  const auth = useAuth();
  const ref = useRef<AuthCtx>(auth);
  ref.current = auth;
  const rolesKey = auth.tokenRoles.join(",");
  return useMemo(() => buildTideVault(ref), [auth.isAuthenticated, auth.vuid, rolesKey]);
}

export type SealProgress = (step: string) => void;
type TideVault = Vault & {
  sealWithProgress(draft: ReportDraft, identity: ReporterIdentity, opts: { councilDelaySec?: number } | undefined, onProgress?: SealProgress): Promise<Receipt>;
};

/**
 * sealReport with progress callbacks ("Encrypting identity envelope…"), without changing the Vault interface in types.ts.
 * Falls back to plain sealReport for the mock vault. Errors start with the failing step (see sealWithProgress).
 */
export function sealReportWithProgress(
  vault: Vault, draft: ReportDraft, identity: ReporterIdentity,
  opts: { councilDelaySec?: number } | undefined, onProgress?: SealProgress,
): Promise<Receipt> {
  const v = vault as Partial<TideVault>;
  return typeof v.sealWithProgress === "function" ? v.sealWithProgress(draft, identity, opts, onProgress) : vault.sealReport(draft, identity, opts);
}

const msgOf = (e: unknown) => String((e as any)?.message ?? e);

function buildTideVault(ref: { current: AuthCtx }): TideVault {
  const A = () => ref.current;

  const session = (): Session => {
    const signedIn = !!A().isAuthenticated;
    let username = "";
    try { username = String(IAMService.getValueFromToken("preferred_username") ?? ""); } catch { /* not signed in */ }
    return {
      signedIn,
      displayName: signedIn ? (DISPLAY[username] ?? username) : "",
      roles: A().tokenRoles,
      isRealmAdmin: A().tokenRoles.some((r) => r.endsWith(":tide-realm-admin") || r === "tide-realm-admin"),
    };
  };

  const bearer = async () => ({ Authorization: `Bearer ${await A().getToken()}` });

  async function encryptEnvelope(kind: EnvelopeKind, plaintext: string, unlockAt?: number): Promise<SealedEnvelope> {
    const tags = envelopeTags(kind, unlockAt);
    const policy = await policyBytes(ENVELOPE_LABEL[kind]);
    const [ciphertext] = await A().doEncrypt([{ data: plaintext, tags }], policy);
    return { kind, ciphertext, tags, ...(unlockAt !== undefined ? { unlockAt } : {}) };
  }

  async function openEnvelope<T>(r: ReportRecord, kind: EnvelopeKind): Promise<OpenResult<T>> {
    if (!A().isAuthenticated) return { ok: false, reason: "not-signed-in", message: "Sign in first" };
    const env = r.envelopes[kind];
    let policy: Uint8Array;
    try {
      policy = await policyBytes(ENVELOPE_LABEL[kind]);
    } catch (e: any) {
      return { ok: false, reason: "error", message: msgOf(e) }; // setup problem, not a Tide denial
    }
    try {
      const [out] = await A().doDecrypt([{ encrypted: env.ciphertext, tags: env.tags }], policy);
      const text = typeof out === "string" ? out : new TextDecoder().decode(out);
      return { ok: true, value: JSON.parse(text) as T };
    } catch (e: any) {
      const message = msgOf(e);
      return { ok: false, reason: classifyDenial(message), message };
    }
  }

  /** Throws Error("<step>: <verbatim Tide/HTTP message>") where step is encrypt content | encrypt identity | encrypt council | POST /api/reports. */
  async function sealWithProgress(
    draft: ReportDraft, identity: ReporterIdentity, opts?: { councilDelaySec?: number }, onProgress?: SealProgress,
  ): Promise<Receipt> {
    const unlockAt = now() + (opts?.councilDelaySec ?? 180);
    const step = async <T,>(name: string, label: string, fn: () => Promise<T>): Promise<T> => {
      onProgress?.(label);
      try { return await fn(); } catch (e) { throw new Error(`${name}: ${msgOf(e)}`); }
    };
    const content = await step("encrypt content", "Encrypting content envelope…", () => encryptEnvelope("content", JSON.stringify(draft)));
    const ident = await step("encrypt identity", "Encrypting identity envelope…", () => encryptEnvelope("identity", JSON.stringify(identity)));
    const council = await step("encrypt council", "Encrypting council envelope…", () => encryptEnvelope("council", JSON.stringify(draft), unlockAt));
    const body = await step("POST /api/reports", "Submitting ciphertext…", async () => {
      // No Authorization header on purpose: the server must not learn who reported.
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          envelopes: {
            content: { ciphertext: content.ciphertext, tags: content.tags },
            identity: { ciphertext: ident.ciphertext, tags: ident.tags },
            council: { ciphertext: council.ciphertext, tags: council.tags, unlockAt },
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`HTTP ${res.status} ${json.error ?? ""}`.trim());
      return json as { id: string; alias: string; createdAt: number };
    });
    return {
      reportId: body.id, alias: body.alias, createdAt: body.createdAt, councilUnlockAt: unlockAt,
      digest: await digestOf([content.ciphertext, ident.ciphertext, council.ciphertext]),
    };
  }

  return {
    mode: "tide",
    session,
    async signIn() {
      try { sessionStorage.setItem("sv-return", location.pathname + location.search); } catch { /* private mode */ }
      IAMService.doLogin();
    },
    async signOut() { IAMService.doLogout(); },

    sealReport: (draft, identity, opts) => sealWithProgress(draft, identity, opts),
    sealWithProgress,

    async listReports() {
      const res = await fetch("/api/reports", { headers: await bearer() });
      if (res.status === 401 || res.status === 403) return [];
      if (!res.ok) throw new Error(`Could not list reports (HTTP ${res.status})`);
      return (await res.json()) as ReportRecord[];
    },

    openContent: (r) => openEnvelope<ReportDraft>(r, "content"),
    openIdentity: (r) => openEnvelope<ReporterIdentity>(r, "identity"),
    openCouncil: (r) => openEnvelope<ReportDraft>(r, "council"),

    async requestRole(username: string, role: Role): Promise<RoleRequestResult> {
      try {
        const res = await fetch("/api/admin/grant-role", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await bearer()) },
          body: JSON.stringify({ username, role }),
        });
        const text = await res.text();
        return {
          status: res.status === 202 ? "pending" : res.ok ? "applied" : "error",
          httpStatus: res.status,
          message: text || (res.status === 202 ? "Change request parked: quorum approval required" : `HTTP ${res.status}`),
        };
      } catch (e) {
        return { status: "error", httpStatus: 0, message: msgOf(e) };
      }
    },

    async rawDatabaseRows() {
      const res = await fetch("/api/admin/db-dump", { headers: await bearer() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return ((await res.json()) as { rows: ReportRecord[] }).rows;
    },
  };
}
