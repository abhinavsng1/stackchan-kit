'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { analyticsMode } from '@/lib/analytics-environment'
import { X_BASE_CODE, captureTwclid, installTestQueue } from '@/lib/x-pixel'

/**
 * X conversion tracking base code, once per page, from the root layout.
 *
 * Rendered only once the page knows it is on the live site — the same rule the
 * Meta Pixel and Mixpanel follow — so development and preview deployments do
 * not report page views to the production pixel. The click id is kept on every
 * host, because it is only ever sent back to our own server.
 */
export default function XPixel() {
  const [live, setLive] = useState(false)

  useEffect(() => {
    // Global Privacy Control means no X at all: no pixel, and no click id kept
    // for the server to pass on. The server checks the same signal itself.
    const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
    if (gpc) return
    captureTwclid()
    const mode = analyticsMode()
    if (mode === 'live') setLive(true)
    else if (mode === 'test') installTestQueue()
  }, [])

  if (!live) return null

  // X conversion tracking base code
  return <Script id="x-pixel" strategy="afterInteractive">{X_BASE_CODE}</Script>
}
