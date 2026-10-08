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

/**
 * The arc: radius and the angle between neighbours, mm and degrees, and how
 * far alternate robots step forward and back. tools/assets/build-site.mjs
 * uses the same numbers.
 *
 * Compact is for a phone, where the row is as wide as the screen allows:
 * the robots stand closer, and every other one steps back so the heads can
 * still turn without touching — a 55 mm gap alone would let two heads turned
 * the same way collide, staggered 60 mm they clear at any angle.
 */
export const ARC = { radius: 300, step: 16.5, stagger: 0 }
export const ARC_COMPACT = { radius: 300, step: 10.5, stagger: 30 }
/** Below this width, in CSS pixels, the row goes compact. */
export const COMPACT_BELOW = 640

/** Where robot i of n stands on the arc, and which way its body faces (toward the arc's centre). */
export function arcPlace(i: number, n: number, compact = false) {
  const arc = compact ? ARC_COMPACT : ARC
  const a = THREE.MathUtils.degToRad((i - (n - 1) / 2) * arc.step)
  const step = i % 2 === 0 ? arc.stagger : -arc.stagger
  return { x: arc.radius * Math.sin(a), z: arc.radius * (1 - Math.cos(a)) + step, yaw: -THREE.MathUtils.radToDeg(a) }
}

const IDLE_AFTER_MS = 4000
/** A little above and a touch to the side: enough to see the arc as an arc. Compact looks straight on. */
const VIEW = { az: 6, el: 15 }
const VIEW_COMPACT = { az: 0, el: 14 }

export async function startLineup(host: HTMLElement, {
  shells, moods = ['pleased', 'awake', 'listening', 'pleased', 'awake'],
}: { shells: Colourway[]; moods?: string[] }): Promise<{ dispose: () => void }> {
  const parts = await loadBody()
  const stage = makeStage(host, { shadow: 0.22, budget: 1_500_000 })
  const { scene, camera, studio } = stage

  const units = shells.map((way, i) => {
    const robot = buildRobot(parts, way)
    const at = { x: 0, z: 0, yaw: 0 }
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
  // Lay the row out for the width it has, and frame it; again whenever the
  // width crosses into or out of compact.
  let compact: boolean | null = null
  let view = VIEW
  let dist = 400
  const box = new THREE.Box3()
  const target = new THREE.Vector3()
  const dirFor = (dAz: number, dEl: number) => {
    const az = THREE.MathUtils.degToRad(view.az + dAz), el = THREE.MathUtils.degToRad(view.el + dEl)
    return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
  }
  const fit = () => {
    stage.resize()
    const now = host.clientWidth < COMPACT_BELOW
    if (now !== compact) {
      compact = now
      view = compact ? VIEW_COMPACT : VIEW
      units.forEach((u, i) => {
        Object.assign(u.at, arcPlace(i, units.length, compact!))
        u.robot.root.position.set(u.at.x, 0, u.at.z)
        u.robot.root.rotation.y = THREE.MathUtils.degToRad(u.at.yaw)
      })
      scene.updateMatrixWorld(true)
      box.makeEmpty()
      for (const u of units) box.expandByObject(u.robot.root)
      studio.fitShadow(box, units.map((u) => u.at))
      box.getCenter(target)
    }
    dist = frameBox(camera, box, dirFor(0, 0), { target, margin: compact ? 0.99 : 0.96 })
  }
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

