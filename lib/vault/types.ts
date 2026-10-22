// The contract between the UI (WT-B) and the TideCloak/Forseti layer (WT-A).
// UI code imports only from "@/lib/vault". Never import mock.ts or tide.ts directly.
// Changing this file needs the lead's OK: both worktrees depend on it.

export type Role = "student" | "investigator" | "identity-guardian" | "council";

/** The three sealed envelopes created for every report. Each is a separate doEncrypt call. */
export type EnvelopeKind = "content" | "identity" | "council";

export interface ReportDraft {
  title: string;
  category: "grade-for-favours" | "harassment" | "research-misconduct" | "financial" | "other";
  accused: string; // e.g. "Lecturer, Faculty of Engineering"
  description: string;
  evidence?: string; // free text / links, synthetic data only
}

export interface ReporterIdentity {
  fullName: string;
  studentId: string;
  email: string;
  faculty: string;
}

export interface SealedEnvelope {
  kind: EnvelopeKind;
  ciphertext: string; // opaque string from doEncrypt (mock: fake base64)
  tags: string[]; // exact tags used at encrypt time. MUST be passed back unchanged on decrypt
  unlockAt?: number; // epoch seconds, council envelope only
}

export type ReportStatus = "received" | "investigating" | "resolved";

/** What the server stores and returns. It never contains plaintext. */
export interface ReportRecord {
  id: string;
  alias: string; // public pseudonym, e.g. "#A7"
  createdAt: number; // epoch seconds
  status: ReportStatus;
  envelopes: Record<EnvelopeKind, SealedEnvelope>;
}

export interface Receipt {
  reportId: string;
  alias: string;
  createdAt: number;
  councilUnlockAt: number;
  digest: string; // short hash of the three ciphertexts, so the student can prove submission
}

export type DenyReason = "role" | "timelock" | "not-signed-in" | "error";
export type OpenResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: DenyReason; message: string }; // message = exact ORK/Tide text when available

export interface RoleRequestResult {
  status: "pending" | "applied" | "error";
  httpStatus: number; // 202 = parked change request (quorum needed)
  message: string;
}

export interface Session {
  signedIn: boolean;
  displayName: string;
  roles: string[]; // realm roles from the token
  isRealmAdmin: boolean;
}

export interface Vault {
  mode: "mock" | "tide";
  session(): Session;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** Encrypt 3 envelopes in the browser, then POST ciphertext to /api/reports WITHOUT an auth header. */
  sealReport(draft: ReportDraft, identity: ReporterIdentity, opts?: { councilDelaySec?: number }): Promise<Receipt>;
  listReports(): Promise<ReportRecord[]>;
  openContent(r: ReportRecord): Promise<OpenResult<ReportDraft>>;
  openIdentity(r: ReportRecord): Promise<OpenResult<ReporterIdentity>>;
  openCouncil(r: ReportRecord): Promise<OpenResult<ReportDraft>>;
  /** Insider scene: try to grant a role. With Tide multi-admin, this returns 202 pending. */
  requestRole(username: string, role: Role): Promise<RoleRequestResult>;
  /** Insider scene: the raw rows an admin with DB access would see. */
  rawDatabaseRows(): Promise<ReportRecord[]>;
}
