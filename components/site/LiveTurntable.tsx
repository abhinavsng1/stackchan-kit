'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { SHELLS } from '@/lib/shells'
import { useLiveScene } from '@/components/site/useLiveScene'

const EMBER = SHELLS.find((s) => s.id === 'ember') ?? SHELLS[0]

/**
 * One robot on a slow turntable, all the way round, that you can grab and
 * spin; its head keeps an eye on the cursor as it turns. The render of its
 * first frame holds the space until the scene is up, and stays (labelled as a
 * render) when motion is off.
 */
export default function LiveTurntable() {
  const host = useRef<HTMLDivElement>(null)
  const live = useLiveScene(host, async (el) => {
    const { startTurntable } = await import('@/lib/live-turntable')
    return startTurntable(el, { shell: EMBER })
  })

  return (
    <div className="media" style={{ aspectRatio: '4 / 5' }}>
      <Image src="/media/render/meet-face.webp" fill quality={90}
             sizes="(max-width: 768px) 40vw, 420px"
             alt="PebbleRobo in Ember, smiling, on a turntable" className="object-cover"
             style={{ opacity: live ? 0 : 1, transition: 'opacity 600ms var(--ease)' }} />
      <div ref={host} className="absolute inset-0" data-testid="live-turntable" />
      {!live && <span className="tag absolute right-3 bottom-3 pointer-events-none">Render</span>}
    </div>
  )
}
