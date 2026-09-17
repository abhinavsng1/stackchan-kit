'use client'

import { Suspense, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

const Canvas = dynamic(() => import('@react-three/fiber').then((m) => m.Canvas), { ssr: false })
const Robot = dynamic(() => import('@/components/robot3d/Robot'), { ssr: false })
const ContactShadows = dynamic(
  () => import('@react-three/drei').then((m) => m.ContactShadows), { ssr: false })
const Environment = dynamic(
  () => import('@react-three/drei').then((m) => m.Environment), { ssr: false })
const Lightformer = dynamic(
  () => import('@react-three/drei').then((m) => m.Lightformer), { ssr: false })

/** The model, built from the same STLs that print the shell. */
export default function Scene({
  active, onAngles,
}: {
  /** Rendering stops entirely when this is false. */
  active: boolean
  onAngles?: (pan: number, tilt: number) => void
}) {
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!active) return
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
      onAngles?.(shown.pan, -shown.tilt)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [active, onAngles])

  return (
    <Canvas
      camera={{ position: [44, 26, 178], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      shadows
      frameloop={active ? 'always' : 'never'}
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
  )
}
