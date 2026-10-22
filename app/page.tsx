import Link from 'next/link'
import { LockIcon } from '@/components/ui/Callouts'

const SLOTS = [
    { icon: true, title: 'Content', who: 'Only an investigator can open it', bar: true },
    { icon: true, title: 'Identity', who: 'Only the identity guardian can open it', bar: true },
    { icon: true, title: 'Council copy', who: 'Opens for the Council at a fixed time. Nobody can stop it.', bar: true },
]

export default function Landing() {
    return (
        <div className="sv-stack">
            <section className="sv-hero">
                <div>
                    <p className="sv-kicker">Verified, but sealed</p>
                    <h1>The law requires your name. <em>Your name is what gets you punished.</em></h1>
                    <p className="sv-lede">
                        In Vietnam, the Law on Denunciation (2018) asks a reporter for their name and address, and anonymous
                        reports are generally not processed. So a student must identify themselves to the very school that
                        may be protecting the person they accuse. SealedVoice keeps the verification and removes the exposure.
                    </p>
                    <div className="sv-cta-row">
                        <Link href="/report" className="sv-btn sv-btn-seal sv-btn-lg">File a sealed report</Link>
                        <Link href="/dean" className="sv-btn sv-btn-ghost sv-btn-lg">Watch the insider fail</Link>
                    </div>
                </div>

                <aside className="sv-doc" aria-label="What one sealed report contains">
                    <div className="sv-doc-title"><span>Report #A1</span><span className="sv-badge sv-badge-deny">Sealed</span></div>
                    {SLOTS.map((s) => (
                        <div className="sv-slot" key={s.title}>
                            <LockIcon size={22} />
                            <div><b>{s.title}</b><small>{s.who}</small></div>
                            <div className="bar" aria-hidden="true" />
                        </div>
                    ))}
                    <p className="sv-meta">Encrypted in the reporter&apos;s browser. The server stores ciphertext only.</p>
                </aside>
            </section>

            <section aria-labelledby="promise">
                <h2 id="promise" className="sv-h1" style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>The promise</h2>
                <div className="sv-grid-3">
                    <div className="sv-card sv-step">
                        <span className="num">1</span>
                        <h3>Mai is verified</h3>
                        <p>She signs in as a student. Her name, student ID and faculty are sealed with the report, so a real, accountable person is behind it.</p>
                    </div>
                    <div className="sv-card sv-step">
                        <span className="num">2</span>
                        <h3>Inspector Lan investigates</h3>
                        <p>She reads what happened. The identity envelope shows a lock and the exact refusal. She never learns who Mai is.</p>
                    </div>
                    <div className="sv-card sv-step">
                        <span className="num">3</span>
                        <h3>Dr. Hung is blocked</h3>
                        <p>The Head of School is a realm admin with database access. He still cannot read, unmask, self-promote or bury the report.</p>
                    </div>
                </div>
            </section>

            <section className="sv-callout">
                <strong>Why this is not a policy promise.</strong> The refusals come from Tide&apos;s ORK network, not from an
                <code> if </code> in our server. See <Link href="/how-it-works">how it works</Link> and the honest list of limits.
            </section>
        </div>
    )
}
