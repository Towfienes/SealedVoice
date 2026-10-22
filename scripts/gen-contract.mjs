// Regenerates lib/forsetiContract.ts `contract` string from contracts/SealedVoicePolicy.cs.
import fs from "node:fs";
const cs = fs.readFileSync("contracts/SealedVoicePolicy.cs", "utf8");
const src = cs.slice(cs.indexOf("using Ork.Forseti.Sdk;")).replace(/\s+$/, "");
if (/[`\\]|\$\{/.test(src)) throw new Error("contract contains characters unsafe for a template literal");
const ts = fs.readFileSync("lib/forsetiContract.ts", "utf8");
const tail = ts.slice(ts.indexOf("export async function computeContractId"));
fs.writeFileSync("lib/forsetiContract.ts",
  "// GENERATED from contracts/SealedVoicePolicy.cs (fail-closed, with RequireTimeLock). Do not edit by hand:\n" +
  "// run `node scripts/gen-contract.mjs`. tests/contract.test.ts fails if the two drift.\n" +
  "export const contract = `" + src + "`\n" + tail);
