'use client'

import { useId, useRef, useState } from 'react'
import { CODE_TABS } from '@/lib/code-tabs'

/**
 * The code window.
 *
 * Tabs follow the WAI tablist pattern rather than a row of buttons: arrow
 * keys move between them, Home and End jump to the ends, and only the
 * selected tab is in the tab order, so a keyboard user passes the whole group
 * with one Tab rather than three.
 *
 * The copy button announces through aria-live because the only feedback
 * otherwise is a word changing colour, which a screen reader never mentions.
 */
export default function CodeWindow() {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const base = useId()
  const tab = CODE_TABS[active]

  const onKey = (e: React.KeyboardEvent) => {
    const last = CODE_TABS.length - 1
    const to = e.key === 'ArrowRight' ? (active === last ? 0 : active + 1)
      : e.key === 'ArrowLeft' ? (active === 0 ? last : active - 1)
        : e.key === 'Home' ? 0
          : e.key === 'End' ? last
            : null
    if (to === null) return
    e.preventDefault()
    setActive(to)
    tabs.current[to]?.focus()
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(tab.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // A denied clipboard permission is not worth an error state; the code
      // is selectable and right there.
    }
  }

  return (
    <div className="overflow-hidden"
         style={{ borderRadius: 'var(--radius-card)', border: '1px solid var(--line)',
                  background: 'rgba(255,255,255,.03)' }}>
      <div className="flex items-center gap-1 px-2.5 py-2"
           style={{ borderBottom: '1px solid var(--line)' }}>
        <div role="tablist" aria-label="Code examples" onKeyDown={onKey} className="flex gap-1">
          {CODE_TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => { tabs.current[i] = el }}
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={i === active}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className="t-mono text-[11.5px] px-3 py-1.5 cursor-pointer"
              style={{
                borderRadius: 999,
                border: `1px solid ${i === active ? 'var(--line)' : 'transparent'}`,
                background: i === active ? 'rgba(255,255,255,.06)' : 'transparent',
                color: i === active ? 'var(--ink)' : 'var(--muted-2)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="t-mono text-[10.5px] ml-auto mr-2" style={{ color: 'var(--muted-2)' }}>
          {tab.lang}
        </span>
        <button type="button" onClick={copy}
                className="t-mono text-[11px] px-2.5 py-1.5 cursor-pointer"
                style={{ borderRadius: 999, border: '1px solid var(--line)', color: 'var(--muted)' }}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <span aria-live="polite" className="sr-only">{copied ? 'Copied to clipboard' : ''}</span>
      </div>

      <div role="tabpanel" id={`${base}-panel-${tab.id}`} aria-labelledby={`${base}-tab-${tab.id}`}
           tabIndex={0}>
        <pre className="t-mono text-[12px] leading-[1.95] m-0 px-4 py-4 overflow-x-auto"
             style={{ color: 'rgba(246,246,244,.86)' }}>{tab.code}</pre>
      </div>

      <p className="t-mono m-0 px-4 py-2.5 text-[10.5px]"
         style={{ borderTop: '1px solid var(--line)', color: 'var(--muted-2)' }}>
        from {tab.source}
      </p>
    </div>
  )
}
