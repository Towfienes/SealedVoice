/**
 * lib/verifyToken.ts — TideCloak OIDC access-token verification (Node runtime only).
 *
 * Why this file exists
 * --------------------
 * TideCloak issues ordinary OIDC JWTs signed by the Fabric (EdDSA in the
 * quickstart realm, RS256 in most Keycloak realms). Nothing about "the token was
 * signed by a threshold of ORK nodes" removes the need for the *resource server*
 * to check it. A signature you never verify is a signature you do not have.
 *
 * Deliberate choices:
 *  - No dependency on `jose`. Node's `crypto` can build an Ed25519/RS256 public
 *    key straight from a JWK, so this file has zero supply-chain surface.
 *  - `algorithms` is an allow-list. `alg: none` and HS256-signed-with-the-public-
 *    key are the two classic JWT forgeries; both die here.
 *  - JWKS is cached, but an unknown `kid` forces exactly one refetch (key
 *    rotation) and is then rejected. No unbounded refetch loop.
 *  - DPoP-aware: a token with `typ: "DPoP"` is rejected unless the caller proves
 *    possession of the `cnf.jkt` key. Presenting a DPoP token as a plain Bearer
 *    token is a downgrade attack, and Tide's docs are explicit that such a token
 *    "is invalid if it is later sent as a plain Authorization: Bearer".
 *
 * This module is intentionally free of Next.js imports so it can be unit-tested
 * with plain `node`.
 */

import {
  createPublicKey,
  verify as cryptoVerify,
  timingSafeEqual,
  createHash,
  constants as cryptoConstants,
} from "node:crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Jwk {
  kid?: string;
  kty: string;
  alg?: string;
  use?: string;
  crv?: string;
  n?: string;
  e?: string;
  x?: string;
}

export interface Jwks {
  keys: Jwk[];
}

export interface VerifiedToken {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  /** Raw compact serialisation, for audit logging. */
  raw: string;
}

export interface VerifyOptions {
  /** Expected `iss`, e.g. http://localhost:8080/realms/forseti-test */
  issuer: string;
  /** Expected `aud` (the OIDC client id), e.g. myclient */
  audience: string;
  /** Allowed signing algorithms. Keep this tight. */
  algorithms?: string[];
  /** Clock skew tolerance in seconds. Default 30. */
  clockTolerance?: number;
  /** Max JWKS age in ms before a proactive refetch. Default 10 min. */
  jwksMaxAgeMs?: number;
  /** Injectable clock, for tests. */
  now?: () => number;
  /**
   * DPoP proof header value (`DPoP: <jwt>`) and the HTTP method/URL it was made
   * for. When the token carries `cnf.jkt`, these become mandatory.
   */
  dpop?: { proof: string; htm: string; htu: string };
}

export type TokenErrorCode =
  | "MALFORMED"
  | "ALG_NOT_ALLOWED"
  | "SIGNATURE_INVALID"
  | "UNKNOWN_KID"
  | "EXPIRED"
  | "NOT_YET_VALID"
  | "BAD_ISSUER"
  | "BAD_AUDIENCE"
  | "DPOP_REQUIRED"
  | "DPOP_INVALID"
  | "TOKEN_TYPE_REJECTED"
  | "MISSING_ROLE";

export class TokenError extends Error {
  readonly code: TokenErrorCode;

  constructor(message: string, code: TokenErrorCode) {
    super(message);
    this.name = "TokenError";
    this.code = code;
  }
}

// ─── base64url ───────────────────────────────────────────────────────────────

function b64uToBuf(s: string): Buffer {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new TokenError("bad base64url", "MALFORMED");
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function b64uToJson(s: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(b64uToBuf(s).toString("utf8"));
  } catch {
    throw new TokenError("segment is not JSON", "MALFORMED");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TokenError("segment is not a JSON object", "MALFORMED");
  }
  return parsed as Record<string, unknown>;
}

// ─── JWKS cache ──────────────────────────────────────────────────────────────

interface CacheEntry {
  jwks: Jwks;
  fetchedAt: number;
}

const jwksCache = new Map<string, CacheEntry>();

export function clearJwksCache(): void {
  jwksCache.clear();
}

