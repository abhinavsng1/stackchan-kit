'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FACES } from '@/lib/faces'
import { EV, track } from '@/lib/analytics'
import {
  W, H, newGame, stepGame, type PanelMode, type PanelState,
} from '@/lib/panel'

const Scene = dynamic(() => import('@/components/robot3d/Scene'), { ssr: false })

/**
 * The model as a working device, not a spinning thumbnail.
 *
 * Every capability tile on this page makes a claim and cites the part that
 * provides it. Here the claims are executed rather than illustrated: the audio
 * meter is your microphone, the viewfinder is your camera, the tap ripples
 * where your finger actually landed on the glass, and the game is a game. If
 * we have to fake a demonstration of a device, the device is the problem.
 *
 * Nothing asks for a permission until you pick the capability that needs one,
 * and both streams stop the moment you move away.
 *
 * The controls sit on the frame rather than beside it. On a phone the old
 * arrangement meant scrolling past the robot to press a button and scrolling
 * back to see what it did, which is not a demonstration of anything.
 */

type Demo = {
  id: PanelMode | 'move'
  label: string
  short: string
  mode: PanelMode
  part: string
  call: string
  hint: string
  what: string
  needs?: 'mic' | 'cam'
}

const DEMOS: Demo[] = [
  {
    id: 'face', label: 'It has a face', short: 'Face', mode: 'face',
    part: 'U1 · 2.0" IPS display', call: 'avatar.emote("happy")',
    hint: 'Pick an expression',
    what: 'Twelve expressions ship in the firmware, each drawn at the panel’s own resolution. They cycle on their own until something tells them not to.',
  },
  {
    id: 'move', label: 'It turns to look', short: 'Move', mode: 'face',
    part: 'M1 + M2 · SCS0009', call: 'head.look(pan, tilt)',
    hint: 'Drag the head',
    what: 'Two serial bus servos on one wire. Each reports the angle it actually reached, so your code knows where the head is instead of assuming.',
  },
  {
    id: 'see', label: 'It can see', short: 'See', mode: 'see',
    part: 'U1 · GC0308', call: 'camera.read()', needs: 'cam',
    hint: 'Your camera, on its screen',
    what: 'An onboard camera and a proximity sensor. This demo borrows your webcam so you can watch a live frame land on the panel — on the device it is the GC0308 doing the same job.',
  },
  {
    id: 'hear', label: 'It talks and listens', short: 'Hear', mode: 'hear',
    part: 'U1 · AW88298 + ES7210', call: 'audio.listen()', needs: 'mic',
    hint: 'Say something',
    what: 'Two microphones in on a full-duplex codec, a 1 W speaker out. The bars are your own voice, split into bands the same way the firmware does it.',
  },
  {
    id: 'touch', label: 'You can touch it', short: 'Touch', mode: 'touch',
    part: 'U1 · FT6336U', call: 'screen.onTouch(fn)',
    hint: 'Tap the screen itself',
    what: 'The glass is capacitive, so the face doubles as the interface. The coordinates under the ripple are the real ones — the tap is hit-tested against the panel, not the page.',
  },
  {
    id: 'game', label: 'You can program it', short: 'Game', mode: 'game',
    part: 'U1 · ESP32-S3', call: 'app.run("pong")',
    hint: 'Drag on the glass to play',
    what: 'It is a computer with a screen and a touch controller, so it runs whatever you write. This one is about forty lines. Drag along the glass to move the paddle.',
  },
  {
    id: 'online', label: 'It gets online', short: 'Online', mode: 'online',
    part: 'U1 · ESP32-S3', call: 'wifi.connect(ssid, key)',
    hint: 'Watch it join',
    what: 'Wi-Fi and Bluetooth are on the ESP32-S3. Point it at whichever speech or language API you like — the kit takes no view on that.',
  },
]

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

