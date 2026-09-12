'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  EV, initAnalytics, track, readConsent, writeConsent,
  privacySignalOptOut, analyticsConfigured, stopAnalytics,
} from '@/lib/analytics'

/** Sections worth knowing whether anyone actually reached. */
const WATCH = ['does', 'box', 'specs', 'build', 'faq', 'reserve']

export default function Analytics() {
  const [ask, setAsk] = useState(false)

  const start = useCallback(async () => {
    await initAnalytics()
    track(EV.pageViewed, {
      path: window.location.pathname,
      referrer: document.referrer || null,
      viewport: window.innerWidth < 640 ? 'phone' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    })
  }, [])

  useEffect(() => {
    if (!analyticsConfigured()) return

    // An explicit browser-level refusal is an answer. Do not ask again.
    if (privacySignalOptOut()) { writeConsent('denied'); return }

    const consent = readConsent()
    if (consent === 'granted') void start()
    else if (consent === null) setAsk(true)
  }, [start])

  // Let the footer reopen the choice.
  useEffect(() => {
    const open = () => setAsk(true)
    window.addEventListener('sc:privacy', open)
    return () => window.removeEventListener('sc:privacy', open)
  }, [])

  // The buy bar and the banner both live at the bottom edge.
  useEffect(() => {
    document.documentElement.setAttribute('data-consent-open', String(ask))
  }, [ask])

  // Which sections people actually reach.
  useEffect(() => {
    if (readConsent() !== 'granted') return
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
  }, [ask])

  const decide = (value: 'granted' | 'denied') => {
    writeConsent(value)
    setAsk(false)
    if (value === 'granted') void start()
    else stopAnalytics()
  }

  if (!ask) return null

  return (
    <div
      role="dialog"
      aria-label="Analytics choice"
      className="fixed z-[70] left-0 right-0 bottom-0 p-4 lg:left-6 lg:right-auto lg:bottom-6 lg:p-0 lg:max-w-[380px]"
    >
      <div className="card p-5" style={{ boxShadow: 'var(--sh-lg)' }}>
        <p className="t-label m-0 mb-2">Before you look around</p>
        <p className="text-[14px] m-0 mb-4 text-[var(--muted)]">
          We would like to record how this page gets used — clicks, scrolling and
          session replays — so we can make it better. What you type into the
          reserve form is never recorded. Say no and nothing loads at all.
        </p>
        <div className="flex gap-2.5">
          <button type="button" className="btn btn-brand !py-2.5 !text-[14px]" onClick={() => decide('granted')}>
            That&apos;s fine
          </button>
          <button type="button" className="btn btn-ghost !py-2.5 !text-[14px]" onClick={() => decide('denied')}>
            No thanks
          </button>
        </div>
      </div>
    </div>
  )
}
