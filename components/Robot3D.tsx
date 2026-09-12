'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Face from '@/components/Face'

const Canvas = dynamic(() => import('@react-three/fiber').then((m) => m.Canvas), { ssr: false })
const Robot = dynamic(() => import('@/components/robot3d/Robot'), { ssr: false })
const ContactShadows = dynamic(
  () => import('@react-three/drei').then((m) => m.ContactShadows), { ssr: false })
const Environment = dynamic(
  () => import('@react-three/drei').then((m) => m.Environment), { ssr: false })
const Lightformer = dynamic(
  () => import('@react-three/drei').then((m) => m.Lightformer), { ssr: false })

/** Cheap, honest capability check. No WebGL means no 3D, so show the drawing. */
function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function Robot3D() {
  const [mode, setMode] = useState<'probing' | '3d' | 'svg' | 'offer'>('probing')
  const pointer = useRef({ x: 0, y: 0 })
  const panOut = useRef<HTMLSpanElement>(null)
  const tiltOut = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData === true

    // A static drawing is the right answer when motion is unwelcome.
    if (reduced || saveData || !hasWebGL()) { setMode('svg'); return }

    // The 3D model costs roughly a megabyte. On a phone that is the visitor's
    // data, so offer it rather than spending it for them.
    setMode(window.innerWidth >= 1024 ? '3d' : 'offer')
  }, [])

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

  if (mode === 'offer') {
    return (
      <div>
        <Face />
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={() => setMode('3d')} className="btn btn-ghost !py-2.5 !text-[13px]">
            View the 3D model
            <span className="t-label">~1 MB</span>
          </button>
        </div>
      </div>
    )
  }

  if (mode !== '3d') return <Face />

  return (
    <figure className="m-0 select-none">
      <div className="relative mx-auto w-full max-w-[240px] sm:max-w-[350px] lg:max-w-[440px] aspect-square">
        <Canvas
          camera={{ position: [44, 26, 178], fov: 32 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          shadows
        >
          <ambientLight intensity={0.9} />
          <hemisphereLight args={['#ffffff', '#26303a', 0.7]} />
          <directionalLight position={[60, 110, 90]} intensity={2.6} castShadow
                            shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-80, 30, -50]} intensity={0.8} color="#9ec5ff" />
          <Suspense fallback={null}>
            {/* Built from lightformers rather than an HDR file: the metal bezel
                needs something to reflect, and this fetches nothing. */}
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

      <figcaption className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Pan M1" ref_={panOut} />
        <Readout label="Tilt M2" ref_={tiltOut} />
        <span className="float t-mono text-[13px] hidden sm:flex items-center gap-2">
          <span className="t-label">Travel</span>300.0°
        </span>
      </figcaption>
    </figure>
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
