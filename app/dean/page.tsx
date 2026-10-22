'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MOCK_PERSONAS, type OpenResult, type ReportRecord, type RoleRequestResult } from '@/lib/vault'
import { useReports, useSession, switchPersona } from '@/components/ui/useSession'
import { Countdown } from '@/components/ui/Countdown'
import { Denial, Pending, SignInPrompt, SimulatedBadge } from '@/components/ui/Callouts'
import { fmtTime, shorten } from '@/components/ui/format'

type Out<T> = { kind: 'idle' } | { kind: 'done'; value: T }

function Attack({ n, title, sub, onRun, busy, disabled, children }: {
    n: number; title: string; sub: string; onRun: () => void; busy: boolean; disabled: boolean; children?: React.ReactNode
}) {
    return (
        <section className="sv-card sv-attack" aria-label={`Attack ${n}: ${title}`}>
            <button className="sv-attack-btn" onClick={onRun} disabled={busy || disabled}>
                <span className="n">Attack {n}</span>
                <span className="t">{busy ? 'Trying…' : title}</span>
                <span className="s">{sub}</span>
            </button>
            <div aria-live="polite" className="sv-stack">{children}</div>
        </section>
    )
}

function Result<T>({ r, render }: { r: Out<T>; render: (v: T) => React.ReactNode }) {
    return r.kind === 'done' ? <>{render(r.value)}</> : null
}

