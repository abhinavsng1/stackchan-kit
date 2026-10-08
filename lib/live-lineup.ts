import * as THREE from 'three'
import { MOODS, drawCompanion } from '@/lib/companion-face'
import { buildRobot, loadBody, type Colourway } from '@/lib/robot-body'
import { aimAt, frameBox, gazeFor, makeStage, Servo, wanderer, watchPointer } from '@/lib/live-stage'

/**
 * All five colourways standing in a shallow arc, every one of them turning
 * its head to the cursor.
 *
 * Each robot aims from where it stands, so they do not turn as one: the ones
 * at the ends turn further than the one in the middle, and their servos are
 * tuned a little differently, so the heads arrive one after another. Left
 * alone they look around together. Tap one and it changes its mood and nods.
 */

/** The arc: radius and the angle between neighbours, mm and degrees. tools/assets/build-site.mjs uses the same. */
export const ARC = { radius: 300, step: 16.5 }

/** Where robot i of n stands on the arc, and which way its body faces (toward the arc's centre). */
export function arcPlace(i: number, n: number) {
  const a = THREE.MathUtils.degToRad((i - (n - 1) / 2) * ARC.step)
  return { x: ARC.radius * Math.sin(a), z: ARC.radius * (1 - Math.cos(a)), yaw: -THREE.MathUtils.radToDeg(a) }
}

const IDLE_AFTER_MS = 4000
/** A little above and a touch to the side: enough to see the arc as an arc. */
const VIEW = { az: 6, el: 15 }

export async function startLineup(host: HTMLElement, {
  shells, moods = ['pleased', 'awake', 'listening', 'pleased', 'awake'],
}: { shells: Colourway[]; moods?: string[] }): Promise<{ dispose: () => void }> {
  const parts = await loadBody()
  const stage = makeStage(host, { shadow: 0.22, budget: 1_500_000 })
  const { scene, camera, studio } = stage

  const units = shells.map((way, i) => {
    const robot = buildRobot(parts, way)
    const at = arcPlace(i, shells.length)
    robot.root.position.set(at.x, 0, at.z)
    robot.root.rotation.y = THREE.MathUtils.degToRad(at.yaw)
    scene.add(robot.root)
    studio.adopt(robot.root)
    return {
      robot, at,
      mood: Math.max(0, MOODS.findIndex((m) => m.id === moods[i % moods.length])),
      // Servos tuned a little differently, so the heads do not move in lockstep.
      pan: new Servo([70, 95, 80, 105, 75][i % 5]), tilt: new Servo([70, 95, 80, 105, 75][i % 5]),
      clock: i * 1370,
    }
  })
  scene.updateMatrixWorld(true)
  const box = new THREE.Box3()
  for (const u of units) box.expandByObject(u.robot.root)
  studio.fitShadow(box, units.map((u) => u.at))
  const target = box.getCenter(new THREE.Vector3())

  let dist = 400
  const dirFor = (dAz: number, dEl: number) => {
    const az = THREE.MathUtils.degToRad(VIEW.az + dAz), el = THREE.MathUtils.degToRad(VIEW.el + dEl)
    return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
  }
  const fit = () => { stage.resize(); dist = frameBox(camera, box, dirFor(0, 0), { target, margin: 0.96 }) }
  fit()

  const pointer = watchPointer(window, stage.renderer.domElement)
  const wander = wanderer(3)
  const look = { x: 0, y: 0 }

  // Tap a robot: it changes its mood and nods.
  const ray = new THREE.Raycaster()
  const onTap = (e: PointerEvent) => {
    const r = stage.renderer.domElement.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)), camera)
    const hit = ray.intersectObjects(units.map((u) => u.robot.root), true)[0]
    if (!hit) return
    const u = units.find((v) => { let o: THREE.Object3D | null = hit.object; while (o) { if (o === v.robot.root) return true; o = o.parent } return false })
    if (u) { u.mood = (u.mood + 1) % MOODS.length; u.tilt.v += 260 }
  }
  host.addEventListener('pointerdown', onTap)

  const paint = (u: (typeof units)[number], now: number, gaze: { x: number; y: number }) => {
    drawCompanion(u.robot.ctx, MOODS[u.mood], now + u.clock, 0, gaze)
    u.robot.update()
  }

  stage.loop((dt, now) => {
    const idle = !pointer.inside || now - pointer.lastAt > IDLE_AFTER_MS
    const g = idle ? wander(now) : pointer

    look.x += (THREE.MathUtils.clamp(g.x, -1, 1) - look.x) * 0.05
    look.y += (THREE.MathUtils.clamp(g.y, -1, 1) - look.y) * 0.05
    camera.position.copy(target).addScaledVector(dirFor(look.x * 4, -look.y * 2), dist)
    camera.lookAt(target)
    camera.updateMatrixWorld()
    studio.turn(look.x * 0.3)

    for (const u of units) {
      const want = aimAt(u.robot, camera, g, { maxPan: 70, maxTilt: 30 })
      u.robot.pose({ pan: u.pan.step(want.pan, dt), tilt: Math.max(-1, u.tilt.step(want.tilt, dt)) })
      paint(u, now, gazeFor(u.robot, camera, g))
    }
  })

  const onResize = () => fit()
  window.addEventListener('resize', onResize)

  return {
    dispose: () => {
      window.removeEventListener('resize', onResize)
      host.removeEventListener('pointerdown', onTap)
      pointer.dispose()
      for (const u of units) u.robot.dispose()
      stage.dispose()
    },
  }
}

