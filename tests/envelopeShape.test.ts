import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOpened } from "../lib/envelopeShape.ts";

const identity = { fullName: "Nguyen Thi Mai", studentId: "S3999999", email: "mai@example.edu", faculty: "Engineering" };
const draft = { title: "Grade for favours", category: "other", accused: "Dr. X", description: "Synthetic.", evidence: "" };

test("a real identity plaintext opens", () => {
  const r = parseOpened("identity", JSON.stringify(identity));
  assert.equal(r.ok, true);
  if (r.ok) assert.equal((r.value as typeof identity).fullName, "Nguyen Thi Mai");
});

test("a real report plaintext opens for content and council", () => {
  assert.equal(parseOpened("content", JSON.stringify(draft)).ok, true);
  assert.equal(parseOpened("council", JSON.stringify(draft)).ok, true);
});

test("a decrypt result without the sealed fields is NOT shown as opened (live bug: empty identity shown as Opened)", () => {
  for (const text of ["{}", "[]", "null", '"x"', "", "not json", JSON.stringify(draft)]) {
    const r = parseOpened("identity", text);
    assert.equal(r.ok, false, `identity should not open from ${JSON.stringify(text)}`);
    if (!r.ok) assert.equal(r.reason, "role");
  }
});

test("content does not open from an identity-shaped or empty result", () => {
  assert.equal(parseOpened("content", JSON.stringify(identity)).ok, false);
  assert.equal(parseOpened("council", "{}").ok, false);
});
