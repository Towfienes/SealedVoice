// POST /api/reports takes ciphertext only and is deliberately called WITHOUT an Authorization header,
// so the server cannot learn who reported. GET is for the three reviewing roles; the ORKs still decide who can decrypt.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/connection";
import { validateReportBody, insertReport, listStoredReports } from "@/lib/reports";
import { authenticate, forbidUnlessAny } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const v = validateReportBody(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  // Authorization header, cookies and IP are never read or stored: nothing here can identify the reporter.
  const r = insertReport(db, v.envelopes);
  return NextResponse.json({ id: r.id, alias: r.alias, createdAt: r.createdAt, status: r.status }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;
  const denied = forbidUnlessAny(auth, ["investigator", "identity-guardian", "council"]);
  if (denied) return denied;
  return NextResponse.json(listStoredReports(db));
}
