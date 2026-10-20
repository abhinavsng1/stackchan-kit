'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { ScreenDraw } from '@/lib/live-robot'
import { happy, listening, rain, thinking, timer } from '@/lib/assistant-screens'
import { canSpeak, speakLine, stopSpeaking, warmLines } from '@/lib/voice'
import { EASE } from '@/components/site/motion'
import { EV, measure } from '@/lib/analytics'

/** What the conversation needs from the live robot. */
export type Screen = { setScreen: (draw: ScreenDraw | null) => void; nod: () => void }

type Who = 'you' | 'pebble'
type Step = {
  who: Who | null
  text?: string
  /** Pebble is working it out: the question stays up while its face thinks. */
  think?: boolean
  screen: () => ScreenDraw
  /** The least time the step is on screen; a spoken answer can hold it longer. */
  ms: number
  /** For the mood readout under the robot. */
  label: string
}

const ASK_TIMER = 'Hey Pebble, set a timer for 5 minutes.'
const ASK_RAIN = 'Will it rain today?'

/**
 * Two things people ask it, played over the hero robot: a timer, which it
 * shows counting down on its face, and the weather, which it shows as rain
 * over an umbrella. Showing it help says what it is faster than a sentence
 * about it could.
 */
const SCRIPT: Step[] = [
  { who: 'you', text: ASK_TIMER, screen: listening, ms: 2800, label: 'Listening' },
  { who: 'you', text: ASK_TIMER, think: true, screen: thinking, ms: 1400, label: 'Thinking' },
  { who: 'pebble', text: 'On it! Five minutes, starting now!', screen: () => timer(5), ms: 4800, label: 'Timer: 5 minutes' },
  { who: 'you', text: ASK_RAIN, screen: listening, ms: 2300, label: 'Listening' },
  { who: 'you', text: ASK_RAIN, think: true, screen: thinking, ms: 1400, label: 'Thinking' },
  { who: 'pebble', text: 'Ooh, it’ll rain this evening!\nDon’t forget your umbrella!', screen: rain, ms: 5600, label: 'Checking the weather' },
  { who: null, screen: happy, ms: 2600, label: 'Happy to help' },
]
/** Said the moment the voice is turned on, from the tap itself: iOS only lets a page speak from a tap. */
const HELLO: Step = { who: 'pebble', text: 'Hi! I’m Pebble!', screen: happy, ms: 1700, label: 'Happy to help' }
const LAST_ANSWER = SCRIPT.length - 2
/** A tap on the robot is somebody playing with it: step aside for a while. */
const STEP_ASIDE_MS = 8000