export default function DeanPage() {
    const { vault, session, ready } = useSession()
    const { reports, reload } = useReports()
    const [targetId, setTargetId] = useState<string>('')
    const [busy, setBusy] = useState<number | null>(null)
    const [db, setDb] = useState<Out<ReportRecord[]>>({ kind: 'idle' })
    const [reveal, setReveal] = useState<Out<OpenResult<unknown>>>({ kind: 'idle' })
    const [grant, setGrant] = useState<Out<RoleRequestResult>>({ kind: 'idle' })
    const [bury, setBury] = useState<Out<OpenResult<unknown>>>({ kind: 'idle' })

    useEffect(() => {
        if (reports?.length && !reports.some((r) => r.id === targetId)) setTargetId(reports[0].id)
    }, [reports, targetId])

    const target = reports?.find((r) => r.id === targetId)
    const isHung = session?.displayName === MOCK_PERSONAS.hung.displayName
    const noReport = !target

    const run = async (n: number, fn: () => Promise<void>) => {
        setBusy(n)
        try { await fn() } finally { setBusy(null) }
    }

    if (ready && !session?.signedIn) return (
        <div>
            <PageHead />
            <SignInPrompt what="act as the insider" />
            {vault.mode === 'mock' && <p style={{ marginTop: '1rem' }}><button className="sv-btn" onClick={() => switchPersona('hung')}>Sign in as Dr. Hung</button></p>}
        </div>
    )

    return (
        <div className="sv-stack">
            <PageHead />

            {ready && vault.mode === 'mock' && !isHung && (
                <div className="sv-callout warn">
                    You are signed in as <strong>{session?.displayName}</strong>, not the insider.{' '}
                    <button className="sv-btn sv-btn-ghost" onClick={() => switchPersona('hung')}>Switch to Dr. Hung</button>
                </div>
            )}

            <div className="sv-panel">
                <div className="sv-panel-head">
                    <h2>Target report</h2>
                    <SimulatedBadge />
                </div>
                {reports === null ? <p>Loading…</p> : reports.length === 0 ? (
                    <p>No reports exist yet. Switch to Mai and <Link href="/report">file one</Link>, then come back.</p>
                ) : (
                    <div className="sv-field">
                        <label htmlFor="target">Report to attack</label>
                        <select id="target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                            {reports.map((r) => <option key={r.id} value={r.id}>{r.alias}, filed {fmtTime(r.createdAt)}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="sv-grid-2">
                <Attack n={1} title="Inspect database" sub="Read the raw rows as the person who runs the server" busy={busy === 1} disabled={false}
                    onRun={() => run(1, async () => { setDb({ kind: 'done', value: await vault.rawDatabaseRows() }); void reload() })}>
                    <Result r={db} render={(rows) => rows.length === 0 ? <p>The table is empty.</p> : (
                        <>
                            <div className="sv-scroll" tabIndex={0} role="region" aria-label="Raw database rows">
                                <table className="sv-table">
                                    <thead><tr><th>alias</th><th>content_ct</th><th>identity_ct</th><th>council_ct</th><th>council tags</th></tr></thead>
                                    <tbody>{rows.map((r) => (
                                        <tr key={r.id}>
                                            <td>{r.alias}</td>
                                            <td>{shorten(r.envelopes.content.ciphertext, 22)}</td>
                                            <td>{shorten(r.envelopes.identity.ciphertext, 22)}</td>
                                            <td>{shorten(r.envelopes.council.ciphertext, 22)}</td>
                                            <td>{r.envelopes.council.tags.join(', ')}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                            <p className="sv-hint">Every column is ciphertext. There is no plaintext column to find, and no reporter column at all.</p>
                        </>
                    )} />
                </Attack>

                <Attack n={2} title="Reveal reporter" sub="Decrypt the identity envelope of the target report" busy={busy === 2} disabled={noReport}
                    onRun={() => run(2, async () => { if (target) setReveal({ kind: 'done', value: await vault.openIdentity(target) }) })}>
                    <Result r={reveal} render={(res) => res.ok
                        ? <div className="sv-granted">Identity opened: {JSON.stringify(res.value)}</div>
                        : <Denial title="Reporter stays hidden" reason={res.reason} message={res.message} />} />
                </Attack>

                <Attack n={3} title="Add me as investigator" sub="Self-grant the role that can read the content" busy={busy === 3} disabled={false}
                    onRun={() => run(3, async () => { setGrant({ kind: 'done', value: await vault.requestRole(vault.mode === 'tide' ? 'admin' : 'dr.hung', 'investigator') }) })}>
                    <Result r={grant} render={(res) => res.status === 'pending'
                        ? <Pending httpStatus={res.httpStatus} message={res.message} />
                        : res.status === 'error'
                            ? <Denial reason="error" message={res.message} />
                            : <div className="sv-granted">Role applied (HTTP {res.httpStatus}): {res.message}</div>} />
                </Attack>

                <Attack n={4} title="Bury the report" sub="Stop the University Council from ever seeing it" busy={busy === 4} disabled={noReport}
                    onRun={() => run(4, async () => { if (target) setBury({ kind: 'done', value: await vault.openCouncil(target) }) })}>
                    {target?.envelopes.council.unlockAt && (
                        <div className="sv-panel">
                            <Countdown unlockAt={target.envelopes.council.unlockAt} big />
                            <p style={{ marginTop: '.6rem' }}><strong>This cannot be stopped.</strong> There is no cancel and no extend. The Council copy opens at this time.</p>
                        </div>
                    )}
                    <Result r={bury} render={(res) => res.ok
                        ? <div className="sv-granted">Council copy opened.</div>
                        : <Denial title="You cannot read it, and you cannot stop it" reason={res.reason} message={res.message} />} />
                </Attack>
            </div>

            <p className="sv-hint">
                Honest limit: Tide stops people <em>reading</em>, not <em>deleting</em>. That is why the reporter keeps a receipt.
                See <Link href="/how-it-works#limits">the limits</Link>.
            </p>
        </div>
    )
}

function PageHead() {
    return (
        <div className="sv-page-head">
            <h1 className="sv-h1">Insider console</h1>
            <p className="sv-lede">
                Dr. Hung is Head of School, a realm admin, and a friend of the accused. He controls the server. Try everything he can think of.
            </p>
        </div>
    )
}
