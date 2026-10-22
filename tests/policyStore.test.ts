import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { saveCommittedPolicy, getCommittedPolicyB64, listCommittedLabels } from "../lib/database/committedStore.ts";
import { POLICY_SPECS, POLICY_LABELS, labelFromParams, envelopeTags } from "../lib/policies/labels.ts";

function mem() {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE committed_policies (roleId TEXT PRIMARY KEY, data TEXT)");
  return db;
}

test("three labels coexist after three commits (upstream kept only the last)", () => {
  const db = mem();
  for (const l of POLICY_LABELS) saveCommittedPolicy(db, l, `data-${l}`);
  assert.deepEqual(listCommittedLabels(db), ["council", "guardian", "investigator"]);
  for (const l of POLICY_LABELS) assert.equal(getCommittedPolicyB64(db, l), `data-${l}`);
});

test("recommitting a label replaces only that label", () => {
  const db = mem();
  for (const l of POLICY_LABELS) saveCommittedPolicy(db, l, "v1");
  saveCommittedPolicy(db, "council", "v2");
  assert.equal(getCommittedPolicyB64(db, "council"), "v2");
  assert.equal(getCommittedPolicyB64(db, "guardian"), "v1");
  assert.equal(listCommittedLabels(db).length, 3);
});

test("unknown label returns null", () => {
  assert.equal(getCommittedPolicyB64(mem(), "investigator"), null);
});

test("labelFromParams maps each ResourceTag to its label and rejects unknown/missing", () => {
  for (const l of POLICY_LABELS) assert.equal(labelFromParams(new Map([["ResourceTag", POLICY_SPECS[l].resourceTag]])), l);
  assert.equal(labelFromParams(new Map([["ResourceTag", "other"]])), null);
  assert.equal(labelFromParams(new Map()), null);
  assert.equal(labelFromParams(undefined), null);
});

test("only the council spec requires a time lock; decrypt roles are distinct", () => {
  assert.deepEqual(POLICY_LABELS.map((l) => POLICY_SPECS[l].requireTimeLock), [0, 0, 1]);
  assert.equal(new Set(POLICY_LABELS.map((l) => POLICY_SPECS[l].decryptRole)).size, 3);
  assert.deepEqual(envelopeTags("council", 1800000000), ["sv:council", "DecryptTimeLock:1800000000"]);
  assert.deepEqual(envelopeTags("content"), ["sv:content"]);
});

import { recordDecision } from "../lib/database/decisionStore.ts";

function withDecisions() {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE pending_policy_requests (id TEXT PRIMARY KEY, requestedBy TEXT, data TEXT);
    CREATE TABLE policy_request_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, policy_request_id TEXT NOT NULL, user_vuid TEXT NOT NULL, decision INTEGER,
      FOREIGN KEY (policy_request_id) REFERENCES pending_policy_requests(id) ON DELETE CASCADE,
      UNIQUE(policy_request_id, user_vuid));
    INSERT INTO pending_policy_requests VALUES ('req1', 'hung', 'x');`);
  return db;
}

test("a second decision by the same admin is 'already-decided', not an exception (route maps it to 409)", () => {
  const db = withDecisions();
  assert.equal(recordDecision(db, "req1", "vuid-hung", false), "recorded");
  assert.equal(recordDecision(db, "req1", "vuid-hung", false), "already-decided");
  assert.equal(recordDecision(db, "req1", "vuid-hung", true), "already-decided");
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM policy_request_decisions").get() as { n: number }).n, 1);
});

test("different admins can each decide once; an unknown request is a real error, not a duplicate", () => {
  const db = withDecisions();
  assert.equal(recordDecision(db, "req1", "vuid-a", false), "recorded");
  assert.equal(recordDecision(db, "req1", "vuid-b", true), "recorded");
  assert.throws(() => recordDecision(db, "nope", "vuid-a", false));
});
