'use client'

import Image from 'next/image'
import { useState } from 'react'
import { EV, track } from '@/lib/analytics'

/**
 * Stills of one assembled unit, pulled frame-for-frame from the films further
 * down the page. Nothing here is a render or a retouched product shot — the
 * caption says so, and it has to stay true.
 *
 * Only angles where it stands upright with its legs in shot — from low down
 * and tilted, the body reads as a lump — and only frames from the 1080p phone
 * original, each picked for having no motion blur. The WhatsApp copies of the
 * other films are 576 px wide and too soft for a picture this size.
 *
 * The footage is portrait phone video; each still is cut to 4:5 at the full
 * 1080 px width, so the frame shows it pixel for pixel with nothing upscaled:
 * enough height for the whole robot, standing, without dwarfing the buy box.
 */
const SHOTS = [
  { src: '/media/robot/robot-desk.webp', alt: 'Pebble-chan on a desk beside a plant, smiling', label: 'Desk' },
  { src: '/media/robot/robot-happy.webp', alt: 'Pebble-chan from three-quarters, a happy face on its screen', label: 'Happy' },
  { src: '/media/robot/robot-curious.webp', alt: 'Pebble-chan with wide, curious eyes', label: 'Curious' },
  { src: '/media/robot/robot-close.webp', alt: 'Pebble-chan up close, the side ports and the printed shell in view', label: 'Close' },
  { src: '/media/robot/robot-wide.webp', alt: 'Pebble-chan on the desk it was filmed on', label: 'Wide' },
] as const

export default function Gallery() {
  const [i, setI] = useState(0)
  const shot = SHOTS[i]

  const pick = (n: number) => {
    setI(n)
    track(EV.galleryViewed, { view: SHOTS[n].label })
  }

  return (
    <figure className="m-0">
      <div className="relative overflow-hidden aspect-[4/5]"
           style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-ink)' }}>
        {SHOTS.map((s, n) => (
          <Image key={s.src} src={s.src} alt={s.alt}
                 fill priority={n === 0} quality={90}
                 sizes="(max-width: 1024px) 94vw, 720px"
                 className="object-cover transition-opacity duration-300"
                 style={{ opacity: n === i ? 1 : 0 }}
                 aria-hidden={n !== i} />
        ))}
      </div>

      <div className="flex gap-2.5 mt-3 overflow-x-auto" role="tablist" aria-label="Photographs">
        {SHOTS.map((s, n) => (
          <button key={s.src} type="button" role="tab" aria-selected={n === i}
                  aria-label={s.label} onClick={() => pick(n)}
                  className="relative shrink-0 w-[64px] h-[80px] overflow-hidden rounded-xl transition-opacity"
                  style={{
                    outline: n === i ? '2px solid var(--ink)' : '1px solid var(--line)',
                    outlineOffset: n === i ? 2 : 0,
                    opacity: n === i ? 1 : 0.72,
                  }}>
            <Image src={s.src} alt="" fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>

      <figcaption className="t-mono text-[11.5px] text-[var(--muted)] mt-3">
        {shot.label} · one batch 01 unit, frames from the films below. Not rendered.
      </figcaption>
    </figure>
  )
}
