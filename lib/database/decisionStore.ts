// Pure storage for approve/deny decisions on pending policy requests. One decision per (request, admin).
import type { Database } from "better-sqlite3";

export type DecisionResult = "recorded" | "already-decided";

export function recordDecision(db: Database, requestId: string, userVuid: string, rejected: boolean): DecisionResult {
  try {
    db.prepare("INSERT INTO policy_request_decisions (policy_request_id, user_vuid, decision) VALUES (?, ?, ?)")
      .run(requestId, userVuid, rejected ? 0 : 1);
    return "recorded";
  } catch (e: any) {
    if (e?.code === "SQLITE_CONSTRAINT_UNIQUE") return "already-decided";
    throw e; // anything else (missing request, FK failure, I/O) is a real error, not a duplicate
  }
}
