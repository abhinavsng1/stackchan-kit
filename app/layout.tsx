import { PRICE } from '@/lib/kit'
import type { Metadata } from 'next'
import { Inter_Tight, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Analytics from '@/components/Analytics'
import XPixel from '@/components/XPixel'

/**
 * Inter Tight carries the whole page, display through caption. It is a
 * variable font, so one file covers every weight the scale uses; the
 * display sizes are SemiBold and tracked hard in, which is where its
 * character comes from.
 */
const sans = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
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
const TITLE = 'PebbleRobo | An AI companion with a life of its own'
const DESCRIPTION =
  'PebbleRobo is a desk companion with a face, a neck that turns and a voice. It notices you, ' +
  'looks up when you say its name and answers out loud. Arrives assembled and tested, no subscription. ' +
  `${PRICE.now}, or the same as a build kit. Ships across India in 1–2 weeks.`

export const metadata: Metadata = {
  /** Lets every relative URL below resolve, including the share image. */
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  applicationName: 'PebbleRobo',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
  },
  authors: [{ name: 'PebbleRobo' }],
  keywords: [
    'PebbleRobo', 'desktop robot India', 'AI desk companion', 'Stack-chan', 'Stack-chan kit', 'desktop robot kit India', 'M5Stack CoreS3 Lite',
    'SCS0009 bus servo', 'ESP32-S3 robot', 'DIY robot kit', 'robotics kit India',
  ],
  category: 'Robotics',
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'PebbleRobo',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_IN',
    images: [{
      url: '/og.jpg', width: 1200, height: 630,
      alt: 'PebbleRobo on a desk, its display showing a smiling face',
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
    <html lang="en" className={`${sans.variable} ${jetbrains.variable}`}>
      <body>
        {children}
        <Analytics />
        <XPixel />
      </body>
    </html>
  )
}
