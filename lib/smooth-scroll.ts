'use client'

import { animate } from 'motion/react'

/**
 * Smooth scrolling to a section, done in script rather than with CSS.
 *
 * `scroll-behavior: smooth` was tried on this site and dropped: WebKit
 * cancels a smooth scroll when the layout shifts mid-way, and this page
 * shifts while its 3D scenes and media settle, so on iOS a nav link changed
 * the hash and moved nothing. Here the destination is measured again on
 * every frame, so a section that moves while the page scrolls is still
 * where the scroll ends — and a layout shift cannot cancel anything.
 *
 * With reduced motion it jumps, as a plain anchor would.
 */
let running: { stop: () => void } | null = null

function targetY(el: HTMLElement) {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  const max = document.documentElement.scrollHeight - window.innerHeight
  return Math.max(0, Math.min(max, el.getBoundingClientRect().top + window.scrollY - margin))
}

export function smoothScrollTo(id: string, { updateHash = true } = {}) {
  const el = document.getElementById(id)
  if (!el) return
  running?.stop()
  if (updateHash) history.replaceState(null, '', `#${id}`)
  const done = () => window.dispatchEvent(new HashChangeEvent('hashchange'))

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, targetY(el))
    done()
    return
  }

  const from = window.scrollY
  const distance = Math.abs(targetY(el) - from)
  // Long jumps take a little longer, but never drag.
  const duration = Math.min(1.1, 0.45 + distance / 6000)
  running = animate(0, 1, {
    duration,
    ease: [0.65, 0, 0.35, 1],
    onUpdate: (p) => window.scrollTo(0, from + (targetY(el) - from) * p),
    onComplete: () => { running = null; window.scrollTo(0, targetY(el)); done() },
  })

  // A wheel, a touch or a key from the visitor takes over at once.
  const cancel = () => { running?.stop(); running = null; off() }
  const off = () => {
    window.removeEventListener('wheel', cancel)
    window.removeEventListener('touchstart', cancel)
    window.removeEventListener('keydown', cancel)
  }
  window.addEventListener('wheel', cancel, { passive: true, once: true })
  window.addEventListener('touchstart', cancel, { passive: true, once: true })
  window.addEventListener('keydown', cancel, { once: true })
}

/**
 * Every in-page link on the site scrolls smoothly: one listener, so no link
 * can be forgotten. Modified clicks (new tab, etc.) are left alone.
 */
export function installSmoothAnchors(): () => void {
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null
    if (!a) return
    const id = a.getAttribute('href')!.slice(1)
    if (!id || !document.getElementById(id)) return
    e.preventDefault()
    smoothScrollTo(id)
  }
  document.addEventListener('click', onClick)
  return () => document.removeEventListener('click', onClick)
}
