import Link from 'next/link'
import { LockIcon, SealIcon } from '@/components/ui/Callouts'

const ENVELOPES = [
    { name: 'Content', to: 'Investigator', body: 'What happened, who is accused, the evidence. Inspector Lan reads it and still cannot see who wrote it.' },
    { name: 'Identity', to: 'Guardian', body: 'Name, student ID, faculty. The independent guardian can confirm a verified student filed it, and sees nothing else.' },
    { name: 'Escalation', to: 'Council', body: 'A copy for the University Council behind a time lock. At the set time it opens. Nobody can stop it.', lock: true },
]

function EnvelopeArt() {
    return (
        <svg viewBox="0 0 440 340" role="img" aria-label="A sealed envelope with a wax seal" className="sv-hero-art">
            <title>A sealed envelope with a wax seal</title>
            <g className="sv-art-paper">
                <rect x="40" y="70" width="360" height="230" rx="14" fill="#fffdf8" stroke="#d9d1bf" strokeWidth="2" />
                <rect x="70" y="40" width="300" height="60" rx="8" fill="#ece6d8" stroke="#d9d1bf" strokeWidth="2" />
                <g stroke="#bdb39d" strokeWidth="6" strokeLinecap="round">
                    <path d="M96 62h160" /><path d="M96 80h110" />
                </g>
                <path d="M40 84l180 118 180-118" fill="none" stroke="#d9d1bf" strokeWidth="2" />
                <path d="M40 300l140-100M400 300L260 200" fill="none" stroke="#e6dfcd" strokeWidth="2" />
            </g>
            <g className="sv-art-seal">
                <polygon fill="#a8322a" points={Array.from({ length: 24 }, (_, i) => {
                    const a = (i / 24) * Math.PI * 2
                    const r = i % 2 === 0 ? 50 : 44
                    return `${(220 + r * Math.cos(a)).toFixed(1)},${(200 + r * Math.sin(a)).toFixed(1)}`
                }).join(' ')} />
                <circle cx="220" cy="200" r="34" fill="none" stroke="#7d201a" strokeWidth="2" />
                <g fill="none" stroke="#fffdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="204" y="195" width="32" height="24" rx="4" />
                    <path d="M210 195v-7a10 10 0 0 1 20 0v7" />
                </g>
            </g>
        </svg>
    )
}

export default function Landing() {
    return (
        <div className="sv-stack sv-stack-lg">
            <section className="sv-hero">
                <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/logo-wordmark.svg" alt="SealedVoice" width={248} height={53} className="sv-hero-wordmark" />
                    <h1>The law requires your name. <em>Your name is what gets you punished.</em></h1>
                    <p className="sv-lede">
                        Vietnam&apos;s Law on Denunciation (2018) asks a reporter for their name and address, and anonymous
                        reports are generally not processed. So a student must identify themselves to the school that may be
                        protecting the person they accuse. SealedVoice keeps the verification and removes the exposure: verified, but sealed.
                    </p>
                    <div className="sv-cta-row">
                        <Link href="/report" className="sv-btn sv-btn-seal sv-btn-lg">File a sealed report</Link>
                        <Link href="/dean" className="sv-btn sv-btn-ghost sv-btn-lg">Watch the insider fail</Link>
                    </div>
                </div>
                <EnvelopeArt />
            </section>

            <section aria-labelledby="envelopes">
                <h2 id="envelopes" className="sv-h2">Every report is three sealed envelopes</h2>
                <p className="sv-lede" style={{ marginBottom: '1.5rem' }}>
                    Each one is encrypted in the reporter&apos;s browser, for one role only. The server stores ciphertext and cannot open any of them.
                </p>
                <ol className="sv-envs-row">
                    {ENVELOPES.map((e) => (
                        <li className="sv-env-card" key={e.name}>
                            <div className="sv-env-flap" aria-hidden="true"><SealIcon size={34} /></div>
                            <h3>{e.name}</h3>
                            <p className="sv-env-to">opens for <strong>{e.to}</strong></p>
                            <p>{e.body}</p>
                            {e.lock && <p className="sv-env-lock"><LockIcon size={16} /> Time lock</p>}
                        </li>
                    ))}
                </ol>
            </section>

            <section className="sv-callout">
                <strong>This is not a policy promise.</strong> The refusals come from Tide&apos;s ORK network, not from an
                <code> if </code> in our server. See <Link href="/how-it-works">how it works</Link> and the honest list of limits.
            </section>
        </div>
    )
}
