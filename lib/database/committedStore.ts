// Pure storage for committed policies, keyed by label. Takes the db handle so tests can use :memory:.
// (Upstream keyed by modelIds[0], which is identical for every policy: each commit overwrote the last.)
import type { Database } from "better-sqlite3";

export function saveCommittedPolicy(db: Database, label: string, dataB64: string): void {
  db.prepare("INSERT OR REPLACE INTO committed_policies (roleId, data) VALUES (?, ?)").run(label, dataB64);
}

export function getCommittedPolicyB64(db: Database, label: string): string | null {
  const row = db.prepare("SELECT data FROM committed_policies WHERE roleId = ?").get(label) as { data: string } | undefined;
  return row?.data ?? null;
}

export function listCommittedLabels(db: Database): string[] {
  return (db.prepare("SELECT roleId FROM committed_policies ORDER BY roleId").all() as { roleId: string }[]).map((r) => r.roleId);
}
