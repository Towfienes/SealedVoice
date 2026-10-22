'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { Receipt } from '@/lib/vault'
import { Countdown } from '@/components/ui/Countdown'
import { fmtTime } from '@/components/ui/format'
import { Panel, SimulatedBadge } from '@/components/ui/Callouts'

function lastReceipt(): Receipt | null {
    try {
        let best: Receipt | null = null
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (!k?.startsWith('sv-receipt:')) continue
            const r = JSON.parse(localStorage.getItem(k) ?? '') as Receipt
            if (!best || r.createdAt >= best.createdAt) best = r
        }
        return best
    } catch { return null }
}

function ReceiptView() {
    const id = useSearchParams().get('id')
    const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined)

    useEffect(() => {
        let r: Receipt | null = null
        try { r = id ? (JSON.parse(localStorage.getItem(`sv-receipt:${id}`) ?? 'null') as Receipt | null) : null } catch { /* ignore */ }
        setReceipt(r ?? lastReceipt())
    }, [id])

    if (receipt === undefined) return <p>Loading…</p>
    if (receipt === null) {
        return (
            <div className="sv-callout">
                No receipt on this device. <Link href="/report">File a report</Link> first.
            </div>
        )
    }

    const text = [
        'SealedVoice receipt',
        `Report: ${receipt.alias}`,
        `Filed: ${fmtTime(receipt.createdAt)}`,
        `Digest: ${receipt.digest}`,
        `Council copy opens: ${fmtTime(receipt.councilUnlockAt)}`,
        '',
        'Keep this. Tide stops people reading your report; it cannot stop someone deleting it. The receipt proves you filed it.',
    ].join('\n')

    const download = () => {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `sealedvoice-${receipt.alias.replace('#', '')}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="sv-stack">
            <div className="sv-granted" role="status">
                <strong>Sealed and received.</strong> The server holds three ciphertexts and nothing else.
            </div>
            <Panel title="Your receipt" actions={<SimulatedBadge />}>
                <dl className="sv-kv">
                    <dt>Alias</dt><dd><span className="sv-alias">{receipt.alias}</span></dd>
                    <dt>Filed</dt><dd>{fmtTime(receipt.createdAt)}</dd>
                    <dt>Digest</dt><dd className="sv-mono">{receipt.digest}</dd>
                </dl>
            </Panel>
            <Panel title="Council time lock">
                <Countdown unlockAt={receipt.councilUnlockAt} big />
                <p className="sv-hint" style={{ marginTop: '.6rem' }}>
                    At this time the University Council can open its copy, whatever anyone in the school wants. Nobody can cancel or extend it.
                </p>
            </Panel>
            <div className="sv-cta-row" style={{ marginTop: 0 }}>
                <button className="sv-btn" onClick={download}>Download receipt</button>
                <Link href="/investigator" className="sv-btn sv-btn-ghost">See the investigator&apos;s view</Link>
            </div>
            <p className="sv-hint">Keep the receipt. Tide stops people reading your report; it does not stop someone deleting it.</p>
        </div>
    )
}

export default function ReceiptPage() {
    return (
        <div>
            <div className="sv-page-head"><h1 className="sv-h1">Receipt</h1></div>
            <Suspense fallback={<p>Loading…</p>}><ReceiptView /></Suspense>
        </div>
    )
}
