'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { useLiveScene } from '@/components/site/useLiveScene'
import ShellPicker from '@/components/site/ShellPicker'
import { EASE } from '@/components/site/motion'
import { MODES, EXPRESSIONS, TOUCHES, CUSTOM_FACES, STATUS_LABEL, type Mode, type Step } from '@/lib/demo-modes'
import { MOODS } from '@/lib/companion-face'
import { shellById } from '@/lib/shells'
import { useShell } from '@/lib/shell-store'
import { rendered } from '@/lib/renders'
import { EV, track } from '@/lib/analytics'
import type { Demo } from '@/lib/live-demo'

/**
 * "What it does": every capability, demonstrated by one live robot rather
 * than described in a grid of cards.
 *
 * Pick a mode and the robot does it — follows you, holds a conversation,
 * pulls a face, moves, reacts to touch, takes orders from a phone, or wears a
 * custom face. The words and scripts live in lib/demo-modes.ts; the robot's
 * movement in lib/live-demo.ts; this file only connects the two.
 *
 * Without WebGL, with reduced motion or Save-Data, the robot is its render
 * and every mode still says what it does: scripts are shown in full, so no
 * information lives only in an animation.
 */
type Line = { who: 'you' | 'robot' | 'note'; text: string; key: string }

export default function DemoStage({ initial = 'meet' }: { initial?: string }) {
  const [modeId, setModeId] = useState(initial)
  const mode = MODES.find((m) => m.id === modeId) ?? MODES[0]
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<Demo | null>(null)
  const shellId = useShell()
  const [lines, setLines] = useState<Line[]>([])
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const live = useLiveScene(host, async (el) => {
    const { startDemo } = await import('@/lib/live-demo')
    const demo = await startDemo(el, { shell: shellById(shellId) })
    api.current = demo
    return { dispose: () => { api.current = null; demo.dispose() } }
  })

  // The colour follows every other picker on the page.
  useEffect(() => { api.current?.setShell(shellById(shellId)) }, [shellId, live])

  // Another section can ask for a mode: "Try it" links dispatch this.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (MODES.some((m) => m.id === id)) setModeId(id)
    }
    window.addEventListener('pebble:demo', onAsk)
    return () => window.removeEventListener('pebble:demo', onAsk)
  }, [])

  /* --------------------------- running a script --------------------------- */

  useEffect(() => {
    const d = api.current
    d?.onTap(null)
    d?.hush()
    setLines([])
    if (!mode.script) {
      // Modes without a script start from a friendly, level pose.
      d?.look(0, 8)
      d?.mood(mode.id === 'yours' ? 'heart' : mode.id === 'touch' ? 'awake' : 'happy')
      return
    }

    // Reduced motion, or no robot yet: the whole exchange, still.
    if (reduce || !live) {
      setLines(scriptLines(mode.script, 'static'))
      return
    }

    let timers: ReturnType<typeof setTimeout>[] = []
    let round = 0
    const run = () => {
      round++
      setLines([])
      for (const step of mode.script!) {
        timers.push(setTimeout(() => apply(step, api.current, setLines, round), step.at * 1000))
      }
      if (mode.loop) timers.push(setTimeout(run, mode.loop * 1000))
    }
    run()
    return () => { for (const t of timers) clearTimeout(t); timers = [] }
  }, [mode, live, reduce])

  const choose = (m: Mode) => {
    if (m.id === modeId) return
    setModeId(m.id)
    track(EV.demoModeChosen, { mode: m.id })
  }

  return (
    <div className="demo-fill">
      {/* The modes: every one visible at once — a grid of short chips on a
          phone, one row on a wide screen. Nothing hides off to the side. */}
      <div role="tablist" aria-label="What it does"
           className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap mb-3 sm:mb-5">
        {MODES.map((m) => {
          const on = m.id === modeId
          return (
            <button key={m.id} role="tab" type="button" aria-selected={on} aria-controls="demo-panel"
                    id={`demo-tab-${m.id}`} onClick={() => choose(m)}
                    className="demo-tab shrink-0 cursor-pointer" data-on={on}>
              <span className="sm:hidden">{m.short}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          )
        })}
      </div>

      <div id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${modeId}`}
           className="demo-panel grid lg:grid-cols-12 gap-x-10 gap-y-3 sm:gap-y-6 items-stretch">
        {/* The stage. Its height is held inside the window on a wide screen,
            so the robot, the tabs and the words are all in view at once;
            taller on a phone, so the conversation has room. */}
        <div className="lg:col-span-8 min-w-0 demo-stage-col">
          <div className="media demo-screen" style={{ background: 'var(--stage-2)' }}>
            <Image src={rendered(`/media/shots/float-shell-${shellId}.webp`)} fill
                   sizes="(max-width: 1024px) 92vw, 820px" alt={`PebbleRobo in ${shellById(shellId).name}`}
                   className="object-contain p-[6%]"
                   style={{ opacity: live ? 0 : 1, transition: 'opacity 600ms var(--ease)' }} />
            <div ref={host} className="absolute inset-0" data-testid="demo-robot" />

            <span className="absolute left-4 top-4 t-mono text-[11px] px-2 py-1 rounded"
                  style={{ background: 'rgba(255,255,255,.08)', color: 'var(--stage-ink)' }}>
              {STATUS_LABEL[mode.status]}
            </span>
            {!live && <span className="tag absolute right-4 top-4">Render</span>}


            {/* The conversation, over the floor of the stage. */}
            {lines.length > 0 && (
              <div className="absolute inset-x-0 bottom-0 px-4 sm:px-6 pb-4 sm:pb-5 pt-16 pointer-events-none"
                   style={{ background: 'linear-gradient(to top, var(--stage-2) 10%, transparent)' }}>
                <ol className="list-none p-0 m-0 grid gap-2" aria-live="polite">
                  <AnimatePresence initial={false} mode="popLayout">
                    {/* Playing: the latest few lines. Still (no robot, or less motion):
                        the opening exchange, so the conversation reads from its start. */}
                    {(live && !reduce ? lines.slice(-4) : lines.slice(0, 4)).map((l) => (
                      <motion.li key={l.key} layout
                                 initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, transition: { duration: 0.2 } }}
                                 transition={{ duration: 0.4, ease: EASE }}
                                 className={l.who === 'you' ? 'justify-self-end' : 'justify-self-start'}>
                        <Bubble line={l} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* The words for this mode, and its controls. Swapped at once and
            faded in — never held back waiting for the old ones to leave, so
            the text can never be left showing the previous mode. */}
        <motion.div key={mode.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="lg:col-span-4 flex flex-col gap-3 sm:gap-5 lg:justify-center">
          <div>
            <h3 className="t-display t-h3 m-0">{mode.title}</h3>
            <p className="text-[15px] sm:text-[16px] leading-[1.5] sm:leading-[1.6] text-[var(--muted)] mt-2 sm:mt-3 mb-0 max-w-[44ch]">{mode.body}</p>
            {/* On a phone the video-call note moves into the panel's own header. */}
            {mode.fine && <p className={`t-mono text-[10.5px] sm:text-[11.5px] text-[var(--muted-2)] mt-2 sm:mt-3 mb-0 ${mode.id === 'call' ? 'hidden sm:block' : ''}`}>{mode.fine}</p>}
          </div>
          <Controls mode={mode} api={api} live={live} />
        </motion.div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

function apply(step: Step, d: Demo | null, setLines: React.Dispatch<React.SetStateAction<Line[]>>, round: number) {
  const key = `${round}-${step.at}`
  if ('you' in step) setLines((l) => [...l, { who: 'you', text: step.you, key: `${key}-y` }])
  else if ('robot' in step) { setLines((l) => [...l, { who: 'robot', text: step.robot, key: `${key}-r` }]); d?.say(step.for) }
  else if ('note' in step) setLines((l) => [...l, { who: 'note', text: step.note, key: `${key}-n` }])
  else if ('mood' in step) d?.mood(step.mood)
  else if ('look' in step) d?.look(step.look[0], step.look[1])
  else if ('nod' in step) d?.nod(step.nod)
  else if ('shake' in step) d?.shake()
  else if ('follow' in step) d?.follow(true)
}

function scriptLines(script: Step[], prefix: string): Line[] {
  return script.flatMap((s, i): Line[] =>
    'you' in s ? [{ who: 'you' as const, text: s.you, key: `${prefix}${i}` }]
      : 'robot' in s ? [{ who: 'robot' as const, text: s.robot, key: `${prefix}${i}` }]
      : 'note' in s ? [{ who: 'note' as const, text: s.note, key: `${prefix}${i}` }] : [])
}

function Bubble({ line }: { line: Line }) {
  if (line.who === 'note') {
    return (
      <span className="t-mono text-[12px] flex items-center gap-2 py-0.5" style={{ color: 'var(--stage-ink)' }}>
        <span className="inline-block w-4 h-px" style={{ background: 'var(--accent)' }} aria-hidden="true" />
        {line.text}
      </span>
    )
  }
  return (
    <span className="inline-block px-3.5 py-2 text-[14.5px] sm:text-[15.5px] leading-snug max-w-[30ch]"
          style={line.who === 'you'
            ? { background: 'var(--stage-ink)', color: 'var(--stage)', borderRadius: '16px 16px 4px 16px' }
            : { background: 'rgba(255,255,255,.1)', color: 'var(--stage-ink)', border: '1px solid var(--stage-line)', borderRadius: '16px 16px 16px 4px' }}>
      <span className="sr-only">{line.who === 'you' ? 'You: ' : 'PebbleRobo: '}</span>
      {line.text}
    </span>
  )
}

/* ------------------------------ the controls ------------------------------ */

function Controls({ mode, api, live }: { mode: Mode; api: React.RefObject<Demo | null>; live: boolean }) {
  if (mode.id === 'faces') return <FacePicker api={api} live={live} />
  if (mode.id === 'touch') return <TouchPad api={api} live={live} />
  if (mode.id === 'call') return <PhonePanel api={api} />
  if (mode.id === 'yours') return <Customise api={api} />
  return null
}

function Chip({ on, onClick, children }: { on?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
            className="demo-chip cursor-pointer" data-on={Boolean(on)}>
      {children}
    </button>
  )
}

function FacePicker({ api, live }: { api: React.RefObject<Demo | null>; live: boolean }) {
  const [face, setFace] = useState(EXPRESSIONS[0].id)
  const [auto, setAuto] = useState(true)
  const show = useCallback((id: string) => {
    const e = EXPRESSIONS.find((x) => x.id === id)!
    setFace(id)
    const d = api.current
    d?.mood(id); d?.look(e.look[0], e.look[1])
    if (e.gesture === 'nod') d?.nod(2)
    if (e.gesture === 'shake') d?.shake()
  }, [api])

  // Until someone picks one, it cycles through them by itself.
  useEffect(() => {
    if (!auto || !live) return
    let i = 0
    show(EXPRESSIONS[0].id)
    const id = setInterval(() => { i = (i + 1) % EXPRESSIONS.length; show(EXPRESSIONS[i].id) }, 2400)
    return () => clearInterval(id)
  }, [auto, live, show])

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Faces">
      {EXPRESSIONS.map((e) => (
        <Chip key={e.id} on={face === e.id} onClick={() => { setAuto(false); show(e.id) }}>{e.label}</Chip>
      ))}
    </div>
  )
}

function TouchPad({ api, live }: { api: React.RefObject<Demo | null>; live: boolean }) {
  const [last, setLast] = useState<string | null>(null)
  const touch = useCallback((id: string) => {
    const t = TOUCHES.find((x) => x.id === id)!
    setLast(id)
    const d = api.current
    d?.mood(t.mood); d?.look(t.look[0], t.look[1])
    if (t.gesture === 'nod') d?.nod(2)
    if (t.gesture === 'shake') d?.shake()
  }, [api])
  // Tapping the robot itself is tapping its screen.
  useEffect(() => {
    if (!live) return
    api.current?.onTap(() => touch('screen'))
    return () => api.current?.onTap(null)
  }, [api, live, touch])
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Touch">
      {TOUCHES.map((t) => <Chip key={t.id} on={last === t.id} onClick={() => touch(t.id)}>{t.label}</Chip>)}
    </div>
  )
}

/** A stand-in for the companion app: a joystick for the head and a row of faces. */
function PhonePanel({ api }: { api: React.RefObject<Demo | null> }) {
  const pad = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [face, setFace] = useState('happy')
  const drag = useRef(false)

  const steer = (clientX: number, clientY: number) => {
    const r = pad.current!.getBoundingClientRect()
    let x = ((clientX - r.left) / r.width) * 2 - 1
    let y = ((clientY - r.top) / r.height) * 2 - 1
    const m = Math.hypot(x, y)
    if (m > 1) { x /= m; y /= m }
    setKnob({ x, y })
    // Up on the pad is up for the head; the hinge does not go below level.
    api.current?.look(x * 55, Math.max(0, -y) * 30)
  }
  const keys = (e: React.KeyboardEvent) => {
    const d = { ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, -0.25], ArrowDown: [0, 0.25] }[e.key]
    if (!d) return
    e.preventDefault()
    const x = Math.max(-1, Math.min(1, knob.x + d[0])), y = Math.max(-1, Math.min(1, knob.y + d[1]))
    setKnob({ x, y })
    api.current?.look(x * 55, Math.max(0, -y) * 30)
  }

  return (
    <div className="phone-panel" aria-label="Companion app, simulated">
      <div className="flex items-center justify-between mb-3">
        <span className="t-mono text-[11px]" style={{ color: 'var(--stage-muted)' }}>
          Video call · PebbleRobo<span className="sm:hidden"> · simulated</span>
        </span>
        <span className="live-dot" aria-hidden="true" />
      </div>
      <p className="t-mono text-[10.5px] m-0 mb-2" style={{ color: 'var(--stage-muted)' }}>Drag to look around</p>
      <div ref={pad} className="joy" tabIndex={0} role="slider" aria-label="Turn its head"
           aria-valuetext={`pan ${Math.round(knob.x * 55)} degrees, tilt ${Math.round(Math.max(0, -knob.y) * 30)} degrees`}
           onKeyDown={keys}
           onPointerDown={(e) => { drag.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); steer(e.clientX, e.clientY) }}
           onPointerMove={(e) => { if (drag.current) steer(e.clientX, e.clientY) }}
           onPointerUp={() => { drag.current = false }}
           onPointerCancel={() => { drag.current = false }}>
        <span className="joy-knob" style={{ transform: `translate(${knob.x * 34}px, ${knob.y * 34}px)` }} />
      </div>
      <div className="flex gap-1.5 mt-3" role="group" aria-label="Its face">
        {['happy', 'surprised', 'sleepy'].map((id) => (
          <button key={id} type="button" aria-pressed={face === id}
                  onClick={() => { setFace(id); api.current?.mood(id) }}
                  className="demo-chip demo-chip-sm cursor-pointer" data-on={face === id}>
            {MOODS.find((m) => m.id === id)?.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function Customise({ api }: { api: React.RefObject<Demo | null> }) {
  const [face, setFace] = useState<string>('heart')
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Custom faces">
        {CUSTOM_FACES.map((id) => (
          <Chip key={id} on={face === id} onClick={() => { setFace(id); api.current?.mood(id); api.current?.nod(1) }}>
            {MOODS.find((m) => m.id === id)?.name}
          </Chip>
        ))}
      </div>
      <ShellPicker location="demo" size={20} label={false} />
    </div>
  )
}
