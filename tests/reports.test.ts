import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { validateReportBody, initReportsSchema, insertReport, listStoredReports } from "../lib/reports.ts";

const ct = "QUJDREVGR0hJSktMTU5PUA==";
const good = () => ({
  envelopes: {
    content: { ciphertext: ct, tags: ["sv:content"] },
    identity: { ciphertext: ct, tags: ["sv:identity"] },
    council: { ciphertext: ct, tags: ["sv:council", "DecryptTimeLock:1800000000"], unlockAt: 1800000000 },
  },
});

test("valid ciphertext-only body is accepted", () => {
  assert.equal(validateReportBody(good()).ok, true);
});

test("plaintext keys at top level are rejected", () => {
  for (const k of ["description", "fullName", "studentId", "title", "email"]) {
    const r = validateReportBody({ ...good(), [k]: "Nguyen Van A" });
    assert.equal(r.ok, false, k);
  }
});

test("plaintext keys inside an envelope are rejected", () => {
  const b = good() as any;
  b.envelopes.identity.fullName = "Mai";
  assert.equal(validateReportBody(b).ok, false);
});

test("non-base64 ciphertext is rejected", () => {
  const b = good() as any;
  b.envelopes.content.ciphertext = "Lecturer asked for a bribe, see me after class";
  assert.equal(validateReportBody(b).ok, false);
});

test("missing envelope, non-object body and bad council lock are rejected", () => {
  const b = good() as any;
  delete b.envelopes.identity;
  assert.equal(validateReportBody(b).ok, false);
  assert.equal(validateReportBody(null).ok, false);
  assert.equal(validateReportBody("x").ok, false);
  const c = good() as any;
  c.envelopes.council.tags = ["sv:council"];
  assert.equal(validateReportBody(c).ok, false);
  const d = good() as any;
  delete d.envelopes.council.unlockAt;
  assert.equal(validateReportBody(d).ok, false);
});

test("tags must carry the envelope's resource tag; unlockAt must fit the contract's int", () => {
  const a = good() as any;
  a.envelopes.identity.tags = ["sv:content"];
  assert.equal(validateReportBody(a).ok, false);
  const b = good() as any;
  b.envelopes.council.unlockAt = 4102444800;
  b.envelopes.council.tags = ["sv:council", "DecryptTimeLock:4102444800"];
  assert.equal(validateReportBody(b).ok, false);
});

test("stored rows contain ciphertext only and no reporter data", () => {
  const db = new Database(":memory:");
  initReportsSchema(db);
  const v = validateReportBody(good());
  assert.ok(v.ok);
  const r = insertReport(db, v.envelopes, 1700000000);
  assert.match(r.alias, /^#[0-9A-F]{4}$/);
  const raw = JSON.stringify(db.prepare("SELECT * FROM reports").all());
  assert.doesNotMatch(raw, /fullName|studentId|description|email/);
  assert.equal(listStoredReports(db)[0].envelopes.council.unlockAt, 1800000000);
});

// Route-level behaviour (no Authorization header on POST, 401 on GET without token) is exercised against the
// running app in scripts/security-tests.sh; the route files are thin wrappers over these functions.
