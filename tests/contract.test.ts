import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { contract, computeContractId } from "../lib/forsetiContract.ts";

const cs = fs.readFileSync(new URL("../contracts/SealedVoicePolicy.cs", import.meta.url), "utf8");
const csSource = cs.slice(cs.indexOf("using Ork.Forseti.Sdk;")).replace(/\s+$/, "");

test("lib/forsetiContract.ts is in sync with contracts/SealedVoicePolicy.cs", () => {
  assert.equal(contract, csSource);
});

test("contract is fail-closed and declares RequireTimeLock", () => {
  assert.match(contract, /\[PolicyParam[^\]]*\]\s*public int RequireTimeLock/);
  assert.match(contract, /RequireTimeLock == 1 && !lockEpoch\.HasValue/);
  assert.doesNotMatch(contract, /no restrictions on executor/);
  assert.match(contract, /string\.IsNullOrWhiteSpace\(requiredRole\)/);
});

test("contract id is a stable 128-hex SHA-512", async () => {
  const id = await computeContractId(contract);
  assert.match(id, /^[0-9A-F]{128}$/);
  assert.equal(id, await computeContractId(csSource));
});
