import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import { PersonaBar } from '@/components/ui/PersonaBar'
import './globals.css'
import './sealedvoice.css'

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
        <html lang="en">
            <body>
                <AuthProvider>{shell}</AuthProvider>
            </body>
        </html>
    )
}