async function fetchJwks(url: string, now: () => number): Promise<Jwks> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new TokenError(`JWKS fetch failed: ${res.status}`, "UNKNOWN_KID");
  const body = (await res.json()) as Jwks;
  if (!body || !Array.isArray(body.keys)) {
    throw new TokenError("JWKS has no keys array", "UNKNOWN_KID");
  }
  jwksCache.set(url, { jwks: body, fetchedAt: now() });
  return body;
}

async function getJwks(
  url: string,
  kid: string | undefined,
  opts: Required<Pick<VerifyOptions, "jwksMaxAgeMs" | "now">>,
): Promise<Jwk> {
  const pick = (jwks: Jwks): Jwk | undefined =>
    kid ? jwks.keys.find((k) => k.kid === kid) : jwks.keys.length === 1 ? jwks.keys[0] : undefined;

  const cached = jwksCache.get(url);
  const fresh = cached && opts.now() - cached.fetchedAt < opts.jwksMaxAgeMs;

  if (cached && fresh) {
    const hit = pick(cached.jwks);
    if (hit) return hit;
  }

  // Cache miss, stale cache, or unknown kid → exactly one refetch (key rotation).
  const jwks = await fetchJwks(url, opts.now);
  const hit = pick(jwks);
  if (!hit) throw new TokenError(`no JWKS key matches kid=${kid ?? "(none)"}`, "UNKNOWN_KID");
  return hit;
}

// ─── Key construction ────────────────────────────────────────────────────────

const ALG_TO_NODE = {
  EdDSA: { hash: null, kind: "okp" },
  RS256: { hash: "sha256", kind: "rsa" },
  RS384: { hash: "sha384", kind: "rsa" },
  RS512: { hash: "sha512", kind: "rsa" },
  PS256: { hash: "sha256", kind: "rsa" },
  PS384: { hash: "sha384", kind: "rsa" },
  PS512: { hash: "sha512", kind: "rsa" },
  ES256: { hash: "sha256", kind: "ec", coordLen: 32 },
  ES384: { hash: "sha384", kind: "ec", coordLen: 48 },
  ES512: { hash: "sha512", kind: "ec", coordLen: 66 },
} as const;

type SupportedAlg = keyof typeof ALG_TO_NODE;

function isSupportedAlg(alg: string): alg is SupportedAlg {
  return Object.prototype.hasOwnProperty.call(ALG_TO_NODE, alg);
}

function publicKeyFromJwk(jwk: Jwk) {
  // createPublicKey accepts the JWK shape directly for OKP/RSA/EC.
  return createPublicKey({ key: jwk as never, format: "jwk" });
}

/**
 * JOSE serialises ECDSA signatures as raw `R || S`. Node's verify() wants DER.
 * Without this conversion every ES* signature fails, which is a silent "we
 * support ES256" lie. Wrapping raw into a DER SEQUENCE of two INTEGERs:
 */
function rawEcdsaToDer(raw: Buffer, coordLen: number): Buffer {
  if (raw.length !== coordLen * 2) {
    throw new TokenError(`ECDSA signature must be ${coordLen * 2} bytes`, "SIGNATURE_INVALID");
  }
  const encodeInt = (b: Buffer): Buffer => {
    // Strip leading zeros, then re-add one if the high bit is set (DER INTEGER
    // is signed, so a top bit of 1 would read as negative).
    let i = 0;
    while (i < b.length - 1 && b[i] === 0) i++;
    let v = b.subarray(i);
    if (v[0] & 0x80) v = Buffer.concat([Buffer.from([0]), v]);
    return Buffer.concat([Buffer.from([0x02, v.length]), v]);
  };
  const r = encodeInt(raw.subarray(0, coordLen));
  const s = encodeInt(raw.subarray(coordLen));
  const body = Buffer.concat([r, s]);
  if (body.length > 127) {
    // Long-form length: 0x81 <len> is enough for P-521.
    return Buffer.concat([Buffer.from([0x30, 0x81, body.length]), body]);
  }
  return Buffer.concat([Buffer.from([0x30, body.length]), body]);
}

