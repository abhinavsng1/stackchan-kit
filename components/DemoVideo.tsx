'use client'

import { useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { EV } from '@/lib/events'

/**
 * The launch film.
 *
 * It carries a soundtrack, so muting is now a decision rather than a property
 * of the file: it autoplays silent because a page that makes noise at someone
 * is a page they close. `controls` is what lets them turn it on.
 *
 * Nothing downloads until the section is actually on screen: the poster is
 * 29 KB, the video is a megabyte, and most visitors never scroll this far.
 */
export default function DemoVideo({ dark }: { dark?: boolean } = {}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  /**
   * True once the browser has refused sound. Drives the prompt — without it
   * the film plays silently and nobody knows there was anything to hear.
   */
  const [needsGesture, setNeedsGesture] = useState(false)
  const milestones = useRef(new Set<number>())

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /**
     * Sound first, silence only if refused.
     *
     * Every browser blocks autoplay with audio until a page has earned it —
     * Chrome through its Media Engagement Index, Safari and Firefox outright.
     * So we ask for sound, and if play() rejects we mute and go again rather
     * than leaving the film frozen on its poster, which is what asking once
     * and giving up would do.
     *
     * A visitor who has watched video on this site before is likely to get
     * sound immediately. Everyone else gets motion plus a way to turn it on.
     */
    async function start() {
      if (!el) return
      el.muted = false
      try {
        await el.play()
        setNeedsGesture(false)
      } catch {
        el.muted = true
        setNeedsGesture(true)
        await el.play().catch(() => {})
      }
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Reduced motion means it waits for a deliberate press.
          if (!reduced) void start()
        } else if (!el.paused) {
          el.pause()
        }
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  /** The gesture the browser was holding out for. */
  function turnSoundOn() {
    const el = ref.current
    if (!el) return
    el.muted = false
    setNeedsGesture(false)
    void el.play().catch(() => {})
  }

  const onPlay = () => {
    if (started) return
    setStarted(true)
    track(EV.demoPlayed)
  }

  const onTimeUpdate = () => {
    const el = ref.current
    if (!el || !el.duration) return
    const pct = Math.floor((el.currentTime / el.duration) * 100)
    for (const mark of [25, 50, 75, 95]) {
      if (pct >= mark && !milestones.current.has(mark)) {
        milestones.current.add(mark)
        track(EV.demoProgress, { percent: mark })
      }
    }
  }

  return (
    <figure className="m-0">
      <div className={dark ? 'rounded-2xl overflow-hidden border' : 'card overflow-hidden'}
           style={dark
             ? { background: 'var(--screen)', borderColor: 'rgba(255,255,255,.14)' }
             : { background: 'var(--screen)' }}>
        <video
          data-testid="demo-video"
          ref={ref}
          className="w-full h-auto block"
          poster="/media/demo-poster.webp"
          preload="none"
          muted
          loop
          playsInline
          controls
          width={1024}
          height={576}
          onPlay={onPlay}
          onTimeUpdate={onTimeUpdate}
          aria-label="Forty-second film introducing the Pebble-chan kit"
        >
          <source src="/media/demo.webm" type="video/webm" />
          <source src="/media/demo.mp4" type="video/mp4" />
          Your browser cannot play this video.
        </video>
      </div>
      <figcaption className="t-label mt-3 flex flex-wrap items-center gap-3"
                  style={dark ? { color: 'rgba(255,255,255,.55)' } : undefined}>
        <span>40 seconds{needsGesture ? ' · your browser muted it' : ' · with sound'}</span>
        {needsGesture && (
          <button type="button" onClick={turnSoundOn} className="btn btn-ghost !py-1 !px-3 !text-[11px]">
            Turn sound on
          </button>
        )}
      </figcaption>
    </figure>
  )
}
