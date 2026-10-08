'use client'

import { useState } from 'react'
import Image from 'next/image'
import { SHELLS } from '@/lib/shells'

/**
 * The shell, in each colour it can be printed in.
 *
 * Picking a swatch swaps the product shot. All five images are rendered from
 * the same STL at the same camera, so the only thing that changes between
 * them is the colour — which is the point of a picker, and also why it is
 * worth rendering rather than photographing: five photographs taken on five
 * days would differ in a dozen ways and the comparison would be worthless.
 *
 * Every shot is a render and says so. The films and the desk photographs are
 * the only real footage on this page and they keep that claim to themselves.
 */

export default function Colourways() {
  const [active, setActive] = useState(0)
  const shell = SHELLS[active]

  return (
    <section className="wrap-wide" style={{ paddingBlock: 'var(--section-y)' }}>
      <div className="grid gap-10 lg:gap-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] items-center">
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: 'var(--radius-tile)',
            border: '1px solid var(--line-soft)',
            background: '#050505',
          }}
        >
          {/* All five stay mounted and cross-fade. Swapping the src would
              show a blank frame on every click while the next one decodes. */}
          {SHELLS.map((s, i) => (
            <Image
              key={s.id}
              src={`/media/shots/shell-${s.id}.webp`}
              alt={`Pebble-chan with a ${s.name} shell`}
              width={1600}
              height={1200}
              priority={i === 0}
              sizes="(max-width: 1024px) 94vw, 700px"
              className={i === 0 ? 'w-full h-auto block' : 'absolute inset-0 w-full h-auto'}
              style={{ opacity: i === active ? 1 : 0, transition: 'opacity 320ms ease' }}
            />
          ))}
          <span
            className="t-mono absolute right-3 bottom-3 px-2 py-1 text-[10px] uppercase"
            style={{
              borderRadius: 999, background: 'rgba(5,5,5,.72)',
              border: '1px solid var(--line)', color: 'var(--muted-2)', letterSpacing: '.12em',
            }}
          >
            render
          </span>
        </div>

        <div>
          <p className="t-label m-0 mb-4 flex items-center gap-2.5">
            <span aria-hidden="true" style={{ width: 8, height: 8, background: 'var(--signal)' }} />
            One robot, five shells
          </p>
          <h2 className="t-display m-0 mb-5" style={{ fontSize: 'var(--t-h2)' }}>
            Pick a colour.
          </h2>
          <p className="m-0 mb-8 max-w-[40ch] text-[var(--muted)]"
             style={{ fontSize: 'var(--t-lead)', lineHeight: 'var(--lh-body)' }}>
            The shell is printed, so the colour is a spool change rather than a
            tooling run. Same robot, same price, whichever you choose.
          </p>

          <div role="radiogroup" aria-label="Shell colour"
               className="inline-flex items-center gap-2.5 p-2.5"
               style={{ borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)' }}>
            {SHELLS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={i === active}
                aria-label={s.name}
                onClick={() => setActive(i)}
                className="block cursor-pointer"
                style={{
                  width: 26, height: 26, borderRadius: 999, background: s.hex,
                  // The ring is the selection, drawn outside the swatch so it
                  // never changes the colour being judged.
                  outline: i === active ? '2px solid var(--ink)' : '1px solid rgba(255,255,255,.22)',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
          <p className="t-mono text-[12.5px] mt-4 mb-0" style={{ color: 'var(--muted-2)' }}>
            {shell.name}
          </p>
        </div>
      </div>
    </section>
  )
}
