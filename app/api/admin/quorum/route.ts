// Reports the REAL quorum of the live realm, so the insider scene never claims "2 of 3" when only one admin exists.
// Counts the users holding realm-management/tide-realm-admin, using the caller's own bearer token (admin only).
// Threshold formula from AGENTS.md: max(1, floor(0.7 * N)). TideCloak, not this route, enforces it.
import { NextRequest, NextResponse } from "next/server";
import { authenticate, forbidUnlessAny } from "@/lib/serverAuth";
import { initTcData, getAuthServerUrl, getRealm } from "@/lib/tidecloakConfig";
import { quorumOf } from "@/lib/quorum";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;
  const denied = forbidUnlessAny(auth, ["tide-realm-admin", "realm-admin"]);
  if (denied) return denied;

  await initTcData();
  const admin = `${getAuthServerUrl()}/admin/realms/${getRealm()}`;
  const get = (path: string) => fetch(`${admin}${path}`, { headers: { Authorization: `Bearer ${auth.token}` } });
  try {
    const rm = await get("/clients?clientId=realm-management");
    if (!rm.ok) return new NextResponse(await rm.text(), { status: rm.status });
    const rmId = ((await rm.json()) as { id: string }[])[0]?.id;
    const users = await get(`/clients/${rmId}/roles/tide-realm-admin/users`);
    if (!users.ok) return new NextResponse(await users.text(), { status: users.status });
    const names = ((await users.json()) as { username: string }[]).map((u) => u.username);
    return NextResponse.json({ admins: names.length, usernames: names, ...quorumOf(names.length) });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message ?? e) }, { status: 502 });
  }
}
