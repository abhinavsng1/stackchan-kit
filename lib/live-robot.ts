import * as THREE from 'three'
import { OWN_MOODS, drawCompanion } from '@/lib/companion-face'
import { buildRobot, loadBody, type Colourway } from '@/lib/robot-body'
import { aimAt, gazeFor, makeStage, Servo, wanderer, watchPointer } from '@/lib/live-stage'

/**
 * The hero's robot: one live robot, watching the cursor anywhere on the
 * first screen.
 *
 * The robot, its finish and its lighting come from lib/robot-body.ts, the
 * same definition every render uses, so the hero and the pictures of it
 * cannot drift. Its framing matches the render that stands in for it while it
 * loads (float-shell-*.webp), so the hand-over is invisible.
 *
 * A head that swings 90 degrees to follow a mouse reads as a turret; this one
 * leans, inside what the servos reach, and eases like a servo does.
 */
const PAN_LIMIT = 55
const TILT_MAX = 30
/** How long without a pointer before it starts looking around by itself. */
const IDLE_AFTER_MS = 5000
/** Front three-quarter from the speaker side, a little above. */
const VIEW = { az: 26, el: 10 }

export type Started = {
  setFace: (id: string) => void
  setShell: (way: Colourway) => void
  dispose: () => void
}

export async function start(
  host: HTMLElement,
  {
    onFace,
    pointerArea,
    shell = { head: '#e2581a', neck: '#18191c', base: '#e2581a' },
  }: {
    onFace?: (index: number) => void
    /** Where the pointer is watched; the hero passes the whole first screen. */
    pointerArea?: HTMLElement
    shell?: Colourway
  } = {},
): Promise<Started> {
  const parts = await loadBody()
  const stage = makeStage(host, { shadow: 0.26 })
  const { scene, camera, studio } = stage
  const robot = buildRobot(parts, shell)
  scene.add(robot.root)
  studio.adopt(robot.root)
  const screen = robot.root.getObjectByName('Screen') as THREE.Mesh

  // Framed from the model's own bounds, exactly as the render pipeline frames
  // the stand-in, so a change to the geometry cannot crop the shot.
  const box = new THREE.Box3().setFromObject(robot.root)
  studio.fitShadow(box)
  const centre = box.getCenter(new THREE.Vector3())
  const radius = box.getSize(new THREE.Vector3()).length() / 2
  let dist = 300
  const fit = () => {
    stage.resize()
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const fitH = radius / Math.sin(vFov / 2)
    const fitW = radius / Math.sin(Math.atan(Math.tan(vFov / 2) * camera.aspect))
    dist = Math.max(fitH, fitW) * 1.08
  }
  fit()
  const look = { x: 0, y: 0 }
  const place = () => {
    const az = THREE.MathUtils.degToRad(VIEW.az + look.x * 5)
    const el = THREE.MathUtils.degToRad(VIEW.el - look.y * 3)
    camera.position.set(
      centre.x + dist * Math.cos(el) * Math.sin(az),
      centre.y - 2 + dist * Math.sin(el),
      centre.z + dist * Math.cos(el) * Math.cos(az),
    )
    camera.lookAt(centre.x, centre.y - 2, centre.z)
    camera.updateMatrixWorld()
  }
  place()

  /* ------------------------------ the face ------------------------------ */

  let faceIndex = 0
  let gaze = { x: 0, y: 0 }
  const paint = (t: number) => {
    drawCompanion(robot.ctx, OWN_MOODS[faceIndex % OWN_MOODS.length], t, 0, gaze)
    robot.update()
  }
  const drawFace = (index: number) => {
    faceIndex = ((index % OWN_MOODS.length) + OWN_MOODS.length) % OWN_MOODS.length
    paint(performance.now())
    onFace?.(faceIndex)
  }
  drawFace(0)

  /* ----------------------------- the motion ----------------------------- */

  const pointer = watchPointer(pointerArea ?? host, stage.renderer.domElement)
  const pan = new Servo(), tilt = new Servo()
  const onTap = () => { drawFace(faceIndex + 1); tilt.v += 260 }
  host.addEventListener('pointerdown', onTap)
  const wander = wanderer(7)

  stage.loop((dt, now) => {
    // Left alone, it looks around on its own rather than freezing mid-stare.
    const idle = !pointer.inside && now - pointer.lastAt > IDLE_AFTER_MS
    const g = idle ? wander(now) : pointer

    look.x += (THREE.MathUtils.clamp(g.x, -1, 1) - look.x) * 0.06
    look.y += (THREE.MathUtils.clamp(g.y, -1, 1) - look.y) * 0.06
    place()
    studio.turn(look.x * 0.35)

    const want = aimAt(robot, camera, g, { maxPan: PAN_LIMIT, maxTilt: TILT_MAX })
    robot.pose({ pan: pan.step(want.pan, dt), tilt: Math.max(-1, tilt.step(want.tilt, dt)) })
    gaze = gazeFor(robot, camera, g)
    paint(now)
  })

  const onResize = () => { fit(); place() }
  window.addEventListener('resize', onResize)

  // A probe for the asset build and for debugging in a console. The screen
  // being invisible is a silent failure, so make it inspectable.
  ;(window as unknown as { __rig?: unknown }).__rig = {
    screenWorld: screen.getWorldPosition(new THREE.Vector3()).toArray(),
    screenVisible: screen.visible,
    hasMap: () => Boolean((screen.material as THREE.MeshPhysicalMaterial).emissiveMap),
    nodes: (() => { const n: string[] = []; robot.root.traverse((o) => { if (o.name) n.push(o.name) }); return n })(),
    pose: () => ({ pan: pan.x, tilt: tilt.x }),
  }

  return {
    setShell: robot.setShell,
    setFace: (id: string) => {
      const i = OWN_MOODS.findIndex((m) => m.id === id)
      if (i >= 0) drawFace(i)
    },
    dispose: () => {
      window.removeEventListener('resize', onResize)
      host.removeEventListener('pointerdown', onTap)
      pointer.dispose()
      robot.dispose()
      stage.dispose()
    },
  }
}
