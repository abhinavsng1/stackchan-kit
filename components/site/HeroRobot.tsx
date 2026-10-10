'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { SHELLS, type Shell } from '@/lib/shells'
import ShellPicker from '@/components/site/ShellPicker'
import { useShell } from '@/lib/shell-store'
import { rendered } from '@/lib/renders'
import { OWN_MOODS } from '@/lib/companion-face'
import { EASE } from '@/components/site/motion'

/**
 * The hero's robot: the real rig, built from the printed parts, watching the
 * cursor anywhere on the first screen.
 *
 * Everything heavy stays out of the first paint. three and the loaders are a
 * dynamic import; until they land the render carries the hero, and that
 * render is also what remains with reduced motion, Save-Data, or no WebGL.
 *
 * The mood readout under it is the robot's own state, reported back from the
 * face it is drawing — tap it and the word changes with the face.
 */

export default function HeroRobot({ area }: { area: React.RefObject<HTMLElement | null> }) {
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<{ setShell: (way: Shell) => void; dispose: () => void } | null>(null)
  const [live, setLive] = useState(false)
  // The colour is shared with every picker on the page (lib/shell-store.ts).
  const shellId = useShell()
  const shell = Math.max(0, SHELLS.findIndex((s) => s.id === shellId))
  const [mood, setMood] = useState(0)
  const [quiet, setQuiet] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const saveData = Boolean((navigator as unknown as { connection?: { saveData?: boolean } })
      .connection?.saveData)
    const read = () => setQuiet(mq.matches || saveData)
    read()
    mq.addEventListener('change', read)
    return () => mq.removeEventListener('change', read)
  }, [])

  useEffect(() => {
    if (quiet !== false) return
    const el = host.current
    if (!el) return
    let cancelled = false
    let stop = () => {}

    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      try {
        const mod = await import('@/lib/live-robot')
        if (cancelled) return
        const started = await mod.start(el, {
          onFace: setMood,
          pointerArea: area.current ?? undefined,
          shell: SHELLS[shell],
        })
        if (cancelled) { started.dispose(); return }
        api.current = started
        started.setShell(SHELLS[shell])
        stop = started.dispose
        setLive(true)
      } catch {
        // The render is a perfectly good picture of the robot; a WebGL
        // failure is not worth an error state in a hero.
      }
    }, { rootMargin: '200px' })

    io.observe(el)
    return () => { cancelled = true; io.disconnect(); stop() }
    // The shell is applied on start and by pick(); re-running on change would
    // tear the scene down for a colour swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiet, area])

  // A colour chosen anywhere on the page recolours the live robot here.
  useEffect(() => { api.current?.setShell(SHELLS[shell]) }, [shell])

  return (
    <div className="relative">
      <div className="relative">
        {/* No painted floor: the robot casts its own shadow, live and in the
            render that stands in for it until the live one loads. */}
        <div ref={host} className="relative w-full cursor-pointer" style={{ aspectRatio: '1 / 1' }}
             data-testid="hero-robot">
          {SHELLS.map((s, i) => (
            <Image
              key={s.id}
              src={rendered(`/media/shots/float-shell-${s.id}.webp`)}
              alt={i === shell ? `PebbleRobo in ${s.name}` : ''}
              aria-hidden={i !== shell}
              width={1400} height={1400} priority={s.id === 'ember'}
              sizes="(max-width: 1024px) 92vw, 640px"
              className="absolute inset-0 w-full h-full object-contain"
              style={{
                opacity: !live && i === shell ? 1 : 0,
                transition: 'opacity 500ms var(--ease)',
              }}
            />
          ))}
        </div>
      </div>

      {/* The controls sit under the robot, never over it. */}
      <div className="flex flex-wrap items-center justify-center sm:justify-between gap-x-6 gap-y-3 mt-1">
        {/* The mood readout is a wide-screen nicety; a phone keeps the swatches only. */}
        <div className="hidden sm:flex items-center gap-3 min-h-[28px]">
          <span className="live-dot" aria-hidden="true" />
          <span className="t-mono text-[12px] text-[var(--muted)]">
            {live ? 'Feeling ' : 'PebbleRobo'}
          </span>
          {live && (
            <span className="relative inline-block overflow-hidden h-[18px] min-w-[80px]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={OWN_MOODS[mood]?.id}
                  className="t-mono text-[12px] text-[var(--ink)] absolute left-0 top-0"
                  initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  aria-live="polite"
                >
                  {OWN_MOODS[mood]?.name.toLowerCase()}
                </motion.span>
              </AnimatePresence>
            </span>
          )}
        </div>

        <ShellPicker location="hero" size={20} />
      </div>
      <p className="t-mono text-[11.5px] text-[var(--muted-2)] mt-3 mb-0 hidden md:block">
        {live ? 'It’s watching your cursor. Tap it to change its mood.' : ' '}
      </p>
    </div>
  )
}
