'use client'

import Image from 'next/image'
import { useState } from 'react'
import { EV, track } from '@/lib/analytics'

/**
 * Stills of one assembled unit, pulled frame-for-frame from the films further
 * down the page. Nothing here is a render or a retouched product shot — the
 * caption says so, and it has to stay true.
 *
 * Only angles where it stands upright with its legs in shot. From low down
 * and tilted, the body reads as a lump, so those frames are left out.
 *
 * The source footage is portrait phone video, so every still is 9:16 and is
 * shown in a 4:5 frame: enough height for the whole robot, standing, without
 * the frame dwarfing the buy box beside it.
 */
const SHOTS = [
  { src: '/media/robot/robot-front.webp', alt: 'Pebble-chan on a desk, facing the camera', label: 'Front' },
  { src: '/media/robot/robot-face.webp', alt: 'Pebble-chan with a blue, wide-eyed face', label: 'Face' },
  { src: '/media/robot/robot-side.webp', alt: 'Pebble-chan from three-quarters, showing the side ports', label: 'Side' },
  { src: '/media/robot/robot-desk.webp', alt: 'Pebble-chan at rest on a desk beside a figure', label: 'Desk' },
  { src: '/media/robot/robot-full.webp', alt: 'Pebble-chan standing on its legs, the whole robot in view', label: 'Full' },
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
                 fill priority={n === 0}
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
