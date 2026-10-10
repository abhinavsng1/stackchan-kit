'use client'

import { useEffect, useRef, useState } from 'react'
import { EV, track } from '@/lib/analytics'

/**
 * A film with sound. It never plays itself: a press is the gesture a browser
 * needs before it will play sound, and a page that makes noise at someone is
 * a page they close. Only the poster loads up front.
 *
 * One film at a time — starting one pauses any other.
 */
export default function Film({
  id, src, title, length, className = '', aspect = '9 / 16',
}: {
  id: string
  /** Base path, no extension: .webm, .mp4 and .webp are served from it. */
  src: string
  title: string
  length: string
  className?: string
  aspect?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  const marks = useRef(new Set<number>())

  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) ref.current?.pause()
    }
    window.addEventListener('sc:film', onOther)
    return () => window.removeEventListener('sc:film', onOther)
  }, [id])

  const start = () => {
    const el = ref.current
    if (!el) return
    setStarted(true)
    el.muted = false
    void el.play().catch(() => {
      // Refused even after a press: play silently with the controls there.
      el.muted = true
      void el.play().catch(() => {})
    })
  }

  return (
    <div className={`media ${className}`} style={{ aspectRatio: aspect, background: '#0e0e0e' }}>
      <video
        ref={ref}
        data-testid={`film-${id}`}
        className="absolute inset-0 w-full h-full object-cover"
        poster={`${src}.webp`}
        preload="none"
        playsInline
        controls={started}
        onPlay={() => {
          window.dispatchEvent(new CustomEvent('sc:film', { detail: id }))
          if (!marks.current.has(0)) { marks.current.add(0); track(EV.demoPlayed, { film: id }) }
        }}
        onTimeUpdate={() => {
          const el = ref.current
          if (!el?.duration) return
          const pct = (el.currentTime / el.duration) * 100
          for (const m of [25, 50, 75, 95]) {
            if (pct >= m && !marks.current.has(m)) {
              marks.current.add(m)
              track(EV.demoProgress, { film: id, percent: m })
            }
          }
        }}
        aria-label={`${title}, ${length}`}
      >
        <source src={`${src}.webm`} type="video/webm" />
        <source src={`${src}.mp4`} type="video/mp4" />
      </video>

      {!started && (
        <button type="button" className="film-play" onClick={start}
                aria-label={`Play ${title}, ${length}, with sound`}>
          <span className="film-play-key" aria-hidden="true">
            <svg width="18" height="20" viewBox="0 0 20 22" fill="currentColor">
              <path d="M2 1.5v19a1 1 0 0 0 1.5.86l16-9.5a1 1 0 0 0 0-1.72l-16-9.5A1 1 0 0 0 2 1.5Z" />
            </svg>
          </span>
          <span className="absolute left-5 right-5 bottom-5 flex items-end justify-between gap-3 text-left">
            <span className="text-[15px] font-medium leading-tight">{title}</span>
            <span className="t-mono text-[11px] opacity-80 shrink-0">{length} · sound</span>
          </span>
        </button>
      )}
    </div>
  )
}
