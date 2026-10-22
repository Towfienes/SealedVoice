import { NextRequest, NextResponse } from "next/server";
import {
    GetAllPendingPolicies,
    CreatePolicyRequest,
    AddPolicyRequestDecision,
    CommitPolicyRequest,
    GetAllCommittedPolicies,
} from "@/lib/database/policyDb";
import { bytesToBase64 } from "@/lib/tideSerialization";
import { labelFromParams } from "@/lib/policies/labels";
import { authenticate, forbidUnlessAny } from "@/lib/serverAuth";

export const runtime = "nodejs";

// Committed policies are public (every sealing/opening browser needs them). Pending requests and every write
// need a verified realm-admin token, so nobody else can park junk or overwrite a label.
async function adminOnly(req: NextRequest): Promise<NextResponse | null> {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    return forbidUnlessAny(auth, ["tide-realm-admin", "realm-admin"]);
}

export async function GET(req: NextRequest) {
    try {
        const type = req.nextUrl.searchParams.get("type");

        if (type === "committed") {
            const policies = await GetAllCommittedPolicies();
            const serialized = policies.map(p => ({
                data: bytesToBase64(p.toBytes()),
                label: labelFromParams(p.params.entries),
                resourceTag: p.params.entries.get("ResourceTag"),
                decryptRole: p.params.entries.get("DecryptionRealmRole"),
                requireTimeLock: p.params.entries.get("RequireTimeLock")
            }));
            return NextResponse.json(serialized);
        }

        const denied = await adminOnly(req);
        if (denied) return denied;
        const policies = await GetAllPendingPolicies();
        return NextResponse.json(policies);
    } catch (ex) {
        console.error("Error getting policies:", ex);
        return NextResponse.json({ error: "Internal Server Error: " + ex }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const denied = await adminOnly(req);
    if (denied) return denied;
    try {
        const { policyRequest, decision, committed, requestedBy, userVuid } = await req.json();

        if (committed) {
            const { base64ToBytes } = await import("@/lib/tideSerialization");
            await CommitPolicyRequest(committed.id, base64ToBytes(committed.signature));
        } else if (decision) {
            await AddPolicyRequestDecision(policyRequest, userVuid, decision.rejected);
        } else {
            await CreatePolicyRequest(policyRequest, requestedBy || "unknown");
        }

        return NextResponse.json({ message: "success" });
    } catch (err) {
        console.error("Error in policy POST:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }
}
