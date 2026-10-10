'use client'

import { useRef } from 'react'
import { SHELLS, shellById } from '@/lib/shells'
import { setShell, useShell } from '@/lib/shell-store'
import Swatch from '@/components/site/Swatch'
import { EV, track } from '@/lib/analytics'

/**
 * The colour picker, wherever a colour is chosen: the hero, the explorer and
 * the buy box. All of them read and write lib/shell-store.ts, so picking in
 * one picks in all — and in the order form.
 *
 * A real radio group: one tab stop, arrow keys move the choice, and the
 * selection ring sits outside the swatch so it never tints the colour being
 * judged.
 */
export default function ShellPicker({
  size = 24, label = true, location, className = '',
}: {
  size?: number
  /** Show the chosen colour's name beside the swatches. */
  label?: boolean | 'below'
  /** For analytics: which copy of the picker was used. */
  location: string
  className?: string
}) {
  const shell = useShell()
  const group = useRef<HTMLDivElement>(null)
  const index = Math.max(0, SHELLS.findIndex((s) => s.id === shell))

  const choose = (id: string) => {
    if (id === shell) return
    setShell(id)
    track(EV.colourChosen, { shell: id, location })
  }

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = SHELLS[(index + step + SHELLS.length) % SHELLS.length]
    choose(next.id)
    // Focus follows the choice, as in any radio group.
    requestAnimationFrame(() => group.current?.querySelector<HTMLButtonElement>(`[data-shell="${next.id}"]`)?.focus())
  }

  const name = shellById(shell).name

  return (
    <div className={`flex items-center gap-3 ${label === 'below' ? 'flex-col items-start' : ''} ${className}`}>
      {label === true && (
        <span className="t-mono text-[12px] text-[var(--muted)] min-w-[64px] text-right hidden sm:inline" aria-hidden="true">
          {name}
        </span>
      )}
      <div ref={group} role="radiogroup" aria-label="Colour" onKeyDown={onKey} className="flex items-center gap-2.5">
        {SHELLS.map((s) => {
          const on = s.id === shell
          return (
            <button
              key={s.id} type="button" role="radio" data-shell={s.id}
              aria-checked={on} aria-label={s.name} title={s.name}
              tabIndex={on ? 0 : -1}
              onClick={() => choose(s.id)}
              className="grid place-items-center rounded-full cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
              style={{
                // A comfortable tap target round a small swatch.
                width: Math.max(32, size + 10), height: Math.max(32, size + 10),
                outline: on ? '1.5px solid var(--ink)' : '1.5px solid transparent',
                outlineOffset: -2,
              }}
            >
              <Swatch way={s} size={size} />
            </button>
          )
        })}
      </div>
      {label === 'below' && (
        <span className="t-mono text-[12px] text-[var(--muted)]" aria-live="polite">{name}</span>
      )}
    </div>
  )
}
