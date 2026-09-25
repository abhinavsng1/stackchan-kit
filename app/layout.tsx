import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono, Silkscreen } from 'next/font/google'
import './globals.css'
import Analytics from '@/components/Analytics'

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

const silkscreen = Silkscreen({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-silkscreen',
  display: 'swap',
})

const SITE = 'https://pebblerobo.com'
const TITLE = 'Pebble-chan — the desktop robot you build yourself'
const DESCRIPTION =
  'A complete build kit: M5Stack CoreS3 Lite, two SCS0009 bus servos, driver board, ' +
  'power supply, printed shell and fasteners. ₹8,999, ships across India in 1–2 weeks.'

export const metadata: Metadata = {
  /** Lets every relative URL below resolve, including the share image. */
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  applicationName: 'Pebble Robo',
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
    <html lang="en" className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable} ${silkscreen.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
