'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PRINTED, Printed, usePlaMaterial } from './parts'
import { FACES } from '@/lib/faces'
import { faceTexture } from './faceTexture'

/**
 * The assembled kit, built from the same STLs that print the shell.
 *
 * The printed parts are real geometry. The CoreS3 is modelled to its published
 * 54 x 54 x 16.5 mm, and the screen is a true 4:3 at 2.0 inches, so the
 * proportions on screen are the proportions in the box.
 */

const CYCLE_MS = 4200
const PAN_DRIVE = 30
const TILT_DRIVE = 14
const EASE = 0.075
const IDLE_AFTER_MS = 2600

function CoreS3() {
  const bezel = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#aeb4bc', roughness: 0.42, metalness: 0.62,
  }), [])
  const body = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1d21', roughness: 0.52, metalness: 0.2,
  }), [])
  const glass = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#05070a', roughness: 0.08, metalness: 0.35,
  }), [])
  return (
    <group>
      <mesh material={body} position={[0, 0, -1]} castShadow>
        <boxGeometry args={[53.4, 53.4, 14.5]} />
      </mesh>
      <mesh material={bezel} position={[0, 0, 7]}>
        <boxGeometry args={[53.8, 53.8, 2.2]} />
      </mesh>
      {/* glass panel, inset inside the bezel */}
      <mesh material={glass} position={[0, 1.2, 7.9]}>
        <boxGeometry args={[45, 42, 0.6]} />
      </mesh>
      {/* home button */}
      <mesh material={body} position={[0, -21.5, 8.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3.1, 3.1, 0.5, 24]} />
      </mesh>
    </group>
  )
}

/**
 * The real panel. Cycles the firmware's own expressions and blinks the ones
 * the firmware blinks — arc and closed eyes are left alone, as on the device.
 */
function Panel() {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const idx = useRef(0)
  const nextSwap = useRef(CYCLE_MS)
  const nextBlink = useRef(2200)
  const blinkUntil = useRef(0)
  const glow = useRef<THREE.PointLight>(null)
  const holdUntil = useRef(0)

  // The atlas below can put a face on the robot. It holds, then resumes.
  useEffect(() => {
    const onEmote = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      const i = FACES.findIndex((f) => f.id === id)
      if (i < 0) return
      idx.current = i
      holdUntil.current = performance.now() + 9000
    }
    window.addEventListener('sc:emote', onEmote)
    return () => window.removeEventListener('sc:emote', onEmote)
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime * 1000
    const face = FACES[idx.current]

    if (t > nextSwap.current && performance.now() > holdUntil.current) {
      idx.current = (idx.current + 1) % FACES.length
      nextSwap.current = t + CYCLE_MS
      nextBlink.current = t + 900
    }
    if (face.blinks && t > nextBlink.current && t > blinkUntil.current) {
      blinkUntil.current = t + 120
      nextBlink.current = t + 2400 + Math.random() * 3600
    }

    const shut = face.blinks && t < blinkUntil.current
    if (mat.current) {
      const tex = faceTexture(face, shut)
      if (mat.current.map !== tex) {
        mat.current.map = tex
        mat.current.emissiveMap = tex
        mat.current.needsUpdate = true
      }
    }
    // the panel throwing a little of its own colour into the room
    if (glow.current) glow.current.color.set(face.eye)
  })

  return (
    <group position={[0, 1.2, 8.35]}>
      <mesh>
        <planeGeometry args={[44, 33]} />
        <meshStandardMaterial
          ref={mat}
          map={faceTexture(FACES[0])}
          emissiveMap={faceTexture(FACES[0])}
          emissive={new THREE.Color('#ffffff')}
          emissiveIntensity={0.85}
          roughness={0.32}
          metalness={0}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={glow} intensity={16} distance={90} decay={2} position={[0, 0, 16]} />
    </group>
  )
}

export default function Robot({ pointer }: { pointer: React.RefObject<{ x: number; y: number }> }) {
  const head = useRef<THREE.Group>(null)
  const pla = usePlaMaterial()
  const current = useRef({ pan: 0, tilt: 0 })
  const lastMove = useRef(0)

  useFrame((state) => {
    const now = state.clock.elapsedTime * 1000
    const p = pointer.current
    let tPan: number
    let tTilt: number

    if (p && (p.x !== 0 || p.y !== 0)) { lastMove.current = now }
    if (now - lastMove.current > IDLE_AFTER_MS || !p) {
      tPan = Math.sin(now / 2700) * 11
      tTilt = Math.sin(now / 4100) * 4
    } else {
      tPan = p.x * PAN_DRIVE
      tTilt = p.y * TILT_DRIVE
    }

    current.current.pan += (tPan - current.current.pan) * EASE
    current.current.tilt += (tTilt - current.current.tilt) * EASE

    if (head.current) {
      head.current.rotation.y = THREE.MathUtils.degToRad(current.current.pan)
      head.current.rotation.x = THREE.MathUtils.degToRad(current.current.tilt)
    }
  })

  return (
    <group position={[0, -26, 0]}>
      {/* base: the printed feet lie flat */}
      <Printed url={PRINTED.feet} material={pla} rotation={[-Math.PI / 2, 0, 0]} position={[0, 4.1, 0]} />

      {/* head: pans and tilts about the servo axes */}
      <group ref={head} position={[0, 40, 0]}>
        <Printed url={PRINTED.shell} material={pla} rotation={[Math.PI / 2, 0, 0]} />
        <group position={[0, 0, 3]}>
          <CoreS3 />
          <Panel />
        </group>
      </group>
    </group>
  )
}
