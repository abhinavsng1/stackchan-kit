'use client'

import { useEffect } from 'react'
import { EV, initAnalytics, track } from '@/lib/analytics'

/** Sections worth knowing whether anyone actually reached. */
const WATCH = ['does', 'box', 'specs', 'build', 'faq', 'reserve']

/**
 * Starts analytics on load. There is no consent gate: the footer discloses what
 * is collected, but nothing is withheld until a visitor agrees.
 *
 * What a visitor types is still never recorded — record_mask_all_inputs stays
 * on, and no tracked event carries a name, email, phone or address. That is a
 * property of the integration, not of consent.
 */
export default function Analytics() {
  useEffect(() => {
    let cancelled = false

    void (async () => {
      await initAnalytics()
      if (cancelled) return
      track(EV.pageViewed, {
        path: window.location.pathname,
        referrer: document.referrer || null,
        viewport: window.innerWidth < 640 ? 'phone' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
      })
    })()

    return () => { cancelled = true }
  }, [])

  // Which sections people actually reach.
  useEffect(() => {
    const seen = new Set<string>()
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !seen.has(e.target.id)) {
          seen.add(e.target.id)
          track(EV.sectionViewed, { section: e.target.id })
        }
      }
    }, { threshold: 0.25 })

    for (const id of WATCH) {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [])

  return null
}
