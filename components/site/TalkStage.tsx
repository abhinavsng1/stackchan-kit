'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EASE } from '@/components/site/motion'
import { CHAT_LOOP, EXCHANGE_STARTS, SCRIPT, type Line } from '@/lib/talk-script'

/**
 * "Talk to it" on a phone: the robot and the conversation in one card.
 *
 * On a desktop the exchange and the robot sit side by side and both are in
 * view at once. Stacked on a phone, the chat scrolled past before the robot
 * came into view, so nobody saw it react. Here the robot plays in the top of
 * a stage card and the conversation lands over the bottom of it, line by line,
 * timed to the loop (lib/talk-script.ts): it turns when it hears its name and
 * its mouth moves under its own answer. One exchange shows at a time.
 *
 * Like every clip, nothing downloads until the card is near, it only plays
 * while on screen, and with reduced motion it is the still and the whole
 * conversation, static.
 */
export default function TalkStage() {
  const video = useRef<HTMLVideoElement>(null)
  const [near, setNear] = useState(false)
  const [shown, setShown] = useState(0)
  const [still, setStill] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const el = video.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setStill(true); return }
    const load = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); load.disconnect() } }, { rootMargin: '400px' })
    if (near) el.load()
    const play = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) void el.play().catch(() => {})
      else if (!el.paused) el.pause()
    }, { threshold: 0.35 })
    load.observe(el)
    play.observe(el)

    // Lines follow the video's own clock, so they stay on cue through a
    // stall, a seek or the loop wrapping round.
    let frame = 0
    const follow = () => {
      frame = requestAnimationFrame(follow)
      const t = el.currentTime % CHAT_LOOP
      let n = 0
      while (n < SCRIPT.length && SCRIPT[n].at <= t) n++
      setShown((s) => (s === n ? s : n))
    }
    frame = requestAnimationFrame(follow)
    return () => { load.disconnect(); play.disconnect(); cancelAnimationFrame(frame) }
  }, [near])

  // The exchange in progress: from the last thing you said up to now. Not
  // playing — not loaded yet, or autoplay refused, as in Low Power Mode — the
  // first exchange stands still over the poster rather than an empty floor.
  const start = [...EXCHANGE_STARTS].reverse().find((i) => i < shown) ?? 0
  const lines = playing ? SCRIPT.slice(start, shown) : SCRIPT.slice(0, EXCHANGE_STARTS[1] ?? SCRIPT.length)

  return (
    <figure className="m-0">
      <div className="media" style={{ aspectRatio: '4 / 5', background: 'var(--stage)' }}>
        <video
          ref={video}
          className="absolute inset-0 w-full h-full object-cover block"
          poster="/media/render/loop-chat.webp"
          preload="none" muted loop playsInline
          aria-hidden="true"
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          {near && (
            <>
              <source src="/media/render/loop-chat.webm" type="video/webm" />
              <source src="/media/render/loop-chat.mp4" type="video/mp4" />
            </>
          )}
        </video>

        {/* The conversation, over the floor of the stage. */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-20 pointer-events-none"
             style={{ background: 'linear-gradient(to top, var(--stage) 0%, color-mix(in srgb, var(--stage) 86%, transparent) 55%, transparent 100%)' }}>
          <ol className="list-none p-0 m-0 grid gap-2 min-h-[148px] content-end" aria-hidden="true">
            <AnimatePresence initial={false} mode="popLayout">
              {lines.map((line) => (
                <motion.li
                  key={line.text}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className={line.who === 'you' ? 'justify-self-end' : 'justify-self-start'}
                >
                  <Bubble line={line} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </div>

        <span className="tag absolute right-3 top-3">Render</span>
      </div>

      {still && (
        <ol className="list-none p-0 mt-6 mb-0 grid gap-3" aria-hidden="true">
          {SCRIPT.slice(EXCHANGE_STARTS[1] ?? SCRIPT.length).map((line) => (
            <li key={line.text} className={line.who === 'you' ? 'justify-self-end' : 'justify-self-start'}><Bubble line={line} /></li>
          ))}
        </ol>
      )}

      {/* The whole exchange, for screen readers, independent of the timing. */}
      <figcaption className="sr-only">
        An example exchange:{' '}
        {SCRIPT.map((l) => (l.who === 'note' ? `(${l.text}) ` : `${l.who === 'you' ? 'You' : 'PebbleRobo'}: ${l.text} `))}
      </figcaption>
    </figure>
  )
}

function Bubble({ line }: { line: Line }) {
  if (line.who === 'note') {
    return (
      <span className="t-mono text-[11.5px] text-[var(--muted)] flex items-center gap-2 py-0.5">
        <span className="inline-block w-4 h-px" style={{ background: 'var(--accent)' }} />
        {line.text}
      </span>
    )
  }
  return (
    <span className="inline-block px-3.5 py-2 text-[15px] leading-snug"
          style={line.who === 'you'
            ? { background: 'var(--stage-ink)', color: 'var(--stage)', borderRadius: '16px 16px 4px 16px' }
            : { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px 16px 16px 4px' }}>
      {line.text}
    </span>
  )
}
