'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Razorpay's Affordability Widget: real bank offers, quoted by the gateway.
 *
 * Three things keep it from hurting the page. It is loaded lazily, only when
 * it scrolls into view, so it costs nothing on first paint. The key id is
 * fetched from our own server rather than embedded in the bundle, the same
 * way create-order hands it over. And if anything fails — the flag is off,
 * the account does not have the feature, the script is blocked — the
 * component renders nothing instead of an empty frame.
 */

declare global {
  interface Window {
    RazorpayAffordabilitySuite?: new (config: Record<string, unknown>) => { init: () => void }
  }
}

const SRC = 'https://cdn.razorpay.com/widgets/affordability/affordability.js'

export default function AffordabilityWidget({ amountPaise }: { amountPaise: number }) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let cancelled = false

    const start = async () => {
      try {
        const res = await fetch('/api/affordability')
        if (!res.ok) return setFailed(true)
        const { key_id: keyId } = await res.json()
        if (!keyId || cancelled) return setFailed(true)

        await new Promise<void>((resolve, reject) => {
          if (window.RazorpayAffordabilitySuite) return resolve()
          const script = document.createElement('script')
          script.src = SRC
          script.async = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('blocked'))
          document.head.appendChild(script)
        })
        if (cancelled) return

        const Suite = window.RazorpayAffordabilitySuite
        if (!Suite) return setFailed(true)
        new Suite({ key: keyId, amount: amountPaise, currency: 'INR' }).init()
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    // Only once it is actually on screen. The widget is a detail below a
    // price, not a reason to fetch a third-party script on load.
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      io.disconnect()
      void start()
    })
    io.observe(el)
    return () => { cancelled = true; io.disconnect() }
  }, [amountPaise])

  if (failed) return null
  return <div ref={host} id="razorpay-affordability-widget" className="mt-2" />
}
