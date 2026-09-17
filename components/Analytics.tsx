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

  /**
   * Scroll depth is the bluntest dropoff measure there is: it says how far down
   * the page people got before they left, without needing a section to be
   * instrumented.
   */
  useEffect(() => {
    const marks = [25, 50, 75, 90]
    const seen = new Set<number>()
    let frame = 0

    const measure = () => {
      frame = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      if (max <= 0) return
      const pct = Math.round((window.scrollY / max) * 100)
      for (const m of marks) {
        if (pct >= m && !seen.has(m)) {
          seen.add(m)
          track(EV.scrollDepth, { percent: m })
        }
      }
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure) }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
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
