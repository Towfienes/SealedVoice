// Server-only helper for API routes: verify the bearer token with lib/verifyToken.ts, then check roles.
import { NextRequest, NextResponse } from "next/server";
import { verifyTideToken, realmRoles, clientRoles, TokenError } from "./verifyToken";
import { initTcData, getAuthServerUrl, getRealm, getResource } from "./tidecloakConfig";

export interface AuthResult { payload: Record<string, unknown>; token: string; roles: string[] }

export function bearerOf(req: NextRequest): string | null {
  const h = req.headers.get("authorization") ?? "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : null;
}

/** Returns the verified payload, or a ready-made 401 response. Never throws. */
export async function authenticate(req: NextRequest): Promise<AuthResult | NextResponse> {
  const token = bearerOf(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await initTcData();
    const issuer = `${getAuthServerUrl()}/realms/${getRealm()}`;
    const dpopProof = req.headers.get("dpop");
    const verified = await verifyTideToken(token, `${issuer}/protocol/openid-connect/certs`, {
      issuer,
      audience: getResource(),
      algorithms: ["EdDSA", "RS256"],
      dpop: dpopProof ? { proof: dpopProof, htm: req.method, htu: req.nextUrl.href } : undefined,
    });
    const payload = verified.payload;
    const roles = [...realmRoles(payload), ...clientRoles(payload, "realm-management"), ...clientRoles(payload, getResource())];
    return { payload, token, roles };
  } catch (err) {
    console.warn(`[auth] rejected ${req.method} ${req.nextUrl.pathname}: ${err instanceof TokenError ? `${err.code} ${err.message}` : String(err)}`);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

export function forbidUnlessAny(auth: AuthResult, allowed: string[]): NextResponse | null {
  return allowed.some((r) => auth.roles.includes(r))
    ? null
    : NextResponse.json({ error: "forbidden", detail: `one of ${allowed.join(" / ")} required` }, { status: 403 });
}
