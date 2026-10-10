import * as THREE from 'three'
import { OWN_MOODS, drawCompanion } from '@/lib/companion-face'
import { buildRobot, loadBody, type Colourway } from '@/lib/robot-body'
import { aimAt, frameBox, gazeFor, makeStage, Servo, watchPointer } from '@/lib/live-stage'

/**
 * One robot on a turntable: it turns slowly all the way round, so every side
 * shows — the speaker grille, the USB-C and Grove ports, the DC socket at the
 * back — and you can grab it and spin it yourself.
 *
 * Its head keeps watching the cursor as its body turns away, until the cursor
 * is behind its shoulder; then it lets go and faces forward until it comes
 * round again.
 */

/** Degrees per second, unattended. A full turn in about 18 s. */
const SPIN = 20
/** How long after a drag before it starts turning by itself again. */
const RESUME_AFTER_MS = 2200
const IDLE_AFTER_MS = 4000
/** Turntable camera: front, a little above. */
const VIEW = { el: 12 }

export async function startTurntable(host: HTMLElement, {
  shell, startYaw = 28,
}: { shell: Colourway; startYaw?: number }): Promise<{ setShell: (way: Colourway) => void; dispose: () => void }> {
  const parts = await loadBody()
  const stage = makeStage(host, { shadow: 0.24, budget: 1_000_000 })
  const { scene, camera, studio } = stage
  const robot = buildRobot(parts, shell)
  scene.add(robot.root)
  studio.adopt(robot.root)

  // Frame the space the robot sweeps as it turns, not just where it stands,
  // so no angle of the turn is cropped.
  const sweep = (() => {
    const b = new THREE.Box3().setFromObject(robot.root)
    let r = 0
    for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) r = Math.max(r, Math.hypot(x, z))
    return new THREE.Box3(new THREE.Vector3(-r, b.min.y, -r), new THREE.Vector3(r, b.max.y + 4, r))
  })()
  studio.fitShadow(sweep)
  const target = sweep.getCenter(new THREE.Vector3())
  const dir = new THREE.Vector3(0, Math.sin(THREE.MathUtils.degToRad(VIEW.el)), Math.cos(THREE.MathUtils.degToRad(VIEW.el)))
  const fit = () => { stage.resize(); frameBox(camera, sweep, dir, { target, margin: 0.9 }) }
  fit()

  const pan = new Servo(80), tilt = new Servo(80)
  let mood = Math.max(0, OWN_MOODS.findIndex((m) => m.id === 'pleased'))

  /* ------------------------------ the spin ------------------------------ */

  let yaw = startYaw, spinV = SPIN, dragging = false, dragX = 0, moved = 0, lastDrag = -Infinity
  const canvas = stage.renderer.domElement
  canvas.style.cursor = 'grab'
  // Sideways drags spin it; up and down still scroll the page on a phone.
  canvas.style.touchAction = 'pan-y'
  const down = (e: PointerEvent) => {
    dragging = true; dragX = e.clientX; moved = 0
    canvas.style.cursor = 'grabbing'
    canvas.setPointerCapture?.(e.pointerId)
  }
  const move = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragX
    dragX = e.clientX; moved += Math.abs(dx)
    yaw += dx * 0.55
    spinV = THREE.MathUtils.clamp(dx * 0.55 * 60, -720, 720)
    lastDrag = performance.now()
  }
  const up = () => {
    if (!dragging) return
    dragging = false
    canvas.style.cursor = 'grab'
    // A tap rather than a drag: it changes its mood and nods.
    if (moved < 4) { mood = (mood + 1) % OWN_MOODS.length; tilt.v += 260 }
    lastDrag = performance.now()
  }
  canvas.addEventListener('pointerdown', down)
  window.addEventListener('pointermove', move, { passive: true })
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)

  /* ------------------------------ the head ------------------------------ */

  const pointer = watchPointer(window, canvas)

  stage.loop((dt, now) => {
    if (!dragging) {
      // After a flick it coasts, then settles back to its own slow turn.
      const resume = now - lastDrag > RESUME_AFTER_MS ? 1 : 0
      spinV += ((resume ? SPIN : 0) - spinV) * Math.min(1, dt * (resume ? 0.8 : 2.5))
      yaw += spinV * dt
    }
    robot.root.rotation.y = THREE.MathUtils.degToRad(yaw)

    const watching = pointer.inside && now - pointer.lastAt < IDLE_AFTER_MS
    const want = watching ? aimAt(robot, camera, pointer, { maxPan: 80, maxTilt: 30, letGo: 100 }) : { pan: 0, tilt: 4 }
    robot.pose({ pan: pan.step(want.pan, dt), tilt: Math.max(-1, tilt.step(want.tilt, dt)) })

    drawCompanion(robot.ctx, OWN_MOODS[mood], now, 0, watching ? gazeFor(robot, camera, pointer) : { x: 0, y: 0 })
    robot.update()
  })

  const onResize = () => fit()
  window.addEventListener('resize', onResize)

  return {
    setShell: robot.setShell,
    dispose: () => {
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      pointer.dispose()
      robot.dispose()
      stage.dispose()
    },
  }
}
