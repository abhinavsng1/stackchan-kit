'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'

const Canvas = dynamic(() => import('@react-three/fiber').then((m) => m.Canvas), { ssr: false })
const Robot = dynamic(() => import('@/components/robot3d/Robot'), { ssr: false })
const ContactShadows = dynamic(
  () => import('@react-three/drei').then((m) => m.ContactShadows), { ssr: false })
const Environment = dynamic(
  () => import('@react-three/drei').then((m) => m.Environment), { ssr: false })
const Lightformer = dynamic(
  () => import('@react-three/drei').then((m) => m.Lightformer), { ssr: false })

/** How long each of the two views holds before the other takes over. */
const SWAP_MS = 10_000

/** Cheap, honest capability check. No WebGL means no 3D, so show the photograph. */
function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * The hero alternates between a model built from the real print files and a
 * photograph of an assembled unit. The model is accurate and interactive; the
 * photograph is proof the thing exists. Ten seconds each.
 */
export default function Robot3D() {
  const [mode, setMode] = useState<'probing' | '3d' | 'photo'>('probing')
  const [showing, setShowing] = useState<'model' | 'photo'>('model')
  /** Bumped on every swap, manual or automatic, to restart the countdown ring. */
  const [cycle, setCycle] = useState(0)
  const pointer = useRef({ x: 0, y: 0 })
  const panOut = useRef<HTMLSpanElement>(null)
  const tiltOut = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData === true

    // With motion unwelcome, data restricted, or no WebGL, the photograph is a
    // better answer than an empty frame — and it is 46 KB.
    setMode(reduced || saveData || !hasWebGL() ? 'photo' : '3d')
  }, [])

  /**
   * A timeout per hold rather than one interval, so choosing a view by hand
   * restarts the countdown instead of leaving a half-elapsed one running.
   */
  useEffect(() => {
    if (mode !== '3d') return
    const id = setTimeout(() => {
      setShowing((s) => (s === 'model' ? 'photo' : 'model'))
      setCycle((c) => c + 1)
    }, SWAP_MS)
    return () => clearTimeout(id)
  }, [mode, showing, cycle])

  const choose = (view: 'model' | 'photo') => {
    setShowing(view)
    setCycle((c) => c + 1)
  }

  useEffect(() => {
    if (mode !== '3d') return
    const shown = { pan: 0, tilt: 0 }
    let frame = 0

    const onMove = (e: PointerEvent) => {
      pointer.current.x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1))
      pointer.current.y = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1))
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const tick = () => {
      frame = requestAnimationFrame(tick)
      shown.pan += (pointer.current.x * 30 - shown.pan) * 0.075
      shown.tilt += (pointer.current.y * 14 - shown.tilt) * 0.075
      if (panOut.current) panOut.current.textContent = fmt(shown.pan)
      if (tiltOut.current) tiltOut.current.textContent = fmt(-shown.tilt)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [mode])

  const photoVisible = mode === 'photo' || showing === 'photo'

  return (
    <figure className="m-0 select-none">
      <div className="relative mx-auto w-full max-w-[240px] sm:max-w-[350px] lg:max-w-[440px] aspect-square">

        {/* the assembled unit */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden transition-opacity duration-700"
          style={{ opacity: photoVisible ? 1 : 0 }}
          aria-hidden={!photoVisible}
        >
          <Image
            src="/media/unit.webp"
            alt="An assembled Pebble-chan on a desk, its display showing the curious face and a status line reading ARMED"
            width={1100}
            height={1100}
            sizes="(max-width: 640px) 240px, (max-width: 1024px) 350px, 440px"
            priority
            className="w-full h-full object-cover"
          />
        </div>

        {/* the model, built from the print files */}
        {mode === '3d' && (
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: photoVisible ? 0 : 1 }}
            aria-hidden={photoVisible}
          >
            <Canvas
              camera={{ position: [44, 26, 178], fov: 32 }}
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 2]}
              shadows
              // Stop rendering entirely while the photograph is up.
              frameloop={photoVisible ? 'never' : 'always'}
            >
              <ambientLight intensity={0.9} />
              <hemisphereLight args={['#ffffff', '#26303a', 0.7]} />
              <directionalLight position={[60, 110, 90]} intensity={2.6} castShadow
                                shadow-mapSize={[1024, 1024]} />
              <directionalLight position={[-80, 30, -50]} intensity={0.8} color="#9ec5ff" />
              <Suspense fallback={null}>
                {/* Lightformers rather than an HDR file: the metal bezel needs
                    something to reflect, and this fetches nothing. */}
                <Environment resolution={256}>
                  <Lightformer form="rect" intensity={3.2} position={[-60, 40, 60]}
                               scale={[60, 90, 1]} target={[0, 0, 0]} />
                  <Lightformer form="rect" intensity={1.6} position={[70, 20, 40]}
                               scale={[50, 60, 1]} target={[0, 0, 0]} color="#cfe0ff" />
                  <Lightformer form="rect" intensity={1.1} position={[0, -50, 30]}
                               scale={[80, 40, 1]} target={[0, 0, 0]} />
                </Environment>
                <Robot pointer={pointer} />
                <ContactShadows position={[0, -26, 0]} opacity={0.35} scale={190}
                                blur={2.4} far={60} resolution={512} />
              </Suspense>
            </Canvas>
          </div>
        )}
      </div>

      {mode === '3d' && (
        <div className="mt-3 flex items-center justify-center gap-1" role="group"
             aria-label="Choose what the hero shows">
          {(['model', 'photo'] as const).map((view) => (
            <SwitchDot
              key={view}
              view={view}
              active={showing === view}
              cycle={cycle}
              onSelect={() => choose(view)}
            />
          ))}
        </div>
      )}

      <figcaption className="mt-2 sm:mt-3 flex flex-wrap items-center justify-center gap-2 min-h-[38px]">
        {photoVisible ? (
          <span className="float t-mono text-[12px] sm:text-[13px] !px-3 !py-2 flex items-center gap-2">
            <span className="t-label">Assembled unit</span>photographed, not rendered
          </span>
        ) : (
          <>
            <Readout label="Pan M1" ref_={panOut} />
            <Readout label="Tilt M2" ref_={tiltOut} />
            <span className="float t-mono text-[13px] hidden sm:flex items-center gap-2">
              <span className="t-label">Travel</span>300.0°
            </span>
          </>
        )}
      </figcaption>
    </figure>
  )
}

