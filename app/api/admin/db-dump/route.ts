// Insider scene, labelled SIMULATED in the UI: stands in for an admin reading the SQLite file directly.
// It returns exactly what the file holds: ciphertext, tags and aliases. Nothing here can decrypt anything.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/connection";
import { listStoredReports } from "@/lib/reports";
import { authenticate, forbidUnlessAny } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;
  const denied = forbidUnlessAny(auth, ["tide-realm-admin", "realm-admin"]);
  if (denied) return denied;
  return NextResponse.json({ simulated: true, note: "Equivalent to opening db/database.sqlite directly.", rows: listStoredReports(db) });
}
