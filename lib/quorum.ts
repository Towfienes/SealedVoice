// Pure quorum arithmetic (no imports, unit-testable). Matches AGENTS.md: threshold = max(1, floor(0.7 * N)).
export interface Quorum { threshold: number; /** true only when a single admin cannot approve alone (threshold >= 2) */ protective: boolean }

export function quorumOf(admins: number): Quorum {
  const threshold = Math.max(1, Math.floor(0.7 * admins));
  return { threshold, protective: threshold >= 2 };
}

/** The honest one-line description shown next to a pending change request. */
export function describeQuorum(admins: number): string {
  const { threshold, protective } = quorumOf(admins);
  return protective
    ? `Live realm: ${admins} admins, ${threshold} must approve in their enclaves. Dr. Hung cannot approve this alone.`
    : `Live realm: ${admins} admin${admins === 1 ? "" : "s"}, threshold ${threshold}. With a single approver Dr. Hung could approve this request alone: the 2-of-3 guarantee only exists after admins #2 and #3 are added (scripts/setup-personas.sh admins).`;
}