const R = 9
const CIRCUMFERENCE = 2 * Math.PI * R

/**
 * One dot per view. The active one drains a ring over the hold, so the swap is
 * announced rather than sprung; either can be pressed to go there now.
 */
function SwitchDot({
  view, active, cycle, onSelect,
}: {
  view: 'model' | 'photo'
  active: boolean
  cycle: number
  onSelect: () => void
}) {
  const label = view === 'model' ? 'the 3D model' : 'a photo of an assembled unit'
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`Show ${label}`}
      title={`Show ${label}`}
      className="switch-dot"
    >
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r={R} fill="none" stroke="currentColor"
                strokeWidth="2" opacity={active ? 0.25 : 0.45} />
        {active && (
          <circle
            // Remounting on each cycle restarts the animation from full.
            key={cycle}
            className="ring-progress"
            cx="11" cy="11" r={R} fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            transform="rotate(-90 11 11)"
            strokeDasharray={CIRCUMFERENCE}
            style={{ ['--circumference' as string]: CIRCUMFERENCE, ['--hold' as string]: `${SWAP_MS}ms` }}
          />
        )}
      </svg>
    </button>
  )
}

function fmt(v: number) {
  return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).padStart(4, '0') + '°'
}

function Readout({ label, ref_ }: { label: string; ref_: React.RefObject<HTMLSpanElement | null> }) {
  return (
    <span className="float t-mono text-[12px] sm:text-[13px] !px-3 !py-2 flex items-center gap-1.5">
      <span className="t-label">{label}</span>
      <span ref={ref_} className="tabular-nums">+00.0°</span>
    </span>
  )
}
