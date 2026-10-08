'use client'

import { useEffect, useRef, useState } from 'react'
import { EV, track } from '@/lib/analytics'

/**
 * Three short films, one per way someone might want to meet the robot.
 *
 * Each has a soundtrack, so none of them plays itself: a press is the gesture
 * a browser needs before it will play sound, and a page that makes noise at
 * someone is a page they close. Pressing one pauses whichever was playing.
 *
 * Nothing downloads until a film is pressed — only the ~30 KB poster loads up
 * front. Three films in full would be eleven megabytes most visitors never
 * watch.
 */
const FILMS = [
  {
    key: 'meet', src: '/media/robot/film-meet', length: '0:20',
    title: 'Meet Pebble-chan',
    body: 'An afternoon at the desk, with company.',
  },
  {
    key: 'made', src: '/media/robot/film-made', length: '0:47',
    title: 'From printer to desk',
    body: 'How one is made: a printed shell, two servos and a face.',
  },
  {
    key: 'look', src: '/media/robot/film-look', length: '0:09',
    title: 'Looking around',
    body: 'Pan and tilt, on a desk, from start to finish.',
  },
] as const

export default function Films() {
  return (
    <div className="rail rail-3">
      {FILMS.map((f) => <Film key={f.key} film={f} />)}
    </div>
  )
}

function Film({ film }: { film: (typeof FILMS)[number] }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  const milestones = useRef(new Set<number>())

  // One film at a time. Another film starting pauses this one.
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== film.key) ref.current?.pause()
    }
    window.addEventListener('sc:film', onOther)
    return () => window.removeEventListener('sc:film', onOther)
  }, [film.key])

  const start = () => {
    const el = ref.current
    if (!el) return
    setStarted(true)
    el.muted = false
    void el.play().catch(() => {
      // Refused even after a press (rare, but Safari has its moods): play
      // silently rather than not at all, with the controls there to unmute.
      el.muted = true
      void el.play().catch(() => {})
    })
  }

  const onPlay = () => {
    window.dispatchEvent(new CustomEvent('sc:film', { detail: film.key }))
    if (!milestones.current.has(0)) {
      milestones.current.add(0)
      track(EV.demoPlayed, { film: film.key })
    }
  }

  const onTimeUpdate = () => {
    const el = ref.current
    if (!el || !el.duration) return
    const pct = Math.floor((el.currentTime / el.duration) * 100)
    for (const mark of [25, 50, 75, 95]) {
      if (pct >= mark && !milestones.current.has(mark)) {
        milestones.current.add(mark)
        track(EV.demoProgress, { film: film.key, percent: mark })
      }
    }
  }

  return (
    <figure className="m-0">
      <div className="relative overflow-hidden aspect-[9/16] w-full"
           style={{ borderRadius: 'var(--radius-card)', background: 'var(--pebble-black)' }}>
        <video
          ref={ref}
          data-testid={`film-${film.key}`}
          className="absolute inset-0 w-full h-full object-cover"
          poster={`${film.src}.webp`}
          preload="none"
          playsInline
          controls={started}
          onPlay={onPlay}
          onTimeUpdate={onTimeUpdate}
          aria-label={`${film.title}, ${film.length}`}
        >
          <source src={`${film.src}.webm`} type="video/webm" />
          <source src={`${film.src}.mp4`} type="video/mp4" />
        </video>

        {!started && (
          <button type="button" className="film-play" onClick={start}
                  aria-label={`Play ${film.title}, ${film.length}, with sound`}>
            <span className="film-play-key" aria-hidden="true">
              <svg width="20" height="22" viewBox="0 0 20 22" fill="currentColor">
                <path d="M2 1.5v19a1 1 0 0 0 1.5.86l16-9.5a1 1 0 0 0 0-1.72l-16-9.5A1 1 0 0 0 2 1.5Z" />
              </svg>
            </span>
            <span className="t-mono text-[11px] absolute left-4 bottom-4 px-2.5 py-1"
                  style={{ borderRadius: 999, background: 'rgba(11,11,12,.6)' }}>
              {film.length} · sound on
            </span>
          </button>
        )}
      </div>

      <figcaption className="pt-4">
        <span className="t-display block text-[20px] sm:text-[22px]">
          {film.title}
        </span>
        <span className="block text-[14px] leading-[22px] mt-1" style={{ color: 'var(--muted)' }}>
          {film.body}
        </span>
      </figcaption>
    </figure>
  )
}
