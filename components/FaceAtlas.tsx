'use client'

import { useState } from 'react'
import { FACES, faceSvg } from '@/lib/faces'
import { track } from '@/lib/analytics'
import { EV } from '@/lib/events'

/**
 * The twelve expressions, drawn at the panel's true 320 x 240 with the same
 * geometry the firmware uses. Clicking one puts it on the robot above.
 */
export default function FaceAtlas() {
  const [active, setActive] = useState<string | null>(null)

  const pick = (id: string) => {
    setActive(id)
    window.dispatchEvent(new CustomEvent('sc:emote', { detail: id }))
    track(EV.emotePicked, { emotion: id })
    document.getElementById('top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="rail">
      {FACES.map((f) => {
        const on = active === f.id
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => pick(f.id)}
            aria-pressed={on}
            className="card card-lift overflow-hidden text-left p-0 cursor-pointer"
            style={on ? { borderColor: f.eye, boxShadow: `0 0 0 2px ${f.eye}` } : undefined}
          >
            <div
              className="leading-none"
              style={{ background: f.bg }}
              dangerouslySetInnerHTML={{ __html: faceSvg(f) }}
            />
            <div className="p-4 flex items-baseline gap-2.5">
              <span className="t-display text-[17px]">{f.name}</span>
              <span className="t-mono text-[10.5px] ml-auto px-2 py-1 rounded"
                    style={{
                      color: `color-mix(in srgb, ${f.eye} 58%, var(--ink))`,
                      background: `color-mix(in srgb, ${f.eye} 20%, transparent)`,
                    }}>
                {f.cmd}
              </span>
            </div>
            <p className="px-4 pb-4 m-0 text-[13px] text-[var(--muted)]">{f.use}</p>
          </button>
        )
      })}
    </div>
  )
}