function verifySignature(
  alg: SupportedAlg,
  signingInput: Buffer,
  signature: Buffer,
  jwk: Jwk,
): boolean {
  const key = publicKeyFromJwk(jwk);
  const { hash, kind } = ALG_TO_NODE[alg];

  if (kind === "okp") {
    return cryptoVerify(null, signingInput, key, signature);
  }
  if (kind === "ec") {
    const der = rawEcdsaToDer(signature, (ALG_TO_NODE[alg] as { coordLen: number }).coordLen);
    return cryptoVerify(hash as string, signingInput, key, der);
  }
  if (alg.startsWith("PS")) {
    return cryptoVerify(
      hash as string,
      signingInput,
      {
        key,
        padding: cryptoConstants.RSA_PKCS1_PSS_PADDING,
        saltLength: cryptoConstants.RSA_PSS_SALTLEN_DIGEST,
      },
      signature,
    );
  }
  return cryptoVerify(hash as string, signingInput, key, signature);
}

// ─── DPoP ────────────────────────────────────────────────────────────────────

function jwkThumbprint(jwk: Jwk): string {
  // RFC 7638: required members only, lexicographic order, no whitespace.
  const required =
    jwk.kty === "OKP"
      ? { crv: jwk.crv, kty: jwk.kty, x: jwk.x }
      : jwk.kty === "EC"
        ? { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: (jwk as { y?: string }).y }
        : { e: jwk.e, kty: jwk.kty, n: jwk.n };
  const canonical = JSON.stringify(required);
  return createHash("sha256").update(canonical).digest("base64url");
}

function checkDpop(
  payload: Record<string, unknown>,
  dpop: VerifyOptions["dpop"],
  opts: Required<Pick<VerifyOptions, "now" | "clockTolerance">>,
): void {
  const cnf = payload["cnf"] as { jkt?: string } | undefined;
  const boundThumbprint = cnf?.jkt;

  if (!boundThumbprint) return; // plain bearer token, nothing to bind

  if (!dpop) {
    throw new TokenError(
      "token is DPoP-bound (cnf.jkt) but no DPoP proof was supplied",
      "DPOP_REQUIRED",
    );
  }

  const parts = dpop.proof.split(".");
  if (parts.length !== 3) throw new TokenError("DPoP proof is not a JWT", "DPOP_INVALID");

  const header = b64uToJson(parts[0]);
  const proofPayload = b64uToJson(parts[1]);

  if (header["typ"] !== "dpop+jwt") {
    throw new TokenError("DPoP proof typ must be dpop+jwt", "DPOP_INVALID");
  }
  const htm = String(proofPayload["htm"] ?? "").toUpperCase();
  if (htm !== dpop.htm.toUpperCase()) {
    throw new TokenError("DPoP htm mismatch", "DPOP_INVALID");
  }
  // Compare origin+path, ignore query — RFC 9449 htu excludes query/fragment.
  const stripQuery = (u: string) => {
    try {
      const parsed = new URL(u);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return u;
    }
  };
  if (stripQuery(String(proofPayload["htu"] ?? "")) !== stripQuery(dpop.htu)) {
    throw new TokenError("DPoP htu mismatch", "DPOP_INVALID");
  }

  const iat = Number(proofPayload["iat"] ?? 0);
  if (!Number.isFinite(iat) || Math.abs(opts.now() / 1000 - iat) > 300) {
    throw new TokenError("DPoP proof iat outside ±300s", "DPOP_INVALID");
  }

  const proofJwk = header["jwk"] as Jwk | undefined;
  if (!proofJwk) throw new TokenError("DPoP proof has no jwk", "DPOP_INVALID");

  const thumb = jwkThumbprint(proofJwk);
  const a = Buffer.from(thumb);
  const b = Buffer.from(boundThumbprint);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new TokenError("DPoP key does not match cnf.jkt", "DPOP_INVALID");
  }

  const alg = String(header["alg"] ?? "");
  if (!isSupportedAlg(alg)) throw new TokenError(`DPoP alg ${alg} not allowed`, "DPOP_INVALID");
  const ok = verifySignature(
    alg,
    Buffer.from(`${parts[0]}.${parts[1]}`),
    b64uToBuf(parts[2]),
    proofJwk,
  );
  if (!ok) throw new TokenError("DPoP proof signature invalid", "DPOP_INVALID");
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Verify a TideCloak access token against a live JWKS endpoint.
 * Throws `TokenError` on any failure; never returns a partially-verified token.
 */
