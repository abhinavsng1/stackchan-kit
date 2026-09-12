import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-archivo',
  display: 'swap',
})

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Stack-chan Kit — a desktop robot you actually build',
  description:
    'A complete build kit for Stack-chan: M5Stack CoreS3 Lite, two SCS0009 bus servos, driver board, programmer, printed shell and fasteners. Ships in 1–2 weeks.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
