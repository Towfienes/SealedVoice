/**
 * tests/verifyToken.test.ts — run with: node --test tests/
 *
 * Every test here is an attack, not a happy path. If one of these goes green
 * after a refactor, the app has regressed into a bearer-token demo.
 */

import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  createHash,
  createPublicKey,
  sign as cryptoSign,
  type KeyObject,
} from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import {
  verifyTideToken,
  requireRole,
  realmRoles,
  clearJwksCache,
  TokenError,
} from "../lib/verifyToken.ts";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ISSUER = "http://localhost:8080/realms/forseti-test";
const AUDIENCE = "myclient";
const KID = "test-kid-1";

let edPriv: KeyObject;
let edPub: KeyObject;
let edJwk: Record<string, unknown>;
let server: Server;
let jwksUrl: string;

const b64u = (b: Buffer | string) =>
  Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function makeToken(
  payload: Record<string, unknown>,
  opts: {
    alg?: string;
    kid?: string;
    header?: Record<string, unknown>;
    signWith?: KeyObject;
    corruptSignature?: boolean;
  } = {},
): string {
  const header = {
    alg: opts.alg ?? "EdDSA",
    typ: "JWT",
    kid: opts.kid ?? KID,
    ...opts.header,
  };
  const h = b64u(JSON.stringify(header));
  const p = b64u(JSON.stringify(payload));
  const input = Buffer.from(`${h}.${p}`);
  const key = opts.signWith ?? edPriv;
  let sig = cryptoSign(null, input, key);
  if (opts.corruptSignature) {
    sig = Buffer.from(sig);
    sig[0] ^= 0xff;
  }
  return `${h}.${p}.${b64u(sig)}`;
}

function basePayload(over: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: ISSUER,
    aud: AUDIENCE,
    azp: AUDIENCE,
    sub: "user-123",
    iat: now,
    exp: now + 300,
    realm_access: { roles: ["bidder"] },
    ...over,
  };
}

function expectCode(fn: () => Promise<unknown>, code: string) {
  return assert.rejects(fn, (err: unknown) => {
    assert.ok(err instanceof TokenError, `expected TokenError, got ${String(err)}`);
    assert.equal(err.code, code, `expected ${code}, got ${err.code}: ${err.message}`);
    return true;
  });
}

