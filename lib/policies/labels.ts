// The three committed policies, keyed by label. One contract, three parameter sets.
// ResourceTag is the discriminator: it is a PolicyParam of the contract, so a committed policy
// can always be mapped back to its label without adding unknown params the ORK might reject.

export type PolicyLabel = "investigator" | "guardian" | "council";

export interface PolicySpec {
  label: PolicyLabel;
  envelope: "content" | "identity" | "council";
  encryptRole: string;
  decryptRole: string;
  resourceTag: string;
  requireTimeLock: 0 | 1;
}

export const POLICY_LABELS: PolicyLabel[] = ["investigator", "guardian", "council"];

export const POLICY_SPECS: Record<PolicyLabel, PolicySpec> = {
  investigator: { label: "investigator", envelope: "content", encryptRole: "student", decryptRole: "investigator", resourceTag: "sv:content", requireTimeLock: 0 },
  guardian: { label: "guardian", envelope: "identity", encryptRole: "student", decryptRole: "identity-guardian", resourceTag: "sv:identity", requireTimeLock: 0 },
  council: { label: "council", envelope: "council", encryptRole: "student", decryptRole: "council", resourceTag: "sv:council", requireTimeLock: 1 },
};

export const ENVELOPE_LABEL: Record<PolicySpec["envelope"], PolicyLabel> = {
  content: "investigator",
  identity: "guardian",
  council: "council",
};

/** Map a committed policy's params (Policy.params.entries) back to its label, or null. */
export function labelFromParams(entries: Map<string, unknown> | undefined): PolicyLabel | null {
  const tag = entries?.get("ResourceTag");
  return POLICY_LABELS.find((l) => POLICY_SPECS[l].resourceTag === tag) ?? null;
}

/** Tags for one envelope. Pass them back unchanged on decrypt. */
export function envelopeTags(kind: PolicySpec["envelope"], unlockAt?: number): string[] {
  const spec = POLICY_SPECS[ENVELOPE_LABEL[kind]];
  return kind === "council" && unlockAt !== undefined ? [spec.resourceTag, `DecryptTimeLock:${unlockAt}`] : [spec.resourceTag];
}
