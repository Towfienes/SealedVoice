import { test } from "node:test";
import assert from "node:assert/strict";
import { quorumOf, describeQuorum } from "../lib/quorum.ts";

test("computed threshold is max(1, floor(0.7 N)); only N >= 3 is protective", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => quorumOf(n).threshold), [1, 1, 2, 2, 3]);
  assert.deepEqual([1, 2, 3].map((n) => quorumOf(n).protective), [false, false, true]);
  assert.equal(quorumOf(3).source, "computed");
});

test("a threshold observed on a pending TideCloak request wins over the formula", () => {
  const q = quorumOf(1, 2);
  assert.deepEqual([q.threshold, q.source, q.protective], [2, "tidecloak", true]);
  assert.equal(quorumOf(3, null).source, "computed");
  assert.equal(quorumOf(3, 0).source, "computed");
});

test("one admin is described honestly: Dr. Hung could approve alone, and the basis is stated", () => {
  const t = describeQuorum(quorumOf(1));
  assert.match(t, /1 admin;/);
  assert.match(t, /not read from TideCloak/);
  assert.match(t, /could approve this request alone/);
  assert.doesNotMatch(t, /cannot approve this alone/);
});

test("three admins: 2 must approve; observed threshold is labelled as read from TideCloak", () => {
  assert.match(describeQuorum(quorumOf(3)), /3 admins;.*: 2\. 2 admins must approve/);
  assert.match(describeQuorum(quorumOf(3, 2)), /read from TideCloak/);
});
