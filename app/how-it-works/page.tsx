import { SimulatedBadge } from '@/components/ui/Callouts'

const LIMITS = [
    'Writing style can de-anonymise a reporter.',
    'Tide stops reading, not deleting, so the student keeps the receipt.',
    'Metadata and IP addresses are visible.',
    'Staging ORK network (t=3, n=5), not a production network.',
    'The browser is the trust boundary: a compromised browser can leak what it decrypts.',
]

const POLICIES = [
    { label: 'content', enc: 'student', dec: 'investigator', lock: 'none' },
    { label: 'identity', enc: 'student', dec: 'identity-guardian', lock: 'none' },
    { label: 'council', enc: 'student', dec: 'council', lock: 'required' },
]

export default function HowItWorks() {
    return (
        <div className="sv-stack">
            <div className="sv-page-head">
                <h1 className="sv-h1">How it works</h1>
                <p className="sv-lede">
                    The server is never trusted with a secret. It stores ciphertext. The decision to open an envelope is made by the Tide ORK network, not by our code.
                </p>
            </div>

            <figure className="sv-arch">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/architecture.svg" width={1920} height={1080} alt="Architecture: the browser encrypts three envelopes, the app server stores ciphertext only, TideCloak enforces roles and quorum, the ORK network decides every decrypt. The insider is blocked at each path." />
                <figcaption className="sv-hint"><a href="/brand/architecture.svg" target="_blank" rel="noreferrer">Open the diagram full size</a></figcaption>
            </figure>

            <div className="sv-flow" role="group" aria-label="Architecture: browser, app server, TideCloak, ORK network">
                <div className="sv-node">
                    <h3>1. Browser</h3>
                    <ul>
                        <li>Mai signs in (verified)</li>
                        <li>Encrypts three envelopes locally</li>
                        <li>Sends ciphertext with <strong>no auth header</strong></li>
                    </ul>
                </div>
                <div className="sv-arrow">ciphertext only</div>
                <div className="sv-node">
                    <h3>2. App server</h3>
                    <ul>
                        <li>Stores ciphertext and tags</li>
                        <li>Never sees plaintext</li>
                        <li>Never learns who reported</li>
                    </ul>
                </div>
                <div className="sv-arrow">token + role</div>
                <div className="sv-node tide">
                    <h3>3. TideCloak</h3>
                    <ul>
                        <li>Realm roles: student, investigator, identity-guardian, council</li>
                        <li>Role changes need 2 of 3 admins</li>
                    </ul>
                </div>
                <div className="sv-arrow">decrypt request</div>
                <div className="sv-node tide">
                    <h3>4. ORK network</h3>
                    <ul>
                        <li>A Forseti contract runs on every node</li>
                        <li>Checks the role and the time lock</li>
                        <li>No single node holds the key</li>
                    </ul>
                </div>
            </div>

            <section className="sv-panel" aria-labelledby="env">
                <div className="sv-panel-head"><h2 id="env">Three envelopes, three policies</h2></div>
                <div className="sv-scroll" tabIndex={0} role="region" aria-label="Envelope policies">
                    <table className="sv-table" style={{ minWidth: '30rem' }}>
                        <thead><tr><th>Envelope</th><th>Encrypt role</th><th>Decrypt role</th><th>Time lock</th></tr></thead>
                        <tbody>{POLICIES.map((p) => (
                            <tr key={p.label}><td>{p.label}</td><td>{p.enc}</td><td>{p.dec}</td><td>{p.lock}</td></tr>
                        ))}</tbody>
                    </table>
                </div>
                <p className="sv-hint" style={{ marginTop: '.6rem' }}>
                    Dr. Hung holds none of the decrypt roles, and granting himself one is a change request that two other admins must approve.
                </p>
            </section>

            <section className="sv-panel" aria-labelledby="real">
                <div className="sv-panel-head"><h2 id="real">What is real, what is simulated</h2><SimulatedBadge /></div>
                <p>
                    When the SIMULATED badge shows in the top bar, this page is running on a mock vault that imitates the refusals in the browser.
                    Nothing then ran on Tide. With the Tide vault switched on, the refusal text on the investigator, guardian, council and insider pages is the
                    exact string returned by the network, and no badge is shown.
                </p>
            </section>

            <section className="sv-panel" aria-labelledby="limits" id="limits">
                <div className="sv-panel-head"><h2 id="limits">Limits</h2></div>
                <ul className="sv-limits">{LIMITS.map((l) => <li key={l}>{l}</li>)}</ul>
            </section>
        </div>
    )
}
