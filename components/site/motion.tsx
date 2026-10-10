'use client'

import { useEffect } from 'react'
import { MotionConfig, motion, useReducedMotion, type Variants } from 'motion/react'
import { installSmoothAnchors } from '@/lib/smooth-scroll'

/**
 * The page's motion vocabulary. Every animated thing on the site is built from
 * these, so timing and easing stay one system rather than forty opinions.
 *
 * - One ease, the same curve as --ease in globals.css.
 * - Only transform and opacity, so nothing triggers layout.
 * - `reducedMotion="user"` on the root: when the visitor has asked for less
 *   motion, transforms are dropped and only opacity fades remain, so the page
 *   still arrives gracefully rather than snapping.
 * - Reveals fire once. Content that re-hides when you scroll back up makes a
 *   page feel unstable.
 */
export const EASE = [0.22, 1, 0.36, 1] as const

export function MotionRoot({ children }: { children: React.ReactNode }) {
  // Every in-page link scrolls smoothly (lib/smooth-scroll.ts).
  useEffect(() => installSmoothAnchors(), [])
  return <MotionConfig reducedMotion="user" transition={{ ease: EASE }}>{children}</MotionConfig>
}

const VIEW = { once: true, margin: '0px 0px -12% 0px' } as const

/** Fades and rises into place the first time it scrolls into view. */
export function Reveal({
  children, delay = 0, y = 28, className, as = 'div', duration = 0.7,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'p' | 'figure' | 'span' | 'article'
  duration?: number
}) {
  const M = motion[as]
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEW}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </M>
  )
}

const group: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

/** A group whose children arrive one after another. */
export function Stagger({
  children, className, as = 'div', gap = 0.08,
}: { children: React.ReactNode; className?: string; as?: 'div' | 'ul' | 'ol' | 'dl'; gap?: number }) {
  const M = motion[as]
  return (
    <M className={className} initial="hidden" whileInView="shown" viewport={VIEW}
       variants={{ ...group, shown: { transition: { staggerChildren: gap } } }}>
      {children}
    </M>
  )
}

export function StaggerItem({
  children, className, as = 'div',
}: { children: React.ReactNode; className?: string; as?: 'div' | 'li' | 'article' | 'figure' }) {
  const M = motion[as]
  return <M className={className} variants={item}>{children}</M>
}

/**
 * A headline that rises in word by word from behind a mask.
 *
 * The words are real text in the DOM — readable, selectable, indexed — and
 * each sits in its own clipped box so it appears to come up from a baseline
 * rather than fade from nowhere. `accent` words are drawn in Ember.
 */
export function SplitHeadline({
  text, className, as = 'h2', accent = [], delay = 0, immediate = false,
}: {
  text: string
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'p'
  accent?: string[]
  delay?: number
  /** Animate on mount rather than on scroll — for the hero. */
  immediate?: boolean
}) {
  const reduce = useReducedMotion()
  const M = motion[as]
  const lines = text.split('\n')
  const trigger = immediate
    ? { animate: 'shown' as const }
    : { whileInView: 'shown' as const, viewport: VIEW }

  return (
    <M className={className} initial="hidden" {...trigger}
       variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.055, delayChildren: delay } } }}
       aria-label={text.replace(/\n/g, ' ')}>
      {lines.map((line, li) => (
        <span key={li} className="block" aria-hidden="true">
          {line.split(' ').map((word, wi, words) => {
            const isAccent = accent.includes(word.replace(/[.,!?]/g, ''))
            return (
              <span key={`${li}-${wi}`} className="inline-block overflow-hidden align-bottom"
                    style={{ paddingBottom: '0.08em', marginBottom: '-0.08em' }}>
                <motion.span
                  className={`inline-block ${isAccent ? 'accent' : ''}`}
                  variants={{
                    hidden: reduce ? { opacity: 0 } : { y: '105%' },
                    shown: reduce
                      ? { opacity: 1, transition: { duration: 0.5 } }
                      : { y: '0%', transition: { duration: 0.9, ease: EASE } },
                  }}
                >
                  {word}
                </motion.span>
                {wi < words.length - 1 ? ' ' : ''}
              </span>
            )
          })}
        </span>
      ))}
    </M>
  )
}
