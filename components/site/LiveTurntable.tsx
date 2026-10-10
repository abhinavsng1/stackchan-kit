'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { shellById } from '@/lib/shells'
import { useShell } from '@/lib/shell-store'
import { useLiveScene } from '@/components/site/useLiveScene'
import { rendered } from '@/lib/renders'

/**
 * One robot on a slow turntable, all the way round, that you can grab and
 * spin; its head keeps an eye on the cursor as it turns. It wears whichever
 * colour is chosen anywhere on the page. The render holds the space until the
 * scene is up, and stays (labelled as a render) when motion is off.
 */
export default function LiveTurntable() {
  const host = useRef<HTMLDivElement>(null)
  const shellId = useShell()
  const api = useRef<{ setShell: (w: ReturnType<typeof shellById>) => void } | null>(null)
  const live = useLiveScene(host, async (el) => {
    const { startTurntable } = await import('@/lib/live-turntable')
    const t = await startTurntable(el, { shell: shellById(shellId) })
    api.current = t
    return { dispose: () => { api.current = null; t.dispose() } }
  })
  useEffect(() => { api.current?.setShell(shellById(shellId)) }, [shellId, live])

  return (
    <div className="media" style={{ aspectRatio: '4 / 5', background: 'var(--surface-2)' }}>
      <Image src={rendered(`/media/shots/float-shell-${shellId}.webp`)} fill
             sizes="(max-width: 1024px) 92vw, 600px"
             alt={`PebbleRobo in ${shellById(shellId).name}`} className="object-contain p-[8%]"
             style={{ opacity: live ? 0 : 1, transition: 'opacity 600ms var(--ease)' }} />
      <div ref={host} className="absolute inset-0" data-testid="live-turntable" />
      {!live && <span className="tag absolute right-3 bottom-3 pointer-events-none">Render</span>}
    </div>
  )
}
