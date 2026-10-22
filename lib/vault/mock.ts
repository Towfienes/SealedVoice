"use client";
// Mock vault: lets the UI and e2e tests run without TideCloak. Plaintext lives only in
// this browser's localStorage, under a separate key, to imitate "only the right role can open".
// Labelled SIMULATED everywhere it shows up in the UI.
import type {
  EnvelopeKind, OpenResult, Receipt, ReportDraft, ReportRecord, ReporterIdentity, Role,
  RoleRequestResult, Session, Vault,
} from "./types";

const ROWS = "sv-mock-rows";
const PLAIN = "sv-mock-plain";
const PERSONA = "sv-mock-persona";

export const MOCK_PERSONAS: Record<string, Session> = {
  mai: { signedIn: true, displayName: "Mai (student)", roles: ["student"], isRealmAdmin: false },
  lan: { signedIn: true, displayName: "Inspector Lan", roles: ["investigator"], isRealmAdmin: true },
  minh: { signedIn: true, displayName: "Guardian Minh", roles: ["identity-guardian"], isRealmAdmin: true },
  council: { signedIn: true, displayName: "University Council", roles: ["council"], isRealmAdmin: false },
  hung: { signedIn: true, displayName: "Dr. Hung (Head of School)", roles: [], isRealmAdmin: true },
};

const read = <T,>(k: string, d: T): T => {
  try { return JSON.parse(localStorage.getItem(k) ?? "") as T; } catch { return d; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const fakeCipher = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(96))));
const now = () => Math.floor(Date.now() / 1000);

export function setMockPersona(id: keyof typeof MOCK_PERSONAS | "") { write(PERSONA, id); }

function current(): Session {
  const id = read<string>(PERSONA, "");
  return MOCK_PERSONAS[id] ?? { signedIn: false, displayName: "", roles: [], isRealmAdmin: false };
}

function open<T>(r: ReportRecord, kind: EnvelopeKind, role: Role): OpenResult<T> {
  const s = current();
  if (!s.signedIn) return { ok: false, reason: "not-signed-in", message: "Sign in first" };
  if (!s.roles.includes(role)) {
    return { ok: false, reason: "role", message: `[SIMULATED] Forseti: executor lacks realm role '${role}'` };
  }
  const unlock = r.envelopes[kind].unlockAt;
  if (unlock && now() < unlock) {
    return { ok: false, reason: "timelock", message: `[SIMULATED] Time lock preventing decryption until ${unlock}` };
  }
  const plain = read<Record<string, Record<string, unknown>>>(PLAIN, {});
  return { ok: true, value: plain[r.id][kind] as T };
}

export const mockVault: Vault = {
  mode: "mock",
  session: current,
  async signIn() { /* persona picker handles this in mock mode */ },
  async signOut() { setMockPersona(""); },
  async sealReport(draft: ReportDraft, identity: ReporterIdentity, opts) {
    const id = crypto.randomUUID();
    const rows = read<ReportRecord[]>(ROWS, []);
    const alias = `#${String.fromCharCode(65 + (rows.length % 26))}${rows.length + 1}`;
    const unlockAt = now() + (opts?.councilDelaySec ?? 180);
    const rec: ReportRecord = {
      id, alias, createdAt: now(), status: "received",
      envelopes: {
        content: { kind: "content", ciphertext: fakeCipher(), tags: ["sv:content"] },
        identity: { kind: "identity", ciphertext: fakeCipher(), tags: ["sv:identity"] },
        council: { kind: "council", ciphertext: fakeCipher(), tags: ["sv:council", `DecryptTimeLock:${unlockAt}`], unlockAt },
      },
    };
    write(ROWS, [rec, ...rows]);
    const plain = read<Record<string, unknown>>(PLAIN, {});
    write(PLAIN, { ...plain, [id]: { content: draft, identity, council: draft } });
    const receipt: Receipt = { reportId: id, alias, createdAt: rec.createdAt, councilUnlockAt: unlockAt, digest: rec.envelopes.content.ciphertext.slice(0, 12) };
    return receipt;
  },
  async listReports() { return read<ReportRecord[]>(ROWS, []); },
  async openContent(r) { return open<ReportDraft>(r, "content", "investigator"); },
  async openIdentity(r) { return open<ReporterIdentity>(r, "identity", "identity-guardian"); },
  async openCouncil(r) { return open<ReportDraft>(r, "council", "council"); },
  async requestRole(username: string, role: Role): Promise<RoleRequestResult> {
    return { status: "pending", httpStatus: 202, message: `[SIMULATED] Change request parked: grant '${role}' to ${username} needs 2 of 3 admins` };
  },
  async rawDatabaseRows() { return read<ReportRecord[]>(ROWS, []); },
};
