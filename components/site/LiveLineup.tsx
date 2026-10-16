'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { SHELLS } from '@/lib/shells'
import { useLiveScene } from '@/components/site/useLiveScene'
import { rendered } from '@/lib/renders'

/**
 * Both colourways, live: black and white side by side, each head turning
 * to the cursor. The render of the same arrangement holds the space until
 * the scene is up, and stays (labelled as a render) when motion is off.
 *
 * On a phone the card is taller (16:9 rather than 12:5) and the pair closes
 * up, so the robots are as large as the screen allows. The live scene switches layout at the same
 * width (lib/live-lineup.ts COMPACT_BELOW), and so does the stand-in.
 */
export default function LiveLineup() {
  const host = useRef<HTMLDivElement>(null)
  const live = useLiveScene(host, async (el) => {
    const { startLineup } = await import('@/lib/live-lineup')
    return startLineup(el, { shells: SHELLS })
  })
  const fade = { opacity: live ? 0 : 1, transition: 'opacity 600ms var(--ease)' }

  return (
    <div className="media aspect-[16/9] sm:aspect-[12/5]">
      <Image src={rendered('/media/render/lineup@2400.webp')} fill sizes="(max-width: 1400px) 96vw, 1360px"
             alt="Two PebbleRobos side by side, one white and one black"
             className="object-cover hidden sm:block" style={fade} />
      <Image src={rendered('/media/render/lineup-compact@1600.webp')} fill sizes="96vw"
             alt="Two PebbleRobos standing close together, one white and one black"
             className="object-cover sm:hidden" style={fade} />
      <div ref={host} className="absolute inset-0 cursor-pointer" data-testid="live-lineup" />
    </div>
  )
}
