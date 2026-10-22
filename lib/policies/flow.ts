"use client";
// Create -> Approve -> Commit for one policy label (lifted from app/home/page.tsx). Admin-only, runs in the browser:
// approvals need the admin's own enclave session, so this never goes through the app server (and never signs for them).
import { Models } from "@tideorg/js";
import { PolicySignRequest } from "heimdall-tide";
import { contract, computeContractId } from "@/lib/forsetiContract";
import { bytesToBase64, base64ToBytes } from "@/lib/tideSerialization";
import { getVendorIdForPolicy } from "@/lib/tidecloakApi";
import { POLICY_SPECS, labelFromParams, type PolicyLabel } from "./labels";

const Policy = Models.Policy;
const ExecutionType = Models.ExecutionType;
const ApprovalType = Models.ApprovalType;

export interface PendingRow { id: string; data: string; commitReady?: boolean; approvedBy?: string[]; deniedBy?: string[] }
export interface PolicyAuth {
  vuid: string;
  getToken: () => Promise<string>;
  initializeTideRequest: (r: Models.BaseTideRequest) => Promise<Models.BaseTideRequest>;
  approveTideRequests: (r: { id: string; request: Uint8Array }[]) => Promise<{ id: string; approved?: { request: Uint8Array }; denied?: boolean; pending?: boolean }[]>;
  executeTideRequest: (r: Uint8Array, waitForAll?: boolean) => Promise<Uint8Array[]>;
}

export const labelOfPending = (row: PendingRow): PolicyLabel | null => {
  try { return labelFromParams(PolicySignRequest.decode(base64ToBytes(row.data)).getRequestedPolicy().params.entries); } catch { return null; }
};

async function post(auth: PolicyAuth, body: unknown) {
  const res = await fetch("/api/policies", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as any).error ?? `HTTP ${res.status}`);
}

export async function createPolicy(label: PolicyLabel, auth: PolicyAuth): Promise<string> {
  const spec = POLICY_SPECS[label];
  const contractId = await computeContractId(contract);
  console.info(`[policy] creating '${label}' against contract id ${contractId}`);
  const params = new Map<string, any>([
    ["EncryptionRealmRole", spec.encryptRole],
    ["DecryptionRealmRole", spec.decryptRole],
    ["ResourceTag", spec.resourceTag],
    ["RequireTimeLock", spec.requireTimeLock],
  ]);
  const req = PolicySignRequest.New(new Policy({
    version: "4",
    modelId: ["PolicyEnabledEncryption:1", "PolicyEnabledDecryption:1"],
    contractId,
    keyId: getVendorIdForPolicy(),
    executionType: ExecutionType.PRIVATE,
    approvalType: ApprovalType.IMPLICIT,
    params,
  }));
  req.setCustomExpiry(604800);
  req.addForsetiContractToUpload(contract);
  const initialized = await auth.initializeTideRequest(req);
  await post(auth, { policyRequest: bytesToBase64(initialized.encode()), requestedBy: auth.vuid });
  return contractId;
}

export async function approvePolicy(row: PendingRow, auth: PolicyAuth): Promise<"approved" | "denied" | "pending"> {
  const req = PolicySignRequest.decode(base64ToBytes(row.data));
  const [res] = await auth.approveTideRequests([{ id: row.id, request: req.encode() }]);
  if (res.approved) {
    await post(auth, { policyRequest: bytesToBase64(res.approved.request), decision: { rejected: false }, userVuid: auth.vuid });
    return "approved";
  }
  if (res.denied) {
    await post(auth, { policyRequest: bytesToBase64(req.encode()), decision: { rejected: true }, userVuid: auth.vuid });
    return "denied";
  }
  return "pending";
}

export async function commitPolicy(row: PendingRow, auth: PolicyAuth): Promise<void> {
  const req = PolicySignRequest.decode(base64ToBytes(row.data));
  const [signature] = await auth.executeTideRequest(req.encode(), true);
  await post(auth, { committed: { id: row.id, signature: bytesToBase64(signature) } });
}
