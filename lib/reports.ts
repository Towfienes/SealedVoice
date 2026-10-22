// Ciphertext-only report validation and storage. No relative imports: unit-testable with plain node.
// The server never sees plaintext and never learns who reported: the POST is unauthenticated by design.
import type { Database } from "better-sqlite3";
import { randomBytes, randomUUID } from "node:crypto";

export type EnvelopeKind = "content" | "identity" | "council";
export const ENVELOPE_KINDS: EnvelopeKind[] = ["content", "identity", "council"];

export interface StoredEnvelope { kind: EnvelopeKind; ciphertext: string; tags: string[]; unlockAt?: number }
export interface StoredReport {
  id: string;
  alias: string;
  createdAt: number;
  status: "received" | "investigating" | "resolved";
  envelopes: Record<EnvelopeKind, StoredEnvelope>;
}

export type Validation = { ok: true; envelopes: Record<EnvelopeKind, StoredEnvelope> } | { ok: false; error: string };

const B64 = /^[A-Za-z0-9+/_-]+={0,2}$/;
const MAX_CIPHERTEXT = 64 * 1024;
const MAX_TAGS = 8;
const MAX_TAG_LEN = 128;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Strict: only {envelopes:{content,identity,council}} with ciphertext+tags (+unlockAt on council). Anything else is rejected. */
export function validateReportBody(body: unknown): Validation {
  if (!isObj(body)) return { ok: false, error: "body must be a JSON object" };
  const extra = Object.keys(body).filter((k) => k !== "envelopes");
  if (extra.length) return { ok: false, error: `unexpected field(s): ${extra.join(", ")}. Only ciphertext envelopes are accepted` };
  const env = body.envelopes;
  if (!isObj(env)) return { ok: false, error: "envelopes is required" };
  const unknownKinds = Object.keys(env).filter((k) => !ENVELOPE_KINDS.includes(k as EnvelopeKind));
  if (unknownKinds.length) return { ok: false, error: `unexpected envelope(s): ${unknownKinds.join(", ")}` };

  const out = {} as Record<EnvelopeKind, StoredEnvelope>;
  for (const kind of ENVELOPE_KINDS) {
    const e = env[kind];
    if (!isObj(e)) return { ok: false, error: `envelope ${kind} is required` };
    const allowed = kind === "council" ? ["ciphertext", "tags", "unlockAt"] : ["ciphertext", "tags"];
    const bad = Object.keys(e).filter((k) => !allowed.includes(k));
    if (bad.length) return { ok: false, error: `envelope ${kind}: unexpected field(s) ${bad.join(", ")}. Plaintext is not accepted` };
    const { ciphertext, tags } = e;
    if (typeof ciphertext !== "string" || ciphertext.length < 16 || ciphertext.length > MAX_CIPHERTEXT || !B64.test(ciphertext)) {
      return { ok: false, error: `envelope ${kind}: ciphertext must be a base64 string (16 to ${MAX_CIPHERTEXT} chars)` };
    }
    if (!Array.isArray(tags) || tags.length === 0 || tags.length > MAX_TAGS || !tags.every((t) => typeof t === "string" && t.length > 0 && t.length <= MAX_TAG_LEN)) {
      return { ok: false, error: `envelope ${kind}: tags must be 1 to ${MAX_TAGS} short strings` };
    }
    const env_: StoredEnvelope = { kind, ciphertext, tags: tags as string[] };
    if (kind === "council") {
      const u = e.unlockAt;
      if (typeof u !== "number" || !Number.isInteger(u) || u <= 0) return { ok: false, error: "council envelope: unlockAt must be an epoch-seconds integer" };
      if (!env_.tags.includes(`DecryptTimeLock:${u}`)) return { ok: false, error: "council envelope: tags must include DecryptTimeLock:<unlockAt>" };
      env_.unlockAt = u;
    }
    out[kind] = env_;
  }
  return { ok: true, envelopes: out };
}

export function initReportsSchema(db: Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    alias TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    envelopes TEXT NOT NULL
  );`);
}

export function insertReport(db: Database, envelopes: Record<EnvelopeKind, StoredEnvelope>, now = Math.floor(Date.now() / 1000)): StoredReport {
  const id = randomUUID();
  const alias = "#" + randomBytes(2).toString("hex").toUpperCase();
  db.prepare("INSERT INTO reports (id, alias, created_at, status, envelopes) VALUES (?, ?, ?, 'received', ?)").run(id, alias, now, JSON.stringify(envelopes));
  return { id, alias, createdAt: now, status: "received", envelopes };
}

export function listStoredReports(db: Database): StoredReport[] {
  const rows = db.prepare("SELECT id, alias, created_at, status, envelopes FROM reports ORDER BY created_at DESC").all() as
    { id: string; alias: string; created_at: number; status: StoredReport["status"]; envelopes: string }[];
  return rows.map((r) => ({ id: r.id, alias: r.alias, createdAt: r.created_at, status: r.status, envelopes: JSON.parse(r.envelopes) }));
}
