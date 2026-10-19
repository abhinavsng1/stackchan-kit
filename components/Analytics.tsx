'use client'

import { useEffect } from 'react'
import { EV, initAnalytics, measure, track } from '@/lib/analytics'

/** Sections worth knowing whether anyone actually reached. */
const WATCH = ['buy', 'watch', 'does', 'builds', 'hardware', 'kit', 'specs', 'faq', 'reserve', 'real', 'build', 'editions']

/**
 * The rest of the homepage, so every section's reach can be read in order.
 * Mixpanel only: WATCH is what Meta and X have always been sent as content
 * views, and adding to it would change what both campaigns count.
 */
const WATCH_QUIETLY = ['why', 'films', 'explore']

/** When this visit could first be counted, in ms from navigation start. */
let analyticsReadyAt = 0

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
      analyticsReadyAt = performance.now()
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

    const depth = () => {
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
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(depth) }

    depth()
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
          const send = WATCH.includes(e.target.id) ? track : measure
          send(EV.sectionViewed, { section: e.target.id })
        }
      }
    }, { threshold: 0.25 })

    for (const id of [...WATCH, ...WATCH_QUIETLY]) {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [])

  /**
   * Visible time, at a few marks. Three visits in four never scroll, and
   * scroll depth cannot tell someone who read the first screen for a minute
   * from someone who left in two seconds. Time in a hidden tab does not count.
   */
  useEffect(() => {
    const marks = [10, 30, 60, 120]
    let seconds = 0
    const timer = setInterval(() => {
      if (document.hidden) return
      seconds += 1
      if (marks.includes(seconds)) measure(EV.pageEngaged, { seconds })
      if (seconds >= marks[marks.length - 1]) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  /**
   * How long the page took on this visitor's own phone and connection, sent
   * once: three seconds after load, or as the page is hidden if that comes
   * first. `analytics_ms` is when the visit could first be counted at all;
   * anyone who left before then is missing from every other report.
   */
  useEffect(() => {
    let lcp = 0
    let sent = false
    let po: PerformanceObserver | undefined
    try {
      po = new PerformanceObserver((list) => { for (const e of list.getEntries()) lcp = e.startTime })
      po.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch { /* no LCP in this browser; the rest still goes */ }

    const send = () => {
      if (sent) return
      sent = true
      po?.disconnect()
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]
      const nv = navigator as Navigator & {
        connection?: { effectiveType?: string; saveData?: boolean }
        deviceMemory?: number
      }
      const ms = (n?: number) => (n && n > 0 ? Math.round(n) : undefined)
      measure(EV.pagePerformance, {
        ttfb_ms: ms(nav?.responseStart),
        fcp_ms: ms(fcp?.startTime),
        lcp_ms: ms(lcp),
        load_ms: ms(nav?.loadEventEnd),
        analytics_ms: ms(analyticsReadyAt),
        connection: nv.connection?.effectiveType,
        save_data: nv.connection?.saveData,
        device_memory: nv.deviceMemory,
      })
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const afterLoad = () => { timer = setTimeout(send, 3000) }
    const onHidden = () => { if (document.visibilityState === 'hidden') send() }
    if (document.readyState === 'complete') afterLoad()
    else window.addEventListener('load', afterLoad, { once: true })
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('load', afterLoad)
      document.removeEventListener('visibilitychange', onHidden)
      po?.disconnect()
    }
  }, [])

  return null
}