export async function verifyTideToken(
  token: string,
  jwksUrl: string,
  options: VerifyOptions,
): Promise<VerifiedToken> {
  const now = options.now ?? (() => Date.now());
  const clockTolerance = options.clockTolerance ?? 30;
  const jwksMaxAgeMs = options.jwksMaxAgeMs ?? 10 * 60 * 1000;
  const allowed = options.algorithms ?? ["EdDSA", "RS256"];

  if (typeof token !== "string") throw new TokenError("token is not a string", "MALFORMED");
  const parts = token.split(".");
  if (parts.length !== 3) throw new TokenError("token is not a 3-part JWT", "MALFORMED");

  const header = b64uToJson(parts[0]);
  const payload = b64uToJson(parts[1]);
  const signature = b64uToBuf(parts[2]);

  // 1. Algorithm allow-list — blocks `alg:none` and HS256 confusion.
  const alg = String(header["alg"] ?? "");
  if (!allowed.includes(alg)) {
    throw new TokenError(`alg ${alg || "(missing)"} not in allow-list`, "ALG_NOT_ALLOWED");
  }
  if (!isSupportedAlg(alg)) {
    throw new TokenError(`alg ${alg} unsupported by verifier`, "ALG_NOT_ALLOWED");
  }

  // 2. A DPoP-typed token must never be accepted as a plain bearer token.
  const typ = String(header["typ"] ?? "");
  if (typ === "DPoP" && !options.dpop) {
    throw new TokenError("DPoP token presented as Bearer (downgrade)", "TOKEN_TYPE_REJECTED");
  }

  // 3. Signature against the realm JWKS.
  const jwk = await getJwks(jwksUrl, header["kid"] as string | undefined, {
    jwksMaxAgeMs,
    now,
  });
  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
  if (!verifySignature(alg, signingInput, signature, jwk)) {
    throw new TokenError("signature verification failed", "SIGNATURE_INVALID");
  }

  // 4. Claims. Only after the signature holds — never trust unverified claims.
  const nowSec = now() / 1000;
  const exp = Number(payload["exp"]);
  if (!Number.isFinite(exp)) throw new TokenError("missing exp", "EXPIRED");
  if (nowSec - clockTolerance >= exp) throw new TokenError("token expired", "EXPIRED");

  if (payload["nbf"] !== undefined) {
    const nbf = Number(payload["nbf"]);
    if (!Number.isFinite(nbf) || nowSec + clockTolerance < nbf) {
      throw new TokenError("token not yet valid (nbf)", "NOT_YET_VALID");
    }
  }

  if (payload["iss"] !== options.issuer) {
    throw new TokenError(`bad issuer: ${String(payload["iss"])}`, "BAD_ISSUER");
  }

  const aud = payload["aud"];
  const audOk = Array.isArray(aud) ? aud.includes(options.audience) : aud === options.audience;
  if (!audOk) throw new TokenError("bad audience", "BAD_AUDIENCE");

  // 5. DPoP binding, if the token carries cnf.jkt.
  checkDpop(payload, options.dpop, { now, clockTolerance });

  return { header, payload, raw: token };
}

// ─── Role helpers (the app-side rung) ────────────────────────────────────────

export function realmRoles(payload: Record<string, unknown>): string[] {
  const ra = payload["realm_access"] as { roles?: unknown } | undefined;
  return Array.isArray(ra?.roles) ? (ra!.roles as string[]) : [];
}

export function clientRoles(payload: Record<string, unknown>, clientId: string): string[] {
  const ra = payload["resource_access"] as Record<string, { roles?: unknown }> | undefined;
  const roles = ra?.[clientId]?.roles;
  return Array.isArray(roles) ? (roles as string[]) : [];
}

/**
 * Fail-closed role check.
 *
 * The quickstart Forseti contract returns `PolicyDecision.Allow()` when the
 * `DecryptionRealmRole` policy parameter is null. That is fail-open, and it is
 * the reason this check exists on the app side as well: two independent rungs,
 * neither of which can be removed by editing a single file.
 */
export function requireRole(payload: Record<string, unknown>, role: string): void {
  const all = [...realmRoles(payload), ...clientRoles(payload, String(payload["azp"] ?? ""))];
  if (!all.includes(role)) {
    throw new TokenError(`missing required role: ${role}`, "MISSING_ROLE");
  }
}
