'use client'

import { useEffect, useRef } from 'react'

/**
 * The hero. Pebble-chan tracks the pointer, and a live readout prints the
 * commanded servo angles beside it — the product demonstrating its own spec
 * instead of asserting it.
 *
 * Angles driven here are a comfortable subset of the SCS0009's mechanical
 * travel; the full ±150° limit is stated separately as a static fact.
 */
const PAN_DRIVE = 42
const TILT_DRIVE = 16
const EYE_TRAVEL = 11
const EASE = 0.085
const IDLE_AFTER_MS = 2600

type Vec = { pan: number; tilt: number }

export default function Face() {
  const headRef = useRef<HTMLDivElement>(null)
  const eyesRef = useRef<SVGGElement>(null)
  const hornRef = useRef<SVGGElement>(null)
  const panOut = useRef<HTMLSpanElement>(null)
  const tiltOut = useRef<HTMLSpanElement>(null)
  const eyeL = useRef<SVGEllipseElement>(null)
  const eyeR = useRef<SVGEllipseElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const target: Vec = { pan: 0, tilt: 0 }
    const current: Vec = { pan: 0, tilt: 0 }
    let lastMove = 0
    let blinkAt = performance.now() + 2200
    let blink = 0
    let frame = 0

    function aim(clientX: number, clientY: number) {
      const nx = (clientX / window.innerWidth) * 2 - 1
      const ny = (clientY / window.innerHeight) * 2 - 1
      target.pan = Math.max(-1, Math.min(1, nx)) * PAN_DRIVE
      target.tilt = Math.max(-1, Math.min(1, ny)) * TILT_DRIVE
      lastMove = performance.now()
    }

    const onMove = (e: PointerEvent) => aim(e.clientX, e.clientY)
    window.addEventListener('pointermove', onMove, { passive: true })

    function tick(now: number) {
      frame = requestAnimationFrame(tick)

      // With no pointer for a while, drift gently rather than staring.
      if (now - lastMove > IDLE_AFTER_MS) {
        target.pan = Math.sin(now / 2600) * 13
        target.tilt = Math.sin(now / 3900) * 5
      }

      current.pan += (target.pan - current.pan) * EASE
      current.tilt += (target.tilt - current.tilt) * EASE

      if (headRef.current) {
        headRef.current.style.transform =
          `rotateY(${current.pan.toFixed(2)}deg) rotateX(${(-current.tilt).toFixed(2)}deg)`
      }
      if (eyesRef.current) {
        const ex = (current.pan / PAN_DRIVE) * EYE_TRAVEL
        const ey = (current.tilt / TILT_DRIVE) * (EYE_TRAVEL * 0.5)
        eyesRef.current.setAttribute('transform', `translate(${ex.toFixed(2)} ${ey.toFixed(2)})`)
      }
      if (hornRef.current) {
        hornRef.current.setAttribute('transform', `rotate(${(current.pan * 1.5).toFixed(2)} 130 22)`)
      }
      if (panOut.current) panOut.current.textContent = fmt(current.pan)
      if (tiltOut.current) tiltOut.current.textContent = fmt(current.tilt)

      // Blink: drop the eye radius, then restore.
      if (now > blinkAt) {
        blink = 1
        blinkAt = now + 2600 + Math.random() * 3800
      }
      if (blink > 0) {
        blink = Math.max(0, blink - 0.13)
        const ry = 15 - 13.6 * Math.sin(blink * Math.PI)
        eyeL.current?.setAttribute('ry', ry.toFixed(2))
        eyeR.current?.setAttribute('ry', ry.toFixed(2))
      }
    }

    if (!reduced) frame = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <figure className="m-0 select-none">
      <div className="relative mx-auto w-full max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]">
        {/* the display bleeding light into the room */}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[26%] -translate-x-1/2 -translate-y-1/2 w-full aspect-square rounded-full"
             style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--glow) 30%, transparent) 0%, transparent 62%)' }} />
        {/* --- head: the only part the pan servo turns --- */}
        <div style={{ perspective: '1000px' }}>
          <div
            ref={headRef}
            style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
          >
            <svg viewBox="0 0 260 188" className="w-full h-auto block" role="img"
                 aria-label="Pebble-chan, a small desktop robot whose eyes follow your cursor">
              <defs>
                <filter id="drop" x="-30%" y="-30%" width="160%" height="180%">
                  <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#0b0f14" floodOpacity="0.16" />
                </filter>
                <filter id="phosphor" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="4.5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 54 mm cube, square front face */}
              <rect x="44" y="10" width="172" height="172" rx="13" filter="url(#drop)"
                    fill="var(--surface-2)" stroke="var(--ink)" strokeWidth="2" />

              {/* corner fasteners — reads as a module, not a monitor */}
              {[[58, 24], [202, 24], [58, 168], [202, 168]].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.6"
                        fill="none" stroke="var(--ink)" strokeWidth="1.2" opacity="0.5" />
              ))}

              {/* 320 x 240 display, 4:3, evenly inset */}
              <rect x="72" y="44" width="116" height="87" rx="3" fill="var(--screen)" />

              {/* the only light on the page */}
              <g ref={eyesRef} filter="url(#phosphor)">
                <ellipse ref={eyeL} cx="106" cy="78" rx="13" ry="13" fill="var(--glow)" />
                <ellipse ref={eyeR} cx="154" cy="78" rx="13" ry="13" fill="var(--glow)" />
                <path d="M119 104 Q130 113 141 104" fill="none" stroke="var(--glow)"
                      strokeWidth="3.2" strokeLinecap="round" />
              </g>

              {/* USB-C on the bottom edge */}
              <rect x="118" y="172" width="24" height="5" rx="2.5"
                    fill="none" stroke="var(--ink)" strokeWidth="1.3" opacity="0.55" />
            </svg>
          </div>
        </div>

        {/* --- neck, pan servo and body: fixed --- */}
        <svg viewBox="0 0 260 86" className="w-full h-auto block -mt-px" aria-hidden="true">
          <line x1="130" y1="0" x2="130" y2="8" stroke="var(--ink)" strokeWidth="1.8" />
          <g ref={hornRef}>
            <circle cx="130" cy="22" r="16" fill="var(--surface-2)" stroke="var(--ink)" strokeWidth="1.8" />
            <line x1="130" y1="22" x2="130" y2="9" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
          </g>
          <circle cx="130" cy="22" r="3" fill="var(--ink)" />
          <rect x="88" y="40" width="84" height="34" rx="4"
                fill="var(--surface-2)" stroke="var(--ink)" strokeWidth="1.8" />
          <line x1="100" y1="51" x2="160" y2="51" stroke="var(--line)" strokeWidth="1.2" />
          <line x1="100" y1="59" x2="140" y2="59" stroke="var(--line)" strokeWidth="1.2" />
          <rect x="70" y="74" width="120" height="10" rx="2"
                fill="var(--surface-2)" stroke="var(--ink)" strokeWidth="1.8" />
        </svg>
      </div>

      <figcaption className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Pan M1"  ref_={panOut} />
        <Readout label="Tilt M2" ref_={tiltOut} />
        <span className="float t-mono text-[13px] hidden sm:flex items-center gap-2">
          <span className="t-label">Travel</span>300.0°
        </span>
      </figcaption>
    </figure>
  )
}

function fmt(v: number) {
  const s = v >= 0 ? '+' : '−'
  return s + Math.abs(v).toFixed(1).padStart(4, '0') + '°'
}

function Readout({ label, ref_ }: { label: string; ref_: React.RefObject<HTMLSpanElement | null> }) {
  return (
    <span className="float t-mono text-[12px] sm:text-[13px] !px-3 !py-2 flex items-center gap-1.5">
      <span className="t-label">{label}</span>
      <span ref={ref_} className="tabular-nums">+00.0°</span>
    </span>
  )
}
