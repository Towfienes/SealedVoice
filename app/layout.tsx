import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import { PersonaBar } from '@/components/ui/PersonaBar'
import { Fraunces, Public_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import './sealedvoice.css'

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', axes: ['opsz'], display: 'swap' })
const sans = Public_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
    title: 'SealedVoice: verified but sealed',
    description: 'A university reporting channel where the reporter is verified but sealed. Not even the Head of School can unmask them.',
}

interface RootLayoutProps {
    children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
    const shell = (
        <div className="sv-app">
            <a href="#main" className="sv-skip">Skip to content</a>
            <PersonaBar />
            <main id="main" className="sv-main">{children}</main>
            <footer className="sv-foot">
                SealedVoice · RMIT Hackathon 2026 · synthetic data only · personas are fictional
            </footer>
        </div>
    )
    return (
        <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
            <body>
                <AuthProvider>{shell}</AuthProvider>
            </body>
        </html>
    )
}
