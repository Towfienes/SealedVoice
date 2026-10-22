// Pure quorum arithmetic (no imports, unit-testable). Fallback formula from AGENTS.md: threshold = max(1, floor(0.7 * N)).
// When TideCloak has a pending change request, ITS threshold is the truth and is preferred over the formula.
export type ThresholdSource = "tidecloak" | "computed";
export interface Quorum { admins: number; threshold: number; source: ThresholdSource; /** a single admin cannot approve alone */ protective: boolean }

export function quorumOf(admins: number, observedThreshold?: number | null): Quorum {
  const observed = typeof observedThreshold === "number" && observedThreshold >= 1 ? observedThreshold : null;
  const threshold = observed ?? Math.max(1, Math.floor(0.7 * admins));
  return { admins, threshold, source: observed ? "tidecloak" : "computed", protective: threshold >= 2 };
}

/** The honest one-line description shown next to a pending change request. */
export function describeQuorum(q: Quorum): string {
  const basis = q.source === "tidecloak" ? "threshold of the pending request, read from TideCloak" : "threshold computed as max(1, floor(0.7 N)), not read from TideCloak";
  const head = `Live realm: ${q.admins} admin${q.admins === 1 ? "" : "s"}; ${basis}: ${q.threshold}.`;
  return q.protective
    ? `${head} ${q.threshold} admins must approve in their enclaves; Dr. Hung cannot approve this alone.`
    : `${head} With a single approver Dr. Hung could approve this request alone: the 2-of-3 guarantee only exists after admins #2 and #3 are added (scripts/setup-personas.sh admins).`;
}