export default function Playground() {
  const host = useRef<HTMLDivElement>(null)

  // Everything the render loop reads lives in a ref. Putting a microphone
  // level in React state would re-render this tree sixty times a second.
  const panel = useRef<PanelState>({
    mode: 'face', faceId: '', levels: null, video: null,
    ripples: [], notice: null, wifiAt: 0, game: null,
  })

  const [ready, setReady] = useState<'checking' | '3d' | 'photo'>('checking')
  const [active, setActive] = useState<Demo>(DEMOS[0])
  const [face, setFace] = useState<string | null>(null)
  const [angles, setAngles] = useState({ pan: 0, tilt: 0 })
  const [score, setScore] = useState(0)
  const [permission, setPermission] = useState<string | null>(null)

  const media = useRef<{ stream: MediaStream | null; ctx: AudioContext | null }>(
    { stream: null, ctx: null })

  // A megabyte of geometry is not a courtesy on a metered connection, and
  // someone who has asked for less motion has not asked for a spinning robot.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData === true
    setReady(!reduced && !saveData && hasWebGL() ? '3d' : 'photo')
  }, [])

  const onAngles = useCallback((pan: number, tilt: number) => {
    setAngles((a) =>
      Math.abs(a.pan - pan) < 0.5 && Math.abs(a.tilt - tilt) < 0.5 ? a : { pan, tilt })
  }, [])

  /** Drop whichever stream is open. Called on every switch and on unmount. */
  const release = useCallback(() => {
    media.current.stream?.getTracks().forEach((t) => t.stop())
    media.current.stream = null
    media.current.ctx?.close().catch(() => {})
    media.current.ctx = null
    panel.current.levels = null
    panel.current.video = null
  }, [])

  useEffect(() => release, [release])

  /** The microphone, for real. Levels come straight from an AnalyserNode. */
  const openMic = useCallback(async () => {
    panel.current.notice = 'Asking for the microphone…'
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      media.current.stream = stream
      const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctor()
      media.current.ctx = ctx
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 256
      an.smoothingTimeConstant = 0.72
      src.connect(an)
      const bins = new Uint8Array(an.frequencyBinCount)
      const out = new Float32Array(an.frequencyBinCount)
      panel.current.notice = null
      setPermission(null)
      const pump = () => {
        if (media.current.ctx !== ctx) return
        an.getByteFrequencyData(bins)
        for (let i = 0; i < bins.length; i++) out[i] = bins[i] / 255
        panel.current.levels = out
        requestAnimationFrame(pump)
      }
      pump()
      track(EV.galleryViewed, { view: 'demo', demo: 'hear', granted: true })
    } catch {
      panel.current.notice = 'Microphone declined'
      setPermission('The browser said no to the microphone. The bars idle without it — everything else still works.')
    }
  }, [])

  /** The camera, for real, drawn onto the panel a frame at a time. */
  const openCam = useCallback(async () => {
    panel.current.notice = 'Asking for the camera…'
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      })
      media.current.stream = stream
      const v = document.createElement('video')
      v.srcObject = stream
      v.muted = true
      v.playsInline = true
      await v.play()
      panel.current.video = v
      panel.current.notice = null
      setPermission(null)
      track(EV.galleryViewed, { view: 'demo', demo: 'see', granted: true })
    } catch {
      panel.current.notice = 'Camera declined'
      setPermission('The browser said no to the camera. Nothing left our machine either way — the frame is drawn locally and never uploaded.')
    }
  }, [])

  const pick = useCallback((d: Demo) => {
    release()
    setActive(d)
    setPermission(null)
    panel.current.notice = null
    panel.current.mode = d.mode
    panel.current.ripples = []
    if (d.mode !== 'face') { panel.current.faceId = ''; setFace(null) }
    if (d.mode === 'online') panel.current.wifiAt = performance.now()
    if (d.mode === 'game') { panel.current.game = newGame(); setScore(0) }
    else panel.current.game = null
    if (d.needs === 'mic') void openMic()
    if (d.needs === 'cam') void openCam()
    track(EV.galleryViewed, { view: 'demo', demo: d.id })
  }, [release, openMic, openCam])

  // The game's clock. Physics belongs here, not in the draw call.
  useEffect(() => {
    if (active.mode !== 'game') return
    let raf = 0
    let last = 0
    const tick = () => {
      const g = panel.current.game
      if (g) {
        stepGame(g)
        if (g.score !== last) { last = g.score; setScore(g.score) }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active.mode])

  /**
   * A pointer landing on the robot's own glass, in panel pixels. True means
   * the demo used it, and the press should not also swing the head.
   */
  const onHit = useCallback((h: { x: number; y: number }) => {
    const s = panel.current
    if (s.mode === 'game') {
      if (s.game?.over) { s.game = newGame(); setScore(0) }
      else if (s.game) s.game.paddle = Math.max(34, Math.min(W - 34, h.x))
      return true
    }
    if (s.mode === 'touch') {
      s.ripples = [...s.ripples, { ...h, born: performance.now() }].slice(-6)
      return true
    }
    // Any other mode: nothing. A tap used to switch to the touch demo from
    // wherever you were, which meant you could not touch the model while
    // watching the camera or the audio meter without being thrown out of it.
    // Choosing a capability is the visitor's decision, not the model's. The
    // press falls through to the head instead, so the face is still draggable.
    return false
  }, [])

  const onDrag = useCallback((h: { x: number; y: number }) => {
    const g = panel.current.game
    if (g && !g.over) g.paddle = Math.max(34, Math.min(W - 34, h.x))
  }, [])

  function chooseFace(id: string) {
    const next = face === id ? null : id
    panel.current.faceId = next ?? ''
    setFace(next)
  }

  const showFaces = active.id === 'face'

  return (
    <div>
      <div
        ref={host}
        className="relative overflow-hidden cursor-grab active:cursor-grabbing touch-none
                   h-[440px] sm:h-[520px] lg:h-[600px]"
        style={{ borderRadius: 'var(--radius-tile)', background: 'var(--surface-2)' }}
      >
        {ready === '3d' && (
          <Scene active onAngles={onAngles} panel={panel}
                 dragTarget={host} onHit={onHit} onDrag={onDrag} />
        )}

        {ready === 'photo' && (
          <>
            <Image src="/media/unit.webp" alt="An assembled Pebble-chan on a desk"
                   width={1100} height={1100} sizes="100vw"
                   className="w-full h-full object-contain" />
            <p className="absolute inset-x-5 bottom-5 t-mono text-[11.5px] text-[var(--muted)] m-0">
              The interactive model is held back on reduced motion and metered connections.
            </p>
          </>
        )}

        {ready === '3d' && (
          <>
            {/* Controls on the frame. Horizontally scrollable on a phone, so
                the device never leaves the screen while you operate it. */}
            <div className="absolute inset-x-0 top-0 p-3 sm:p-4 flex flex-col gap-2">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                {DEMOS.map((d) => {
                  const on = active.id === d.id
                  return (
                    <button
                      key={d.id} type="button" onClick={() => pick(d)} aria-pressed={on}
                      aria-label={`${d.label} — ${d.part}`}
                      className="shrink-0 px-3.5 py-2 cursor-pointer transition-colors
                                 text-[13px] font-medium backdrop-blur-sm"
                      style={{
                        borderRadius: 999,
                        border: `1px solid ${on ? 'transparent' : 'rgba(17,17,17,.14)'}`,
                        background: on ? 'var(--ink)' : 'rgba(243,241,237,.82)',
                        color: on ? 'var(--bg)' : 'var(--ink)',
                      }}
                    >
                      <span className="sm:hidden">{d.short}</span>
                      <span className="hidden sm:inline">{d.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Expressions belong with the control that reveals them, not at
                  the far end of the frame. On a phone the bottom edge is also
                  where the buy bar sits. */}
              {showFaces && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                  {FACES.map((f) => {
                    const on = face === f.id
                    return (
                      <button key={f.id} type="button" onClick={() => chooseFace(f.id)}
                              aria-pressed={on}
                              className="shrink-0 t-mono text-[11px] px-2.5 py-1.5 cursor-pointer
                                         transition-colors backdrop-blur-sm"
                              style={{
                                borderRadius: 999,
                                border: `1px solid ${on ? 'transparent' : 'rgba(17,17,17,.14)'}`,
                                background: on ? 'var(--ink)' : 'rgba(243,241,237,.8)',
                                color: on ? 'var(--bg)' : 'var(--muted)',
                              }}>
                        {f.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* One wrapping bar, not two pinned corners: at 390px the servo
                readout and the hint used to land on top of each other. Lifted
                clear of the buy bar, which is fixed to the bottom of the
                viewport on a phone. */}
            <div className="absolute inset-x-3 sm:inset-x-4 bottom-[86px] sm:bottom-4
                            flex flex-wrap items-center gap-1.5 pointer-events-none">
              {([['PAN M1', angles.pan], ['TILT M2', angles.tilt]] as const).map(([label, v]) => (
                <span key={label} className="t-mono text-[11px] px-2.5 py-1.5 rounded-md"
                      style={{ background: 'rgba(17,17,17,.78)', color: 'var(--pebble-paper)' }}>
                  {label} {v >= 0 ? '+' : '−'}{Math.abs(v).toFixed(1)}°
                </span>
              ))}
              {active.mode === 'game' && (
                <span className="t-mono text-[11px] px-2.5 py-1.5 rounded-md"
                      style={{ background: 'rgba(17,17,17,.78)', color: 'var(--pebble-paper)' }}>
                  SCORE {String(score).padStart(3, '0')}
                </span>
              )}
              <span className="t-mono text-[11px] px-2.5 py-1.5 rounded-md ml-auto"
                    style={{ background: 'rgba(17,17,17,.78)', color: 'var(--pebble-paper)' }}>
                {active.hint}
              </span>
            </div>

          </>
        )}
      </div>

      {/* Reading matter, below — it is the one thing you do not need the
          device on screen for. */}
      <div className="mt-5 grid gap-x-10 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-start">
        <div>
          <p className="t-mono text-[12.5px] m-0">{active.call}</p>
          <p className="t-mono text-[11px] text-[var(--muted)] m-0 mt-1.5">{active.part}</p>
        </div>
        <div>
          <p className="text-[14px] leading-[22px] text-[var(--muted)] m-0">{active.what}</p>
          {permission && (
            <p className="text-[13px] leading-[20px] m-0 mt-2.5 px-3 py-2.5"
               style={{ borderRadius: 'var(--radius-button)', background: 'var(--surface-2)' }}>
              {permission}
            </p>
          )}
          {active.needs && !permission && (
            <p className="t-mono text-[11px] text-[var(--muted)] m-0 mt-2.5">
              {active.needs === 'mic'
                ? 'Your microphone, read in the browser. Nothing is recorded or sent.'
                : 'Your camera, drawn onto the panel in the browser. Nothing is recorded or sent.'}
            </p>
          )}
        </div>
      </div>

      <p className="t-mono text-[11.5px] text-[var(--muted)] mt-4 mb-0">
        Built from the print files that ship in the box · panel drawn at {W} × {H}
      </p>
    </div>
  )
}
