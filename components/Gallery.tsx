'use client'

import Image from 'next/image'
import { useState } from 'react'
import { EV, track } from '@/lib/analytics'
import { rendered } from '@/lib/renders'

/** A compact mix of original footage stills, physical units, renders and artwork. */
type Shot = { src: string; alt: string; label: string; kind: 'render' | 'photo' | 'video still' | 'AI artwork'; caption: string; rotate?: boolean }

const SHOTS: readonly Shot[] = [
  { kind: 'render', src: rendered('/media/render/gallery-hero.webp'), alt: 'PebbleRobo, three-quarter view', label: 'Three-quarter', caption: 'Rendered from the product’s 3D model.' },
  { kind: 'video still', src: '/media/real/product-warm-upload-v1.png', rotate: true, alt: 'PebbleRobo on a warmly lit desk', label: 'On the desk', caption: 'Original still from product footage. Cropped for framing, without AI retouching.' },
  { kind: 'photo', src: '/media/real/table-4335.jpg', alt: 'Two real PebbleRobos, one white and one black, side by side on a dining table', label: 'Black and white', caption: 'Photograph of two finished robots, one black and one white.' },
  { kind: 'AI artwork', src: '/media/features/brochure-v1.webp', alt: 'PebbleRobo feature brochure: talks and listens, expressive face, moves and dances, and video calls', label: 'Feature overview', caption: 'AI-generated product illustration. Connected features use Wi-Fi and the companion app.' },
  { kind: 'render', src: rendered('/media/render/gallery-high.webp'), alt: 'PebbleRobo, from above', label: 'Above', caption: 'Rendered from the product’s 3D model.' },
  { kind: 'video still', src: '/media/real/product-daylight-upload-v1.png', rotate: true, alt: 'PebbleRobo in daylight on a desk', label: 'In daylight', caption: 'Original still from product footage. Cropped for framing, without AI retouching.' },
]

// The frame is 4:5. Swap its dimensions before a clockwise quarter turn,
// keeping the supplied files untouched in both the large view and thumbnails.
const clockwise = { transform: 'rotate(90deg)', width: '125%', height: '80%', left: '-12.5%', top: '10%', maxWidth: 'none' } as const

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
          <div key={s.src} className="absolute inset-0 transition-opacity duration-300"
               style={{ ...(s.rotate ? clockwise : {}), opacity: n === i ? 1 : 0 }} aria-hidden={n !== i}>
            <Image src={s.src} alt={s.alt} fill quality={90}
                   sizes="(max-width: 1024px) 94vw, 720px" className="object-contain" />
          </div>
        ))}
      </div>

      <div className="flex gap-2.5 mt-3 overflow-x-auto" role="tablist" aria-label="Product views">
        {SHOTS.map((s, n) => (
          <button key={s.src} type="button" role="tab" aria-selected={n === i}
                  aria-label={s.label} onClick={() => pick(n)}
                  className="relative shrink-0 w-[64px] h-[80px] overflow-hidden rounded-xl transition-opacity"
                  style={{
                    outline: n === i ? '2px solid var(--ink)' : '1px solid var(--line)',
                    outlineOffset: n === i ? 2 : 0,
                    opacity: n === i ? 1 : 0.72,
                  }}>
            <div className="absolute inset-0" style={s.rotate ? clockwise : undefined}>
              <Image src={s.src} alt="" fill sizes="80px" className="object-cover" />
            </div>
          </button>
        ))}
      </div>

      <figcaption className="t-mono text-[11.5px] text-[var(--muted)] mt-3">
        {shot.label}
      </figcaption>
    </figure>
  )
}
