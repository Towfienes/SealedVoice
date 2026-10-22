import { test } from "node:test";
import assert from "node:assert/strict";
import { raceForcedRelogin, rejectAllPending, inStep } from "../lib/forcedRelogin.ts";

test("an in-flight operation is rejected (not left hanging) when a forced re-login is blocked", async () => {
  const hang = new Promise<string>(() => { /* enclave never answers: its page is about to be navigated away */ });
  const raced = raceForcedRelogin(hang);
  assert.equal(rejectAllPending(new Error("Tide requires re-authentication")), 1);
  await assert.rejects(raced, /Tide requires re-authentication/);
});

test("a normal operation resolves, and its entry is cleaned up", async () => {
  assert.equal(await raceForcedRelogin(Promise.resolve("ok")), "ok");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(rejectAllPending(new Error("x")), 0);
});

test("an operation's own rejection is passed through verbatim", async () => {
  await assert.rejects(raceForcedRelogin(Promise.reject(new Error("Time lock preventing decryption until 1800000000"))), /Time lock preventing decryption until 1800000000/);
});

test("inStep prefixes the failing step and keeps the Tide text verbatim", async () => {
  await assert.rejects(inStep("encrypt identity", async () => { throw new Error("Policy denied: role 'student' missing"); }),
    { message: "encrypt identity: Policy denied: role 'student' missing" });
  await assert.rejects(inStep("POST /api/reports", async () => { throw "HTTP 400 bad"; }), { message: "POST /api/reports: HTTP 400 bad" });
  assert.equal(await inStep("encrypt content", async () => 5), 5);
});
