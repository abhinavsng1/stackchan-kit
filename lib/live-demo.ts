import * as THREE from 'three'
import { MOODS, OWN_MOODS, drawCompanion } from '@/lib/companion-face'
import { buildRobot, loadBody, type Colourway } from '@/lib/robot-body'
import { aimAt, gazeFor, makeStage, Servo, wanderer, watchPointer } from '@/lib/live-stage'

/**
 * The demo robot: one live robot that the "What it does" section directs.
 *
 * The section decides what to show (components/site/DemoStage.tsx); this
 * decides how the robot does it. It holds a head target, a face and a mouth,
 * and moves toward them like the real servos do — eased, never snapping, and
 * never past what the hardware reaches. Pan is ±55°, and tilt only goes up
 * from level: the real hinge stops there, so nothing here ever looks down.
 *
 * Directions are plain calls — look, nod, say, mood — so a scripted exchange
 * reads as a script and the robot cannot be asked for an impossible pose.
 */

/** What the servos reach, in degrees. Tilt up is positive; level is the floor. */
export const RANGE = { pan: 55, tilt: 30 } as const

/** Front three-quarter from the speaker side, a little above. Matches the hero. */
const VIEW = { az: 24, el: 9 }
const IDLE_AFTER_MS = 4000

export type Demo = {
  setShell: (way: Colourway) => void
  /** follow the pointer (and wander when it is idle), or hold a set pose. */
  follow: (on: boolean) => void
  /** Turn the head to a pose, clamped to RANGE. Holds it until told otherwise. */
  look: (pan: number, tilt?: number) => void
  /** Set the face. Any id from MOODS, including the custom ones. */
  mood: (id: string) => void
  /** Nod: a quick lift of the head and back, `times` times. */
  nod: (times?: number) => void
  /** A small no: the head shakes side to side. */
  shake: () => void
  /** Move the mouth as if speaking, for `seconds`. */
  say: (seconds: number) => void
  /** Stop speaking now. */
  hush: () => void
  /** Called when the robot itself is tapped (the screen). */
  onTap: (fn: (() => void) | null) => void
  /** Where the head is, in degrees — for the readout. */
  pose: () => { pan: number; tilt: number }
  dispose: () => void
}

export async function startDemo(host: HTMLElement, { shell }: { shell: Colourway }): Promise<Demo> {
  const parts = await loadBody()
  const stage = makeStage(host, { shadow: 0.3 })
  const { scene, camera, studio } = stage
  const robot = buildRobot(parts, shell)
  scene.add(robot.root)
  studio.adopt(robot.root)

  const box = new THREE.Box3().setFromObject(robot.root)
  studio.fitShadow(box)
  const centre = box.getCenter(new THREE.Vector3())
  const radius = box.getSize(new THREE.Vector3()).length() / 2
  let dist = 300
  const place = () => {
    stage.resize()
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const fitH = radius / Math.sin(vFov / 2)
    const fitW = radius / Math.sin(Math.atan(Math.tan(vFov / 2) * camera.aspect))
    // Room round it: the head turns and lifts, and the conversation needs a
    // floor under the robot to land on.
    dist = Math.max(fitH, fitW) * 1.42
    const az = THREE.MathUtils.degToRad(VIEW.az), el = THREE.MathUtils.degToRad(VIEW.el)
    camera.position.set(
      centre.x + dist * Math.cos(el) * Math.sin(az),
      centre.y - 16 + dist * Math.sin(el),
      centre.z + dist * Math.cos(el) * Math.cos(az),
    )
    // Aimed below the robot's middle, so it stands in the upper part of the
    // frame and the bubbles have the lower part.
    camera.lookAt(centre.x, centre.y - 16, centre.z)
    camera.updateMatrixWorld()
  }
  place()

  /* ------------------------------ the state ------------------------------ */

  let following = true
  const target = { pan: 0, tilt: 6 }
  let moodId = 'awake'
  let speakUntil = 0
  let nodLeft = 0, nodPhase = 0
  let shakeUntil = 0
  let tapFn: (() => void) | null = null

  const pan = new Servo(70, 260), tilt = new Servo(90, 300)
  const pointer = watchPointer(host, stage.renderer.domElement)
  const wander = wanderer(11)
  const canvas = stage.renderer.domElement
  canvas.style.cursor = 'pointer'
  const onDown = () => {
    if (tapFn) { tapFn(); return }
    // Left to itself, a tap changes its face and it nods, as on the hero.
    const i = OWN_MOODS.findIndex((m) => m.id === moodId)
    moodId = OWN_MOODS[(i + 1) % OWN_MOODS.length].id
    nodLeft = 1
  }
  canvas.addEventListener('pointerdown', onDown)

  stage.loop((dt, now) => {
    let want = target
    let gaze = { x: 0, y: 0 }
    if (following) {
      const idle = !pointer.inside && now - pointer.lastAt > IDLE_AFTER_MS
      const g = idle ? wander(now) : pointer
      want = aimAt(robot, camera, g, { maxPan: RANGE.pan, maxTilt: RANGE.tilt })
      gaze = gazeFor(robot, camera, g)
    }

    // Gestures ride on top of wherever the head is aimed.
    let lift = 0
    if (nodLeft > 0) {
      nodPhase += dt * 5.2
      lift = Math.max(0, Math.sin(nodPhase * Math.PI)) * 14
      if (nodPhase >= nodLeft) { nodLeft = 0; nodPhase = 0 }
    }
    const shaking = now < shakeUntil ? Math.sin(now / 70) * 12 : 0

    robot.pose({
      pan: pan.step(THREE.MathUtils.clamp(want.pan + shaking, -RANGE.pan, RANGE.pan), dt),
      tilt: Math.max(-1, tilt.step(THREE.MathUtils.clamp(want.tilt + lift, 0, RANGE.tilt), dt)),
    })

    // Speech: syllables inside words, words inside the phrase.
    const t = now / 1000
    const speak = now < speakUntil
      ? Math.max(0, Math.sin(Math.PI * 2 * 6.5 * t)) * (0.45 + 0.55 * Math.max(0, Math.sin(Math.PI * 2 * 1.4 * t)))
      : 0
    const mood = MOODS.find((m) => m.id === moodId) ?? MOODS[0]
    drawCompanion(robot.ctx, mood, now, speak, gaze)
    robot.update()
  })

  const onResize = () => place()
  window.addEventListener('resize', onResize)

  return {
    setShell: robot.setShell,
    follow: (on) => { following = on },
    look: (p, t = 6) => {
      following = false
      target.pan = THREE.MathUtils.clamp(p, -RANGE.pan, RANGE.pan)
      target.tilt = THREE.MathUtils.clamp(t, 0, RANGE.tilt)
    },
    mood: (id) => { moodId = id },
    nod: (times = 2) => { nodLeft = times; nodPhase = 0 },
    shake: () => { shakeUntil = performance.now() + 700 },
    say: (seconds) => { speakUntil = performance.now() + seconds * 1000 },
    hush: () => { speakUntil = 0 },
    onTap: (fn) => { tapFn = fn },
    pose: () => ({ pan: pan.x, tilt: tilt.x }),
    dispose: () => {
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('pointerdown', onDown)
      pointer.dispose()
      robot.dispose()
      stage.dispose()
    },
  }
}
