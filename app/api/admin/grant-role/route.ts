// Insider scene: Dr. Hung tries to give himself a role. This route only forwards the call to TideCloak with the
// CALLER'S OWN bearer token and returns TideCloak's status and body verbatim. It makes no decision itself:
// with more than one admin, TideCloak parks the change as a quorum change request and answers 202.
import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { initTcData, getAuthServerUrl, getRealm } from "@/lib/tidecloakConfig";

export const runtime = "nodejs";

const NAME = /^[A-Za-z0-9._@-]{1,64}$/;

async function tc(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  return { status: res.status, text: await res.text(), type: res.headers.get("content-type") ?? "application/json" };
}

function verbatim(r: { status: number; text: string; type: string }) {
  return new NextResponse(r.text || null, { status: r.status, headers: { "content-type": r.type } });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as { username?: unknown; role?: unknown };
  const username = typeof body.username === "string" ? body.username : "";
  const role = typeof body.role === "string" ? body.role : "";
  if (!NAME.test(username) || !NAME.test(role)) return NextResponse.json({ error: "username and role are required" }, { status: 400 });

  await initTcData();
  const admin = `${getAuthServerUrl()}/admin/realms/${getRealm()}`;

  const users = await tc(`${admin}/users?username=${encodeURIComponent(username)}&exact=true`, auth.token);
  if (users.status !== 200) return verbatim(users);
  const userId = (JSON.parse(users.text) as { id: string }[])[0]?.id;
  if (!userId) return NextResponse.json({ error: `user ${username} not found` }, { status: 404 });

  const roleRep = await tc(`${admin}/roles/${encodeURIComponent(role)}`, auth.token);
  if (roleRep.status !== 200) return verbatim(roleRep);

  return verbatim(await tc(`${admin}/users/${userId}/role-mappings/realm`, auth.token, { method: "POST", body: `[${roleRep.text}]` }));
}
