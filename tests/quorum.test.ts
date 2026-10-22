import { test } from "node:test";
import assert from "node:assert/strict";
import { quorumOf, describeQuorum } from "../lib/quorum.ts";

test("threshold is max(1, floor(0.7 N)); only N >= 3 is protective", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => quorumOf(n).threshold), [1, 1, 2, 2, 3]);
  assert.deepEqual([1, 2, 3].map((n) => quorumOf(n).protective), [false, false, true]);
});

test("one admin is described honestly: Dr. Hung could approve alone", () => {
  const t = describeQuorum(1);
  assert.match(t, /1 admin,/);
  assert.match(t, /could approve this request alone/);
  assert.doesNotMatch(t, /cannot approve this alone/);
});

test("three admins: 2 must approve", () => {
  assert.match(describeQuorum(3), /3 admins, 2 must approve/);
});
