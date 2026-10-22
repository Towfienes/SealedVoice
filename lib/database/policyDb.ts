import { db } from './connection';
import { base64ToBytes, bytesToBase64 } from '../tideSerialization';
import { Models, Contracts } from "@tideorg/js";
const Policy = Models.Policy;
type Policy = InstanceType<typeof Policy>;
const GenericResourceAccessThresholdRoleContract = Contracts.GenericResourceAccessThresholdRoleContract;
import { PolicySignRequest } from 'heimdall-tide';
import { getAdminPolicy } from '../adminPolicy';
import { saveCommittedPolicy, getCommittedPolicyB64 } from './committedStore';
import { recordDecision, type DecisionResult } from './decisionStore';
import { labelFromParams, type PolicyLabel } from '../policies/labels';

export async function GetAllPendingPolicies() {
    const rows = db.prepare('SELECT * FROM pending_policy_requests')
        .all() as { id: string, requestedBy: string, data: string }[];

    const adminPolicy = await getAdminPolicy();

    const rowsWithApprovals = await Promise.all(rows.map(async row => {
        const approvers = db.prepare(
            'SELECT user_vuid FROM policy_request_decisions WHERE decision = 1 AND policy_request_id = ?'
        ).all(row.id) as { user_vuid: string }[];
        const deniers = db.prepare(
            'SELECT user_vuid FROM policy_request_decisions WHERE decision = 0 AND policy_request_id = ?'
        ).all(row.id) as { user_vuid: string }[];

        let commitReady = false;
        let updatedData = row.data;

        try {
            const request_deserialized = PolicySignRequest.decode(base64ToBytes(row.data));
            const masterPolicy = new GenericResourceAccessThresholdRoleContract(request_deserialized);

            const ableToBeCommitted = await masterPolicy.testPolicy(adminPolicy);
            if (ableToBeCommitted.success) {
                commitReady = true;
                request_deserialized.addPolicy(adminPolicy.toBytes());
                updatedData = bytesToBase64(request_deserialized.encode());

                db.prepare('UPDATE pending_policy_requests SET data = ? WHERE id = ?')
                    .run(updatedData, row.id);
            }
        } catch (error) {
            console.error('Error evaluating policy:', error);
        }

        return {
            ...row,
            data: updatedData,
            commitReady,
            approvedBy: approvers.map(a => a.user_vuid),
            deniedBy: deniers.map(a => a.user_vuid)
        };
    }));

    return rowsWithApprovals;
}

export async function CreatePolicyRequest(request: string, requestedBy: string) {
    const request_deserialized = PolicySignRequest.decode(base64ToBytes(request));
    if (!request_deserialized.isInitialized()) throw "Request to add has not been initialized";

    const id = request_deserialized.getUniqueId();

    db.prepare('INSERT INTO pending_policy_requests (id, requestedBy, data) VALUES (?, ?, ?)')
        .run(id, requestedBy, request);
}

export async function AddPolicyRequestDecision(request: string, uservuid: string, denied: boolean): Promise<DecisionResult | "error"> {
    try {
        const request_deserialized = PolicySignRequest.decode(base64ToBytes(request));
        if (!request_deserialized.isInitialized()) throw "Request to add has not been initialized";
        const id = request_deserialized.getUniqueId();

        if (recordDecision(db, id, uservuid, denied) === "already-decided") return "already-decided";

        if (!denied) {
            const updatedRequestData = bytesToBase64(request_deserialized.encode());
            db.prepare('UPDATE pending_policy_requests SET data = ? WHERE id = ?')
                .run(updatedRequestData, id);
        }

        return "recorded";
    } catch (error) {
        console.error('Error adding policy request decision:', error);
        return "error";
    }
}

export async function CommitPolicyRequest(id: string, policySignature: Uint8Array): Promise<boolean> {
    try {
        const row = db.prepare('SELECT data FROM pending_policy_requests WHERE id = ?')
            .get(id) as { data: string } | undefined;

        if (!row) return false;

        const request = PolicySignRequest.decode(base64ToBytes(row.data));
        const policy = request.getRequestedPolicy();
        policy.signature = policySignature;
        const label = labelFromParams(policy.params.entries);
        if (!label) throw new Error("Policy has no known ResourceTag; refusing to store it under an ambiguous key");
        saveCommittedPolicy(db, label, bytesToBase64(policy.toBytes()));

        db.prepare('DELETE FROM pending_policy_requests WHERE id = ?')
            .run(id);

        return true;
    } catch (error) {
        console.error('Error committing policy request:', error);
        return false;
    }
}

export function ClearAllPolicies() {
    db.prepare('DELETE FROM policy_request_decisions').run();
    db.prepare('DELETE FROM pending_policy_requests').run();
    db.prepare('DELETE FROM committed_policies').run();
}

export function getCommittedPolicy(label: PolicyLabel): Policy | null {
    const b64 = getCommittedPolicyB64(db, label);
    return b64 ? Policy.from(base64ToBytes(b64)) : null;
}

export async function GetAllCommittedPolicies(): Promise<Policy[]> {
    const rows = db.prepare('SELECT data FROM committed_policies')
        .all() as { data: string }[];

    const policies: Policy[] = [];

    for (const row of rows) {
        try {
            const policyBytes = base64ToBytes(row.data);
            const policy = Policy.from(policyBytes);
            policies.push(policy);
        } catch (error) {
            console.error('Error decoding committed policy:', error);
        }
    }

    return policies;
}
