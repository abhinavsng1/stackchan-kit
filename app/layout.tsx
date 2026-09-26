import { PRICE } from '@/lib/kit'
import type { Metadata } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Analytics from '@/components/Analytics'

/**
 * Outfit carries the whole page: display through caption. The brand asks for
 * 300 to 600, and nothing heavier — the wordmark itself is Medium.
 */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-outfit',
  display: 'swap',
})

/** Specs, data, code and product labels only. Never body copy. */
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
})

const SITE = 'https://pebblerobo.com'
const TITLE = 'Pebble-chan — the desktop robot you build yourself'
const DESCRIPTION =
  'A complete build kit: M5Stack CoreS3 Lite, two SCS0009 bus servos, driver board, ' +
  `power supply, printed shell and fasteners. ${PRICE.now} early bird, ships across India in 1–2 weeks.`

export const metadata: Metadata = {
  /** Lets every relative URL below resolve, including the share image. */
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  applicationName: 'Pebble Robotics',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
  },
  authors: [{ name: 'Pebble Robo' }],
  keywords: [
    'Stack-chan kit', 'desktop robot kit India', 'M5Stack CoreS3 Lite',
    'SCS0009 bus servo', 'ESP32-S3 robot', 'DIY robot kit', 'robotics kit India',
  ],
  category: 'Robotics',
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'Pebble Robo',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_IN',
    images: [{
      url: '/og.jpg', width: 1200, height: 630,
      alt: 'An assembled Pebble-chan on a desk, its display showing a face',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og.jpg'],
  },
  /**
   * Search Console's HTML-tag check. Read from the environment so the token
   * can be set without a code change — `vercel env add` then redeploy.
   * Absent is fine: Next omits the tag entirely rather than emitting an empty
   * one, which would fail verification in a confusing way.
   */
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  other: {
    /** Where it ships. Stated plainly because the kit is India-only. */
    'geo.region': 'IN',
    'geo.placename': 'Bengaluru',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrains.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
