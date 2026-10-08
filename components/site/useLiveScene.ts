'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * Start a live 3D scene in `host` once it is near the viewport, and stop it
 * when the component goes away.
 *
 * Until it is running — and for good, with reduced motion, Save-Data, or no
 * WebGL — the component shows its render instead. A failure is not worth an
 * error state: the render is a perfectly good picture of the robot.
 *
 * Returns whether the live scene is up, so the render can fade out under it.
 */
export function useLiveScene(
  host: RefObject<HTMLElement | null>,
  start: (el: HTMLElement) => Promise<{ dispose: () => void }>,
): boolean {
  const [live, setLive] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = Boolean((navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData)
    if (reduce || saveData) return

    let cancelled = false
    let stop = () => {}
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      try {
        const scene = await start(el)
        if (cancelled) { scene.dispose(); return }
        stop = scene.dispose
        setLive(true)
      } catch {
        // Keep the render.
      }
    }, { rootMargin: '300px' })
    io.observe(el)
    return () => { cancelled = true; io.disconnect(); stop() }
    // `start` is a module loader that never changes for a given component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host])

  return live
}
