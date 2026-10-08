'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { FACES, faceSvg, byId } from '@/lib/faces'

/**
 * The robot, live, built from the same print files the renders use.
 *
 * It follows the cursor the way the real thing follows a servo command:
 * clamped, and damped so it arrives rather than tracks. A head that snaps to
 * the pointer reads as a mouse-follower; a head that eases into position
 * reads as a motor, which is what this is a picture of.
 *
 * Everything heavy loads late and stops when nobody is looking:
 *
 *   - three and the loaders are a dynamic import, triggered by an
 *     IntersectionObserver, so none of it is in the initial bundle.
 *   - the render loop stops when the card scrolls away or the tab is hidden.
 *     A WebGL canvas painting an idle animation in a background tab is a
 *     laptop fan for no reason.
 *   - prefers-reduced-motion never starts any of it: the poster stays and the
 *     expression can be changed with a button instead.
 */
export default function LiveRobot() {
  const host = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [faceIndex, setFaceIndex] = useState(0)
  const [quiet, setQuiet] = useState<boolean | null>(null)
  const api = useRef<{ setFace: (id: string) => void; dispose: () => void } | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setQuiet(mq.matches)
    read()
    mq.addEventListener('change', read)
    return () => mq.removeEventListener('change', read)
  }, [])

  useEffect(() => {
    if (quiet !== false) return
    const el = host.current
    if (!el) return
    let stop = () => {}
    let cancelled = false

    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      try {
        const mod = await import('@/lib/live-robot')
        if (cancelled) return
        const started = await mod.start(el, { onFace: setFaceIndex })
        api.current = started
        stop = started.dispose
        setLoaded(true)
      } catch {
        // A WebGL failure is not an error state worth shouting about: the
        // poster is a perfectly good picture of the robot.
        setFailed(true)
      }
    }, { rootMargin: '200px' })

    io.observe(el)
    return () => { cancelled = true; io.disconnect(); stop() }
  }, [quiet])

  const face = FACES[faceIndex] ?? FACES[0]

  return (
    <div className="relative overflow-hidden"
         style={{
           borderRadius: 'var(--radius-tile)',
           border: '1px solid var(--line-soft)',
           background: 'var(--surface)',
         }}>
      <div ref={host} className="relative w-full" style={{ aspectRatio: '4 / 3' }}>
        {/* The poster is the first paint and stays underneath: it is also what
            remains if WebGL is unavailable or motion is turned down. */}
        <Image
          src="/models/pebble-poster.webp"
          alt="Pebble-chan, the assembled robot"
          width={1200} height={900} priority={false}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ opacity: loaded ? 0 : 1, transition: 'opacity 600ms' }}
        />
      </div>

      <div className="absolute left-4 right-4 bottom-4 flex items-end justify-between gap-4">
        <p className="t-mono m-0 text-[11.5px]" style={{ color: 'var(--muted-2)' }}>
          {quiet === false && loaded
            ? '↳ This one’s live. Move your cursor, then tap it.'
            : failed
              ? '3D model from our print files'
              : 'Pebble-chan, from our print files'}
        </p>

        {/* With motion turned down there is no loop to tap, so the expression
            gets a real control instead of being unreachable. */}
        {quiet && (
          <button
            type="button"
            onClick={() => setFaceIndex((i) => (i + 1) % FACES.length)}
            className="t-mono text-[11px] px-3 py-1.5 cursor-pointer"
            style={{ borderRadius: 999, border: '1px solid var(--line)', color: 'var(--ink)' }}
          >
            {byId(face.id).name} · next
          </button>
        )}

        <span className="t-mono px-2 py-1 text-[10px] uppercase"
              style={{
                borderRadius: 999, background: 'rgba(5,5,5,.72)',
                border: '1px solid var(--line)', color: 'var(--muted)', letterSpacing: '.12em',
              }}>
          3D model
        </span>
      </div>

      {/* The still that the quiet path shows, drawn from the same atlas the
          live screen uses so the two cannot disagree. */}
      {quiet && (
        <div aria-hidden="true" className="absolute inset-0 grid place-items-center pointer-events-none">
          <div style={{ width: '34%', aspectRatio: '4 / 3', borderRadius: 6, overflow: 'hidden' }}
               dangerouslySetInnerHTML={{ __html: faceSvg(face) }} />
        </div>
      )}
    </div>
  )
}
