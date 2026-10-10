'use client'

import { useEffect, useRef } from 'react'
import { moodById, drawCompanion } from '@/lib/companion-face'

/**
 * A small robot face, drawn by the same routine as the robot's own screen —
 * so an icon on the page and the face on the robot are the same face, not a
 * lookalike. It blinks on the robot's own clock while it is on screen.
 */
export default function FaceIcon({ mood, size = 72 }: { mood: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const m = moodById(mood)
    drawCompanion(ctx, m, 0)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Redraw only while visible, and only a few times a second: enough for a
    // blink to land, never a render loop per icon.
    let id = 0
    const offset = Math.random() * 5000
    const io = new IntersectionObserver(([e]) => {
      clearInterval(id)
      if (e.isIntersecting) id = window.setInterval(() => drawCompanion(ctx, m, performance.now() + offset), 120)
    })
    io.observe(c)
    return () => { io.disconnect(); clearInterval(id) }
  }, [mood])
  return (
    <canvas ref={ref} width={192} height={144} aria-hidden="true"
            className="block rounded-[10px] shrink-0"
            style={{ width: size, height: size * 0.75, imageRendering: 'pixelated', background: '#000' }} />
  )
}