export default function HeroConversation({ robot, live, pokes, onState }: {
  robot: React.RefObject<Screen | null>
  live: boolean
  /** Counts taps on the robot. */
  pokes: number
  onState: (label: string | null) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<Step | null>(null)
  const [inView, setInView] = useState(false)
  const [shown, setShown] = useState(true)
  const [resting, setResting] = useState(false)
  const [voice, setVoice] = useState(false)
  const voiceOn = useRef(false)
  const [restarts, setRestarts] = useState(0)
  const greet = useRef(false)
  const [speakable, setSpeakable] = useState(false)
  const [talking, setTalking] = useState(false)
  const [reduced, setReduced] = useState(false)
  const first = useRef(true)
  const current = useRef<ScreenDraw | null>(null)

  useEffect(() => {
    setSpeakable(canSpeak())
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    const vis = () => setShown(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', vis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis) }
  }, [])

  useEffect(() => {
    if (!pokes) return
    setResting(true)
    const id = setTimeout(() => setResting(false), STEP_ASIDE_MS)
    return () => clearTimeout(id)
  }, [pokes])

  // The live robot can arrive mid-step; show it what it should be showing.
  useEffect(() => { if (live) robot.current?.setScreen(current.current) }, [live, robot])

  const running = inView && shown && !resting
  useEffect(() => {
    if (!running) return
    let alive = true
    let speaking = false
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const wait = (ms: number) => new Promise<void>((done) => {
      const id = setTimeout(() => { timers.delete(id); done() }, ms)
      timers.add(id)
    })
    const show = (s: Step) => {
      const draw = s.screen()
      current.current = draw
      robot.current?.setScreen(draw)
      if (s.who === 'pebble') robot.current?.nod()
      setStep(s)
      onState(s.label)
    }
    const play = async (s: Step, speak: boolean) => {
      show(s)
      // Both sides are heard: the question as it is asked (not again while
      // Pebble thinks it over), then Pebble's answer.
      const said = speak && s.text && !s.think && voiceOn.current
        ? new Promise<void>((done) => {
          const end = () => { speaking = false; setTalking(false); done() }
          speaking = speakLine(s.text!.replace(/\n/g, ' '), { start: () => setTalking(true), end })
          if (!speaking) done()
          // A browser that never reports the end must not stop the show.
          else void wait(1500 + s.text!.length * 110).then(end)
        })
        : Promise.resolve()
      await Promise.all([wait(s.ms), said])
    }
    void (async () => {
      const hello = greet.current
      greet.current = false
      if (hello) await play(HELLO, false)
      else await wait(first.current ? 1600 : 400)
      first.current = false
      for (let i = 0; alive; i = (i + 1) % SCRIPT.length) {
        await play(SCRIPT[i], true)
        // Asked for less motion: once through, then it rests on the answer.
        if (reduced && i === LAST_ANSWER) return
      }
    })()
    return () => {
      alive = false
      timers.forEach(clearTimeout)
      if (speaking) stopSpeaking()
      setTalking(false)
      current.current = null
      robot.current?.setScreen(null)
      setStep(null)
      onState(null)
    }
  }, [running, restarts, reduced, robot, onState])

  const toggle = () => {
    const on = !voiceOn.current
    voiceOn.current = on
    setVoice(on)
    measure(EV.heroVoice, { on })
    if (!on) { stopSpeaking(); setTalking(false); return }
    // Speak from inside the tap, then start the conversation over so it is heard from the top.
    speakLine(HELLO.text!)
    warmLines(SCRIPT.flatMap((s) => (s.text && !s.think ? [s.text] : [])))
    greet.current = true
    setResting(false)
    setRestarts((n) => n + 1)
  }

  // On the still picture the face cannot think, so the bubble does it.
  const typing = Boolean(step?.think && !live)
  const who = typing ? 'pebble' : step?.who
  const key = typing ? 'typing' : `${step?.who}:${step?.text}`

  return (
    <>
      <div ref={box} className="hero-chat" aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          {step && who && (
            <motion.p key={key} className={`hero-bubble hero-bubble-${who}`}
                      initial={reduced ? false : { opacity: 0, y: 10, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.38, ease: EASE }}>
              {typing ? <span className="hero-typing"><i /><i /><i /></span> : step.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <p className="sr-only">
        Someone asks PebbleRobo to set a five-minute timer, and a countdown appears on its face.
        Then they ask whether it will rain today; it shows rain over an umbrella and says it will
        rain this evening, so don’t forget an umbrella.
      </p>
      {speakable && (
        <button type="button" className="hero-mic" aria-pressed={voice} data-talking={talking}
                aria-label="Voices in the conversation" onClick={toggle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
               strokeLinejoin="round" aria-hidden="true">
            {voice ? (
              <>
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <path d="M12 19v3" />
              </>
            ) : (
              <>
                <path d="m2 2 20 20" />
                <path d="M18.89 13.23A7 7 0 0 0 19 12v-2" />
                <path d="M5 10v2a7 7 0 0 0 12 5" />
                <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                <path d="M12 19v3" />
              </>
            )}
          </svg>
          <span>{voice ? 'Sound on' : 'Hear Pebble'}</span>
        </button>
      )}
    </>
  )
}
