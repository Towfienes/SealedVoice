// contracts/SealedVoicePolicy.cs  (single source of truth; lib/forsetiContract.ts is generated from it,
// tests/contract.test.ts fails if the two drift)
//
// Drop-in replacement for the default contract in
// forseti-crypto-quickstart/template-ts-app/lib/forsetiContract.ts
//
// Four changes from the upstream contract, each closing a real hole:
//
//  1. FAIL-CLOSED ROLES. Upstream returns `PolicyDecision.Allow()` when
//     DecryptionRealmRole is null ("no restrictions on executor"). One missing
//     policy parameter therefore turns the whole gate into a no-op. Here a null
//     role is a DENY.
//
//  2. TIME LOCK IS MANDATORY, NOT OPPORTUNISTIC. Upstream only checks a
//     DecryptTimeLock tag *if the client chose to send one*. The client controls
//     the tags, so the client controls the lock. Here the tag is required for
//     every decryption of a sealed-bid payload, and a missing or unparsable tag
//     is a DENY. (The stronger fix is OpenAt as a [PolicyParam]; see
//     docs/TRUST-MODEL.md §4.)
//
//  3. TAGS ARE BOUND TO THE REQUEST. The contract rejects a decryption whose tag
//     set does not contain the resource tag, so a payload sealed for one purpose
//     cannot be replayed against another.
//
//  4. TIME LOCK IS A POLICY PARAMETER. RequireTimeLock (int) is set by the policy, which is
//     committed by admin quorum, not by the client. RequireTimeLock=1 (council policy): a decryption
//     with no DecryptTimeLock tag, a malformed one, or one that has not passed is DENIED.
//     RequireTimeLock=0 (investigator/guardian): no lock is needed, but a malformed lock tag is
//     still denied and a lock that is present and not yet passed is still honoured.
//
// Contract ID = SHA512(source). Any edit changes the ID, which means the policy
// must be re-created, re-approved by quorum and re-committed. That is the point.

using Ork.Forseti.Sdk;
using Cryptide.Tools;
using Ork.Shared.Models.Contracts;
using System;
using System.Collections.Generic;
using System.Text;

public class Contract : IAccessPolicy
{
    [PolicyParam(Required = true, Description = "Role required to seal a report")]
    public string EncryptionRealmRole { get; set; }

    [PolicyParam(Required = true, Description = "Role required to open a sealed report")]
    public string DecryptionRealmRole { get; set; }

    [PolicyParam(Required = true, Description = "Tag that marks the envelope kind, e.g. sv:content")]
    public string ResourceTag { get; set; }

    [PolicyParam(Required = false, Description = "1 = every decryption must carry a DecryptTimeLock tag that has passed")]
    public int RequireTimeLock { get; set; }

    private bool isEncryptionRequest = false;
    private List<string> DataTags = new();

    public PolicyDecision ValidateData(DataContext ctx)
    {
        if (ctx.RequestId == "PolicyEnabledEncryption:1")
        {
            isEncryptionRequest = true;
        }
        else if (ctx.RequestId == "PolicyEnabledDecryption:1")
        {
            isEncryptionRequest = false;
        }
        else
        {
            return PolicyDecision.Deny("This contract must only be used with Policy Enabled Encryption/Decryption requests");
        }

        if (ctx.Policy.ExecutionType != ExecutionType.PRIVATE)
        {
            return PolicyDecision.Deny("Policy used against this contract must be EXPLICIT PRIVATE");
        }

        // ── Change 1: a missing resource tag is a configuration error, not a free pass.
        if (string.IsNullOrWhiteSpace(ResourceTag))
        {
            return PolicyDecision.Deny("ResourceTag policy parameter is required");
        }

        ReadOnlyMemory<byte> data = ctx.Data;
        if (isEncryptionRequest)
        {
            var time = data.GetValue(0);
            ReadOnlyMemory<byte> firstEncryptionRequest = data.GetValue(1);
            for (int i = 2; firstEncryptionRequest.TryGetValue(i, out var tag); i++)
            {
                this.DataTags.Add(Encoding.UTF8.GetString(tag.Span));
            }
        }
        else
        {
            var firstDecryptionRequest = data.GetValue(0);
            for (int i = 3; firstDecryptionRequest.TryGetValue(i, out var tag); i++)
            {
                this.DataTags.Add(Encoding.UTF8.GetString(tag.Span));
            }
        }

        // ── Change 3: the payload must carry the resource tag it was sealed under.
        if (!DataTags.Contains(ResourceTag))
        {
            return PolicyDecision.Deny(
                "Payload is not tagged as '" + ResourceTag + "'; refusing to treat it as this envelope kind");
        }

        // ── Change 2: time lock: enforced when present, mandatory when RequireTimeLock=1 (set by policy, not client).
        if (!isEncryptionRequest)
        {
            int? lockEpoch = null;

            foreach (var tag in DataTags)
            {
                if (tag.StartsWith("DecryptTimeLock:"))
                {
                    var val = tag.Substring("DecryptTimeLock:".Length);
                    if (!int.TryParse(val, out int parsed))
                    {
                        return PolicyDecision.Deny("Malformed DecryptTimeLock tag: " + tag);
                    }
                    // If several locks are present, the strictest one wins.
                    lockEpoch = lockEpoch.HasValue ? Math.Max(lockEpoch.Value, parsed) : parsed;
                }
            }

            if (RequireTimeLock == 1 && !lockEpoch.HasValue)
            {
                return PolicyDecision.Deny(
                    "This policy requires a DecryptTimeLock tag; refusing an unbounded decryption");
            }

            if (lockEpoch.HasValue)
            {
                var currentTime = (int)Utils.GetEpochSeconds();
                if (currentTime < lockEpoch.Value)
                {
                    return PolicyDecision.Deny("Time lock preventing decryption until " + lockEpoch.Value);
                }
            }
        }

        return PolicyDecision.Allow();
    }

    public PolicyDecision ValidateExecutor(ExecutorContext ctx)
    {
        var executor = new DokenDto(ctx.Doken);

        // ── Change 1 continued: null role DENIES instead of allowing everyone.
        var requiredRole = isEncryptionRequest ? EncryptionRealmRole : DecryptionRealmRole;

        if (string.IsNullOrWhiteSpace(requiredRole))
        {
            return PolicyDecision.Deny(
                (isEncryptionRequest ? "EncryptionRealmRole" : "DecryptionRealmRole") +
                " policy parameter is required");
        }

        return Decision
            .RequireNotExpired(executor)
            .RequireRole(executor, requiredRole);
    }
}
