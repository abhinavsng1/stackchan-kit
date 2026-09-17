'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A short looping clip used as section illustration.
 *
 * Three things matter here and none of them are visual:
 *
 * 1. Nothing downloads until the clip is near the viewport. A dozen of these
 *    on one page is tens of megabytes, and most visitors never scroll past
 *    the second section.
 * 2. Playback is tied to visibility, so offscreen clips are not decoding.
 *    Safari in particular will happily burn a core on a video it is not
 *    showing.
 * 3. Reduced motion means the poster and nothing else — these are decoration,
 *    so there is no control to offer and nothing lost by holding still.
 */
export default function Clip({
  src, poster, alt, className = '', sound = false,
}: {
  /** Base path with no extension — both .webm and .mp4 are served from it. */
  src: string; poster: string; alt: string; className?: string; sound?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [near, setNear] = useState(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Load early, play late: one observer with a generous margin decides when
    // the file is worth fetching, a tighter one decides when it should run.
    const load = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setNear(true); load.disconnect() }
    }, { rootMargin: '400px' })

    // React appends the <source> children on the next render; the element has
    // already concluded it has no source by then, so it needs telling.
    if (near) el.load()

    const play = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) void el.play().catch(() => {})
      else if (!el.paused) el.pause()
    }, { threshold: 0.25 })

    load.observe(el)
    play.observe(el)
    return () => { load.disconnect(); play.disconnect() }
  }, [near])

  return (
    <div className={`relative ${className}`}>
      <video
        ref={ref}
        className="w-full h-full object-cover block"
        poster={poster}
        preload="none"
        muted={muted}
        loop
        playsInline
        aria-label={alt}
      >
        {near && (
          <>
            <source src={`${src}.webm`} type="video/webm" />
            <source src={`${src}.mp4`} type="video/mp4" />
          </>
        )}
      </video>
      {sound && (
        <button
          type="button"
          onClick={() => {
            const el = ref.current
            if (!el) return
            const next = !muted
            setMuted(next)
            el.muted = next
            if (!next) void el.play().catch(() => {})
          }}
          className="absolute bottom-2.5 right-2.5 t-mono text-[10.5px] px-2 py-1 rounded-md border-0 cursor-pointer"
          style={{ background: 'rgba(5,8,11,.62)', color: '#fff', backdropFilter: 'blur(6px)' }}
          aria-pressed={!muted}
        >
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      )}
    </div>
  )
}
