'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PRINTED, Printed, usePlaMaterial } from './parts'

/**
 * The assembled kit, built from the same STLs that print the shell.
 *
 * The printed parts are real geometry. The CoreS3 is modelled to its published
 * 54 x 54 x 16.5 mm, and the screen is a true 4:3 at 2.0 inches, so the
 * proportions on screen are the proportions in the box.
 */

const GLOW = '#5bf0d4'
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

/** Eyes and mouth are emissive geometry, so blinking is a scale, not a repaint. */
function Face() {
  const eyeL = useRef<THREE.Mesh>(null)
  const eyeR = useRef<THREE.Mesh>(null)
  const eyes = useRef<THREE.Group>(null)
  const blink = useRef(0)
  const nextBlink = useRef(1800)

  const lit = useMemo(() => new THREE.MeshStandardMaterial({
    color: GLOW, emissive: new THREE.Color(GLOW), emissiveIntensity: 2.4, toneMapped: false,
  }), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime * 1000
    if (t > nextBlink.current) { blink.current = 1; nextBlink.current = t + 3400 + Math.random() * 4200 }
    if (blink.current > 0) {
      blink.current = Math.max(0, blink.current - 0.11)
      const s = 1 - 0.94 * Math.sin(blink.current * Math.PI)
      if (eyeL.current) eyeL.current.scale.y = s
      if (eyeR.current) eyeR.current.scale.y = s
    }
    if (eyes.current) {
      eyes.current.position.x = Math.sin(state.clock.elapsedTime / 2.6) * 1.3
    }
  })

  return (
    <group position={[0, 1.2, 8.4]}>
      <group ref={eyes}>
        <mesh ref={eyeL} material={lit} position={[-10.5, 4, 0]}>
          <boxGeometry args={[7.4, 12.4, 0.4]} />
        </mesh>
        <mesh ref={eyeR} material={lit} position={[10.5, 4, 0]}>
          <boxGeometry args={[7.4, 12.4, 0.4]} />
        </mesh>
      </group>
      <mesh material={lit} position={[0, -8.5, 0]}>
        <boxGeometry args={[11, 2.2, 0.4]} />
      </mesh>
      {/* the display bleeding a little light into the room */}
      <pointLight color={GLOW} intensity={26} distance={80} decay={2} position={[0, 0, 12]} />
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
          <Face />
        </group>
      </group>
    </group>
  )
}
