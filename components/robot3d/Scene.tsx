'use client'

import { Suspense, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { PanelState } from '@/lib/panel'
import type { ScreenHit } from '@/components/robot3d/Robot'

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
  active, onAngles, panel, dragTarget, onHit, onDrag,
}: {
  /** Rendering stops entirely when this is false. */
  active: boolean
  onAngles?: (pan: number, tilt: number) => void
  /** Everything the panel is currently showing. Read inside the render loop. */
  panel: React.RefObject<PanelState>
  /** When given, the head follows drags inside this element rather than the
      pointer's position in the window — which is what makes it a toy rather
      than an ambient effect. */
  dragTarget?: React.RefObject<HTMLElement | null>
  /** A pointer landing on the robot's own screen, in panel pixels. Returns
      true when the current demo consumed it. */
  onHit?: (hit: ScreenHit) => boolean
  onDrag?: (hit: ScreenHit) => void
}) {
  const pointer = useRef({ x: 0, y: 0 })
  // Set by the screen mesh, which receives pointerdown before it bubbles to
  // the frame. Touching the screen is touching the screen; it should not also
  // swing the head around.
  const onGlass = useRef(false)

  useEffect(() => {
    if (!active) return
    const shown = { pan: 0, tilt: 0 }
    let frame = 0

    const onMove = (e: PointerEvent) => {
      pointer.current.x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1))
      pointer.current.y = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1))
    }
    const host = dragTarget?.current
    if (host) {
      // Inside a frame, position is meaningless — what matters is how far the
      // visitor has dragged from where they grabbed.
      let dragging = false
      let startX = 0, startY = 0, baseX = 0, baseY = 0
      const down = (e: PointerEvent) => {
        if (onGlass.current) { onGlass.current = false; return }
        // The controls sit on the frame, so a press on one arrives here too.
        // Capturing it would retarget the click to the frame and the button
        // would never fire — the price of putting the controls where they
        // belong rather than in a column beside the device.
        if ((e.target as HTMLElement | null)?.closest('button, a, input, label')) return
        dragging = true
        startX = e.clientX; startY = e.clientY
        baseX = pointer.current.x; baseY = pointer.current.y
        host.setPointerCapture?.(e.pointerId)
      }
      const move = (e: PointerEvent) => {
        if (!dragging) return
        const r = host.getBoundingClientRect()
        pointer.current.x = Math.max(-1, Math.min(1, baseX + (e.clientX - startX) / (r.width * 0.5)))
        pointer.current.y = Math.max(-1, Math.min(1, baseY + (e.clientY - startY) / (r.height * 0.5)))
      }
      const up = (e: PointerEvent) => {
        dragging = false
        onGlass.current = false
        host.releasePointerCapture?.(e.pointerId)
      }
      host.addEventListener('pointerdown', down)
      host.addEventListener('pointermove', move)
      host.addEventListener('pointerup', up)
      host.addEventListener('pointercancel', up)
      const stop = () => {
        host.removeEventListener('pointerdown', down)
        host.removeEventListener('pointermove', move)
        host.removeEventListener('pointerup', up)
        host.removeEventListener('pointercancel', up)
      }
      let raf2 = 0
      const tick2 = () => {
        shown.pan += (pointer.current.x * 38 - shown.pan) * 0.085
        shown.tilt += (pointer.current.y * 18 - shown.tilt) * 0.085
        onAngles?.(shown.pan, -shown.tilt)
        raf2 = requestAnimationFrame(tick2)
      }
      raf2 = requestAnimationFrame(tick2)
      return () => { stop(); cancelAnimationFrame(raf2) }
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
  }, [active, onAngles, dragTarget])

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
        <Robot
          pointer={pointer}
          panel={panel}
          onHit={(h) => {
            const used = onHit?.(h) ?? false
            // Only block the head drag when the screen actually took the press.
            if (used) onGlass.current = true
            return used
          }}
          onDrag={onDrag}
        />
        <ContactShadows position={[0, -26, 0]} opacity={0.35} scale={190}
                        blur={2.4} far={60} resolution={512} />
      </Suspense>
    </Canvas>
  )
}
