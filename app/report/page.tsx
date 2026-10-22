'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ReportDraft, ReporterIdentity } from '@/lib/vault'
import { useSession } from '@/components/ui/useSession'
import { Denial, LockIcon, SimulatedBadge } from '@/components/ui/Callouts'
import { DeskGate } from '@/components/ui/DeskGate'
import { BusyLabel } from '@/components/ui/Spinner'

const CATEGORIES: { value: ReportDraft['category']; label: string }[] = [
    { value: 'grade-for-favours', label: 'Grades for favours' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'research-misconduct', label: 'Research misconduct' },
    { value: 'financial', label: 'Financial misconduct' },
    { value: 'other', label: 'Other' },
]

// Synthetic. Auto-filled from the signed-in student; in tide mode this would come from the token.
const MAI: ReporterIdentity = {
    fullName: 'Nguyen Thi Mai',
    studentId: 'S3999999',
    email: 'mai.nguyen@student.example.edu',
    faculty: 'Faculty of Engineering',
}

function ReportForm() {
    const { vault, session } = useSession()
    const router = useRouter()
    const params = useSearchParams()
    const delay = Number(params.get('delay')) || undefined
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [draft, setDraft] = useState<ReportDraft>({
        title: '', category: 'grade-for-favours', accused: '', description: '', evidence: '',
    })
    const set = <K extends keyof ReportDraft>(k: K, v: ReportDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))

    const isStudent = !!session?.roles.includes('student')

    async function submit(e: FormEvent) {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            const receipt = await vault.sealReport(draft, MAI, delay ? { councilDelaySec: delay } : undefined)
            try { localStorage.setItem(`sv-receipt:${receipt.reportId}`, JSON.stringify(receipt)) } catch { /* private mode */ }
            router.push(`/receipt?id=${encodeURIComponent(receipt.reportId)}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
            setBusy(false)
        }
    }

    return (
        <form className="sv-form" onSubmit={submit} aria-describedby="seal-note">
            <fieldset className="sv-fieldset">
                <legend className="sv-legend">What happened</legend>
                <div className="sv-field">
                    <label htmlFor="title">Short title</label>
                    <input id="title" className="sv-input" required maxLength={120} value={draft.title}
                        onChange={(e) => set('title', e.target.value)} placeholder="e.g. Grade offered in exchange for a favour" />
                </div>
                <div className="sv-field">
                    <label htmlFor="category">Category</label>
                    <select id="category" value={draft.category} onChange={(e) => set('category', e.target.value as ReportDraft['category'])}>
                        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>
                <div className="sv-field">
                    <label htmlFor="accused">Who is accused (role and unit)</label>
                    <input id="accused" className="sv-input" required value={draft.accused}
                        onChange={(e) => set('accused', e.target.value)} placeholder="e.g. Lecturer, Faculty of Engineering" />
                </div>
                <div className="sv-field">
                    <label htmlFor="description">Description</label>
                    <textarea id="description" className="sv-textarea" required value={draft.description}
                        onChange={(e) => set('description', e.target.value)} aria-describedby="style-hint" />
                    <span id="style-hint" className="sv-hint">Your writing style can identify you. Keep to facts, dates and places.</span>
                </div>
                <div className="sv-field">
                    <label htmlFor="evidence">Evidence (optional)</label>
                    <textarea id="evidence" className="sv-textarea" style={{ minHeight: '5rem' }} value={draft.evidence}
                        onChange={(e) => set('evidence', e.target.value)} placeholder="Links or descriptions. Synthetic data only." />
                </div>
            </fieldset>

            <fieldset className="sv-fieldset sealed">
                <legend className="sv-legend">Your identity, sealed with the report</legend>
                <dl className="sv-kv">
                    <dt>Name</dt><dd>{MAI.fullName}</dd>
                    <dt>Student ID</dt><dd>{MAI.studentId}</dd>
                    <dt>Email</dt><dd>{MAI.email}</dd>
                    <dt>Faculty</dt><dd>{MAI.faculty}</dd>
                </dl>
                <p id="seal-note" className="sv-hint">
                    Filled in from your sign-in. Only the identity guardian can open this envelope. Investigators, the Head of School and the server cannot.
                </p>
            </fieldset>

            {error && <Denial reason="error" message={error} />}

            <div className="sv-cta-row" style={{ marginTop: 0 }}>
                <button type="submit" className="sv-btn sv-btn-seal sv-btn-lg" disabled={busy || !isStudent} aria-busy={busy}>
                    {busy ? <BusyLabel label={vault.mode === 'tide' ? 'Encrypting 3 envelopes, waiting for Tide…' : 'Sealing in your browser (simulated)…'} /> : <><LockIcon /> Seal and send</>}
                </button>
                <SimulatedBadge />
            </div>
        </form>
    )
}

export default function ReportPage() {
    return (
        <div>
            <div className="sv-page-head">
                <h1 className="sv-h1">File a sealed report</h1>
                <p className="sv-lede">
                    Three envelopes are encrypted in this browser: the content, your identity, and a copy for the University Council.
                    The server receives ciphertext only, and the request carries no sign-in token, so it cannot tell who sent it.
                </p>
            </div>
            <DeskGate need={{ kind: 'role', role: 'student' }} desk="reporting form" persona="Mai (student)" personaId="mai"
                hint="Mai is a verified student. Only a student can file a report; her identity is sealed with it.">
                <Suspense fallback={<p>Loading…</p>}>
                    <ReportForm />
                </Suspense>
            </DeskGate>
        </div>
    )
}
