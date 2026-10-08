'use client'

import Image from 'next/image'
import { useState } from 'react'
import { EV, track } from '@/lib/analytics'
import { rendered } from '@/lib/renders'

/**
 * Five angles on one robot, rendered from the same rigged model as the live
 * robot at the top of the page, so every picture of it agrees — the frame,
 * the glass, the base. Labelled as renders; the real footage is the film in
 * the Meet section.
 */
const SHOTS = [
  { src: rendered('/media/render/gallery-hero.webp'), alt: 'PebbleRobo in Ember, three-quarter view', label: 'Three-quarter' },
  { src: rendered('/media/render/gallery-front.webp'), alt: 'PebbleRobo in Ember, front view, smiling', label: 'Front' },
  { src: rendered('/media/render/gallery-right.webp'), alt: 'PebbleRobo in Ember, from the right', label: 'Right' },
  { src: rendered('/media/render/gallery-profile.webp'), alt: 'PebbleRobo in Ember, in profile', label: 'Profile' },
  { src: rendered('/media/render/gallery-high.webp'), alt: 'PebbleRobo in Ember, from above', label: 'Above' },
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
           style={{ borderRadius: 'var(--radius-tile)', background: 'var(--surface-2)' }}>
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
        {shot.label} · rendered from the 3D model of the robot you receive.
      </figcaption>
    </figure>
  )
}
