"use client";
import Link from "next/link";
import { useState } from "react";
import type { EnvelopeKind, OpenResult, ReportDraft, ReportRecord, ReporterIdentity } from "@/lib/vault";
import { Countdown, useUnlocked } from "./Countdown";
import { Denial, SignInPrompt, SimulatedBadge } from "./Callouts";
import { fmtTime } from "./format";
import { BusyLabel } from "./Spinner";
import { useReports, useSession } from "./useSession";

export type ViewerMode = "investigator" | "guardian" | "council";

const CONFIG: Record<ViewerMode, { opens: EnvelopeKind; also: EnvelopeKind | null; action: string; empty: string }> = {
  investigator: { opens: "content", also: "identity", action: "Open report", empty: "No reports yet." },
  guardian: { opens: "identity", also: "content", action: "Verify reporter", empty: "No reports yet." },
  council: { opens: "council", also: null, action: "Open council copy", empty: "No reports yet." },
};

type Slot = { status: "open"; value: unknown } | { status: "denied"; reason: string; message: string };
const toSlot = (r: OpenResult<unknown>): Slot =>
  r.ok ? { status: "open", value: r.value } : { status: "denied", reason: r.reason, message: r.message };

const LABEL: Record<EnvelopeKind, string> = { content: "Report content", identity: "Reporter identity", council: "Council copy" };

function Revealed({ kind, value }: { kind: EnvelopeKind; value: unknown }) {
  if (kind === "identity") {
    const i = value as ReporterIdentity;
    return (
      <dl className="sv-kv">
        <dt>Name</dt><dd>{i.fullName}</dd>
        <dt>Student ID</dt><dd>{i.studentId}</dd>
        <dt>Email</dt><dd>{i.email}</dd>
        <dt>Faculty</dt><dd>{i.faculty}</dd>
      </dl>
    );
  }
  const d = value as ReportDraft;
  return (
    <dl className="sv-kv">
      <dt>Title</dt><dd>{d.title}</dd>
      <dt>Category</dt><dd>{d.category}</dd>
      <dt>Accused</dt><dd>{d.accused}</dd>
      <dt>Description</dt><dd>{d.description}</dd>
      {d.evidence ? (<><dt>Evidence</dt><dd>{d.evidence}</dd></>) : null}
    </dl>
  );
}

function Envelope({ kind, slot }: { kind: EnvelopeKind; slot: Slot | undefined }) {
  return (
    <div className="sv-env">
      <h3>{LABEL[kind]}</h3>
      {!slot ? (
        <p className="sv-hint">Sealed. Not opened yet.</p>
      ) : slot.status === "open" ? (
        <div className="sv-granted"><span className="sv-badge sv-badge-ok">Opened</span><div style={{ marginTop: ".5rem" }}><Revealed kind={kind} value={slot.value} /></div></div>
      ) : (
        <Denial title={`${LABEL[kind]} stays sealed`} reason={slot.reason} message={slot.message} />
      )}
    </div>
  );
}

function ReportCard({ r, mode }: { r: ReportRecord; mode: ViewerMode }) {
  const { vault } = useSession();
  const cfg = CONFIG[mode];
  const [slots, setSlots] = useState<Partial<Record<EnvelopeKind, Slot>>>({});
  const [busy, setBusy] = useState(false);
  const unlockAt = r.envelopes.council.unlockAt;
  const unlocked = useUnlocked(unlockAt ?? 0);

  const run = async (kind: EnvelopeKind): Promise<Slot> => {
    try {
      const res = kind === "content" ? await vault.openContent(r) : kind === "identity" ? await vault.openIdentity(r) : await vault.openCouncil(r);
      return toSlot(res);
    } catch (e) {
      return { status: "denied", reason: "error", message: e instanceof Error ? e.message : String(e) };
    }
  };

  const open = async () => {
    setBusy(true);
    const kinds = cfg.also ? [cfg.opens, cfg.also] : [cfg.opens];
    const results = await Promise.all(kinds.map(run));
    setSlots(Object.fromEntries(kinds.map((k, i) => [k, results[i]])));
    setBusy(false);
  };

  const primary = slots[cfg.opens];
  return (
    <article className="sv-card sv-report" aria-label={`Report ${r.alias}`}>
      <div className="sv-report-head">
        <span className="sv-alias">{r.alias}</span>
        <span className="sv-badge sv-badge-pend">{r.status}</span>
        <span className="sv-meta">filed {fmtTime(r.createdAt)}</span>
        <SimulatedBadge />
      </div>
      {mode === "council" && unlockAt ? <Countdown unlockAt={unlockAt} /> : null}
      <div>
        <button className="sv-btn" onClick={open} disabled={busy} aria-busy={busy}>
          {busy ? <BusyLabel /> : mode === "council" && unlockAt && !unlocked ? `${cfg.action} (try early)` : cfg.action}
        </button>
      </div>
      {Object.keys(slots).length > 0 && (
        <div className="sv-envs" aria-live="polite">
          <Envelope kind={cfg.opens} slot={primary} />
          {cfg.also && <Envelope kind={cfg.also} slot={slots[cfg.also]} />}
          {mode === "guardian" && primary?.status === "open" && (
            <div className="sv-callout"><strong>Confirmed:</strong> a verified student filed {r.alias}. The content stays closed to you.</div>
          )}
        </div>
      )}
    </article>
  );
}

export function ReportViewer({ mode }: { mode: ViewerMode }) {
  const { session, ready } = useSession();
  const { reports, error, reload } = useReports();
  if (ready && !session?.signedIn) return <SignInPrompt what="see reports" />;
  return (
    <div className="sv-stack">
      <div>
        <button className="sv-btn sv-btn-ghost" onClick={() => void reload()}>Refresh list</button>
      </div>
      {error && <Denial reason="error" message={error} />}
      {reports === null ? (
        <p>Loading…</p>
      ) : reports.length === 0 ? (
        <div className="sv-callout">{CONFIG[mode].empty} Switch to Mai and <Link href="/report">file one</Link>.</div>
      ) : (
        reports.map((r) => <ReportCard key={r.id} r={r} mode={mode} />)
      )}
    </div>
  );
}