before(async () => {
  const pair = generateKeyPairSync("ed25519");
  edPriv = pair.privateKey;
  edPub = pair.publicKey;
  edJwk = { ...(edPub.export({ format: "jwk" }) as object), kid: KID, alg: "EdDSA", use: "sig" };

  // A real HTTP JWKS endpoint — no fetch mocking, so the network path is tested too.
  server = createServer((req, res) => {
    if (req.url === "/jwks") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ keys: [edJwk] }));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  jwksUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/jwks`;
});

beforeEach(() => clearJwksCache());

after(() => {
  server.closeAllConnections?.();
  server.close();
});

// ─── Happy path (so the negative tests mean something) ───────────────────────

describe("baseline", () => {
  test("a correctly signed token verifies", async () => {
    const token = makeToken(basePayload());
    const out = await verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE });
    assert.equal(out.payload["sub"], "user-123");
    assert.deepEqual(realmRoles(out.payload), ["bidder"]);
  });
});

// ─── Attack 1: alg:none ──────────────────────────────────────────────────────

describe("attack: alg none / algorithm confusion", () => {
  test("alg:none with an empty signature is rejected", async () => {
    const h = b64u(JSON.stringify({ alg: "none", typ: "JWT", kid: KID }));
    const p = b64u(JSON.stringify(basePayload({ realm_access: { roles: ["tender-committee"] } })));
    await expectCode(
      () => verifyTideToken(`${h}.${p}.`, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "ALG_NOT_ALLOWED",
    );
  });

  test("HS256 signed with the public key as HMAC secret is rejected", async () => {
    // The classic Keycloak/CVE-2018-1000531 style forgery.
    const header = b64u(JSON.stringify({ alg: "HS256", typ: "JWT", kid: KID }));
    const payload = b64u(JSON.stringify(basePayload()));
    const secret = Buffer.from(JSON.stringify(edJwk));
    const sig = b64u(
      // @ts-expect-error createHmac is imported lazily to keep the fixture obvious
      (await import("node:crypto")).createHmac("sha256", secret).update(`${header}.${payload}`).digest(),
    );
    await expectCode(
      () => verifyTideToken(`${header}.${payload}.${sig}`, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "ALG_NOT_ALLOWED",
    );
  });

  test("an explicitly widened allow-list still cannot admit alg:none", async () => {
    const h = b64u(JSON.stringify({ alg: "none", typ: "JWT", kid: KID }));
    const p = b64u(JSON.stringify(basePayload()));
    await expectCode(
      () =>
        verifyTideToken(`${h}.${p}.`, jwksUrl, {
          issuer: ISSUER,
          audience: AUDIENCE,
          algorithms: ["none", "EdDSA"],
        }),
      "ALG_NOT_ALLOWED", // isSupportedAlg() refuses it regardless of the caller
    );
  });
});

// ─── Attack 2: signature tampering / replay of a modified token ──────────────

describe("attack: signature tampering", () => {
  test("flipped signature bit is rejected", async () => {
    const token = makeToken(basePayload(), { corruptSignature: true });
    await expectCode(
      () => verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "SIGNATURE_INVALID",
    );
  });

  test("payload swapped after signing (role escalation) is rejected", async () => {
    const token = makeToken(basePayload({ realm_access: { roles: ["bidder"] } }));
    const [h, , s] = token.split(".");
    const evil = b64u(JSON.stringify(basePayload({ realm_access: { roles: ["tender-committee"] } })));
    await expectCode(
      () => verifyTideToken(`${h}.${evil}.${s}`, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "SIGNATURE_INVALID",
    );
  });

  test("token signed by an attacker key with the same kid is rejected", async () => {
    const attacker = generateKeyPairSync("ed25519");
    const token = makeToken(basePayload(), { signWith: attacker.privateKey });
    await expectCode(
      () => verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "SIGNATURE_INVALID",
    );
  });

  test("unknown kid does not silently pass", async () => {
    const token = makeToken(basePayload(), { kid: "rotated-away" });
    await expectCode(
      () => verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "UNKNOWN_KID",
    );
  });
});

// ─── Attack 3: claim abuse ───────────────────────────────────────────────────

describe("attack: claim abuse", () => {
  test("expired token is rejected", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeToken(basePayload({ iat: now - 3600, exp: now - 1800 }));
    await expectCode(
      () => verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "EXPIRED",
    );
  });

  test("exp inside the clock-skew window is still accepted once, then rejected", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeToken(basePayload({ exp: now - 10 })); // within 30s tolerance
    const out = await verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE });
    assert.ok(out.payload["exp"]);

    // 31s later the same token must die.
    await expectCode(
      () =>
        verifyTideToken(token, jwksUrl, {
          issuer: ISSUER,
          audience: AUDIENCE,
          now: () => (now + 31) * 1000,
        }),
      "EXPIRED",
    );
  });

  test("token for another realm (issuer) is rejected", async () => {
    const token = makeToken(basePayload({ iss: "http://localhost:8080/realms/master" }));
    await expectCode(
      () => verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "BAD_ISSUER",
    );
  });

  test("token issued for a different client (audience) is rejected", async () => {
    const token = makeToken(basePayload({ aud: "admin-cli" }));
    await expectCode(
      () => verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "BAD_AUDIENCE",
    );
  });

  test("nbf in the future is rejected", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeToken(basePayload({ nbf: now + 600 }));
    await expectCode(
      () => verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "NOT_YET_VALID",
    );
  });
});

// ─── Attack 4: DPoP downgrade ────────────────────────────────────────────────

describe("attack: DPoP downgrade and proof forgery", () => {
  let dpopPriv: KeyObject;
  let dpopJwk: Record<string, unknown>;
  let thumbprint: string;

  before(() => {
    const pair = generateKeyPairSync("ed25519");
    dpopPriv = pair.privateKey;
    dpopJwk = pair.publicKey.export({ format: "jwk" }) as Record<string, unknown>;
    // RFC 7638 thumbprint over the required members, lexicographic.
    thumbprint = createHash("sha256")
      .update(JSON.stringify({ crv: dpopJwk["crv"], kty: dpopJwk["kty"], x: dpopJwk["x"] }))
      .digest("base64url");
  });

  function makeProof(
    over: { htm?: string; htu?: string; iat?: number; jwk?: Record<string, unknown>; signWith?: KeyObject } = {},
  ) {
    const header = b64u(
      JSON.stringify({ typ: "dpop+jwt", alg: "EdDSA", jwk: over.jwk ?? dpopJwk }),
    );
    const payload = b64u(
      JSON.stringify({
        htm: over.htm ?? "GET",
        htu: over.htu ?? "http://localhost:3000/api/bids",
        iat: over.iat ?? Math.floor(Date.now() / 1000),
        jti: "abc",
      }),
    );
    const sig = cryptoSign(null, Buffer.from(`${header}.${payload}`), over.signWith ?? dpopPriv);
    return `${header}.${payload}.${b64u(sig)}`;
  }

  test("DPoP-typed token presented as Bearer is rejected", async () => {
    const token = makeToken(basePayload(), { header: { typ: "DPoP" } });
    await expectCode(
      () => verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "TOKEN_TYPE_REJECTED",
    );
  });

  test("cnf.jkt-bound token with no proof is rejected", async () => {
    const token = makeToken(basePayload({ cnf: { jkt: thumbprint } }));
    await expectCode(
      () => verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE }),
      "DPOP_REQUIRED",
    );
  });

  test("valid proof is accepted", async () => {
    const token = makeToken(basePayload({ cnf: { jkt: thumbprint } }));
    const out = await verifyTideToken(token, jwksUrl, {
      issuer: ISSUER,
      audience: AUDIENCE,
      dpop: { proof: makeProof(), htm: "GET", htu: "http://localhost:3000/api/bids" },
    });
    assert.equal(out.payload["sub"], "user-123");
  });

  test("proof for a different method is rejected", async () => {
    const token = makeToken(basePayload({ cnf: { jkt: thumbprint } }));
    await expectCode(
      () =>
        verifyTideToken(token, jwksUrl, {
          issuer: ISSUER,
          audience: AUDIENCE,
          dpop: { proof: makeProof({ htm: "POST" }), htm: "GET", htu: "http://localhost:3000/api/bids" },
        }),
      "DPOP_INVALID",
    );
  });

  test("proof replayed at a different URL is rejected", async () => {
    const token = makeToken(basePayload({ cnf: { jkt: thumbprint } }));
    await expectCode(
      () =>
        verifyTideToken(token, jwksUrl, {
          issuer: ISSUER,
          audience: AUDIENCE,
          dpop: {
            proof: makeProof({ htu: "http://localhost:3000/api/admin" }),
            htm: "GET",
            htu: "http://localhost:3000/api/bids",
          },
        }),
      "DPOP_INVALID",
    );
  });

  test("stale proof (iat > 300s old) is rejected", async () => {
    const token = makeToken(basePayload({ cnf: { jkt: thumbprint } }));
    await expectCode(
      () =>
        verifyTideToken(token, jwksUrl, {
          issuer: ISSUER,
          audience: AUDIENCE,
          dpop: {
            proof: makeProof({ iat: Math.floor(Date.now() / 1000) - 400 }),
            htm: "GET",
            htu: "http://localhost:3000/api/bids",
          },
        }),
      "DPOP_INVALID",
    );
  });

  test("proof signed by a different key than cnf.jkt is rejected", async () => {
    const attacker = generateKeyPairSync("ed25519");
    const attackerJwk = attacker.publicKey.export({ format: "jwk" }) as Record<string, unknown>;
    const token = makeToken(basePayload({ cnf: { jkt: thumbprint } }));
    await expectCode(
      () =>
        verifyTideToken(token, jwksUrl, {
          issuer: ISSUER,
          audience: AUDIENCE,
          dpop: {
            proof: makeProof({ jwk: attackerJwk, signWith: attacker.privateKey }),
            htm: "GET",
            htu: "http://localhost:3000/api/bids",
          },
        }),
      "DPOP_INVALID",
    );
  });
});

// ─── Attack 5: role escalation via a valid token ────────────────────────────

describe("attack: role escalation with an otherwise valid token", () => {
  test("bidder token cannot satisfy requireRole(tender-committee)", async () => {
    const token = makeToken(basePayload({ realm_access: { roles: ["bidder"] } }));
    const out = await verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE });
    assert.throws(() => requireRole(out.payload, "tender-committee"), (e: unknown) => {
      return e instanceof TokenError && e.code === "MISSING_ROLE";
    });
  });

  test("client roles are read from resource_access, not guessed", async () => {
    const token = makeToken(
      basePayload({
        realm_access: { roles: [] },
        resource_access: { myclient: { roles: ["tender-committee"] } },
      }),
    );
    const out = await verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE });
    assert.deepEqual(realmRoles(out.payload), []);
    assert.doesNotThrow(() => requireRole(out.payload, "tender-committee"));
  });

  test("role substring does not satisfy the check", async () => {
    const token = makeToken(basePayload({ realm_access: { roles: ["tender-committee-readonly"] } }));
    const out = await verifyTideToken(token, jwksUrl, { issuer: ISSUER, audience: AUDIENCE });
    assert.throws(() => requireRole(out.payload, "tender-committee"));
  });
});

// ─── Algorithm coverage: the claims in the docs must be true ────────────────
//
// TideCloak's quickstart realm signs EdDSA, but a production Keycloak realm
// commonly uses RS256, and ES256 appears in some deployments. If the verifier
// silently fails on those, "algorithms: ['EdDSA','RS256']" in the route is a lie.

describe("algorithm coverage", () => {
  test("RS256 token verifies against an RSA JWKS", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk = { ...(publicKey.export({ format: "jwk" }) as object), kid: "rsa-1", alg: "RS256", use: "sig" };

    const srv = createServer((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ keys: [jwk] }));
    });
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/jwks`;
    clearJwksCache();

    try {
      const now = Math.floor(Date.now() / 1000);
      const h = b64u(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "rsa-1" }));
      const p = b64u(JSON.stringify({ ...basePayload(), exp: now + 300 }));
      const sig = cryptoSign("sha256", Buffer.from(`${h}.${p}`), privateKey);
      const token = `${h}.${p}.${b64u(sig)}`;

      const out = await verifyTideToken(token, url, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ["EdDSA", "RS256"],
      });
      assert.equal(out.payload["sub"], "user-123");

      // And a tampered RSA token must still fail.
      const evil = b64u(JSON.stringify({ ...basePayload(), realm_access: { roles: ["tender-committee"] } }));
      await expectCode(
        () =>
          verifyTideToken(`${h}.${evil}.${b64u(sig)}`, url, {
            issuer: ISSUER,
            audience: AUDIENCE,
            algorithms: ["EdDSA", "RS256"],
          }),
        "SIGNATURE_INVALID",
      );
    } finally {
      srv.closeAllConnections?.();
      srv.close();
    }
  });

  test("ES256 raw R||S signature is converted to DER and verifies", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = { ...(publicKey.export({ format: "jwk" }) as object), kid: "ec-1", alg: "ES256", use: "sig" };

    const srv = createServer((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ keys: [jwk] }));
    });
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/jwks`;
    clearJwksCache();

    try {
      const now = Math.floor(Date.now() / 1000);
      const h = b64u(JSON.stringify({ alg: "ES256", typ: "JWT", kid: "ec-1" }));
      const p = b64u(JSON.stringify({ ...basePayload(), exp: now + 300 }));
      // Node emits DER; JOSE needs raw R||S. Convert DER → raw for the fixture.
      const der = cryptoSign("sha256", Buffer.from(`${h}.${p}`), privateKey);
      const raw = derToRawEcdsa(der, 32);
      const token = `${h}.${p}.${b64u(raw)}`;

      const out = await verifyTideToken(token, url, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ["ES256"],
      });
      assert.equal(out.payload["sub"], "user-123");
    } finally {
      srv.closeAllConnections?.();
      srv.close();
    }
  });

  test("ES256 with a truncated signature is rejected, not silently accepted", async () => {
    const { publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = { ...(publicKey.export({ format: "jwk" }) as object), kid: "ec-2", alg: "ES256", use: "sig" };

    const srv = createServer((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ keys: [jwk] }));
    });
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/jwks`;
    clearJwksCache();

    try {
      const now = Math.floor(Date.now() / 1000);
      const h = b64u(JSON.stringify({ alg: "ES256", typ: "JWT", kid: "ec-2" }));
      const p = b64u(JSON.stringify({ ...basePayload(), exp: now + 300 }));
      const token = `${h}.${p}.${b64u(Buffer.alloc(20))}`;
      await expectCode(
        () => verifyTideToken(token, url, { issuer: ISSUER, audience: AUDIENCE, algorithms: ["ES256"] }),
        "SIGNATURE_INVALID",
      );
    } finally {
      srv.closeAllConnections?.();
      srv.close();
    }
  });
});

/** DER ECDSA (SEQUENCE of two INTEGERs) → raw R||S, left-padded to coordLen. */
function derToRawEcdsa(der: Buffer, coordLen: number): Buffer {
  let i = 0;
  if (der[i++] !== 0x30) throw new Error("not a DER SEQUENCE");
  let len = der[i++];
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let k = 0; k < n; k++) len = (len << 8) | der[i++];
  }
  const readInt = (): Buffer => {
    if (der[i++] !== 0x02) throw new Error("not a DER INTEGER");
    const l = der[i++];
    let v = der.subarray(i, i + l);
    i += l;
    while (v.length > coordLen && v[0] === 0) v = v.subarray(1);
    if (v.length < coordLen) v = Buffer.concat([Buffer.alloc(coordLen - v.length), v]);
    return v;
  };
  const r = readInt();
  const s = readInt();
  return Buffer.concat([r, s]);
}
