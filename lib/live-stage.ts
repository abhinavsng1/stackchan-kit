import * as THREE from 'three'
import { configureRenderer, makeStudio, TILT_Y, type Robot, type Studio } from '@/lib/robot-body'

/**
 * What every live robot on the page shares: a renderer held inside a pixel
 * budget, the studio from lib/robot-body.ts, a loop that only runs while the
 * canvas is on screen, the pointer, and the maths of a head aiming at it.
 *
 * Kept out of the components so none of three reaches the initial bundle —
 * each live section imports its module lazily, once it is near the viewport.
 */

export type Stage = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  studio: Studio
  /** True on small screens: no multisampling, a lower pixel ratio. */
  small: boolean
  /** Size the drawing buffer to the host. Returns the host's aspect. */
  resize: () => number
  /** Run `tick` every frame while the canvas is on screen and the tab is visible. */
  loop: (tick: (dt: number, now: number) => void) => void
  dispose: () => void
}

export function makeStage(host: HTMLElement, {
  shadow = 0.26, budget = 1_200_000, fov = 26,
}: { shadow?: number; budget?: number; fov?: number } = {}): Stage {
  // Multisampling and a 2x pixel ratio are both quadratic in pixels and
  // neither shows on a palm-sized canvas; a desktop keeps both.
  const small = window.innerWidth < 900
  const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true })
  renderer.setClearColor(0x000000, 0)
  configureRenderer(renderer)
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'
  const scene = new THREE.Scene()
  const studio = makeStudio(renderer, scene, { ground: 'clear', shadow })
  const camera = new THREE.PerspectiveCamera(fov, 1, 5, 6000)

  /**
   * Cost is per device pixel, so a wide canvas on a 2x display is four times
   * the work of the same canvas on a phone. Hold the total, not just the ratio.
   */
  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight)
    const want = Math.min(window.devicePixelRatio, small ? 1.5 : 2)
    renderer.setPixelRatio(Math.max(1, Math.min(want, Math.sqrt(budget / (w * h)))))
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    return w / h
  }
  resize()
  host.appendChild(renderer.domElement)

  let tickFn: ((dt: number, now: number) => void) | null = null
  let frameId = 0, running = false, last = 0, onScreen = false
  const frame = () => {
    if (!running) return
    frameId = requestAnimationFrame(frame)
    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    tickFn?.(dt, now)
    renderer.render(scene, camera)
  }
  const run = (on: boolean) => {
    if (on === running) return
    running = on
    if (on) { last = performance.now(); frameId = requestAnimationFrame(frame) }
    else cancelAnimationFrame(frameId)
  }
  // Offscreen or a background tab means nobody is looking.
  const update = () => run(onScreen && document.visibilityState === 'visible')
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update() }, { threshold: 0.01 })
  io.observe(host)
  document.addEventListener('visibilitychange', update)

  return {
    renderer, scene, camera, studio, small, resize,
    loop: (tick) => { tickFn = tick; renderer.render(scene, camera) },
    dispose: () => {
      run(false)
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
      studio.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}

/**
 * Put the camera on `dir` from `target`, as close as it can be with every
 * corner of `box` inside `margin` of the frame. Works for any aspect, so a
 * wide row of robots and a tall single one both frame themselves.
 */
export function frameBox(camera: THREE.PerspectiveCamera, box: THREE.Box3, dir: THREE.Vector3, {
  target = box.getCenter(new THREE.Vector3()), margin = 0.86,
}: { target?: THREE.Vector3; margin?: number } = {}): number {
  const d = dir.clone().normalize()
  const corners: THREE.Vector3[] = []
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z))
  const q = new THREE.Vector3()
  const place = (dist: number) => {
    camera.position.copy(target).addScaledVector(d, dist)
    camera.lookAt(target)
    camera.updateMatrixWorld()
  }
  let lo = 1, hi = camera.far * 0.8
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    place(mid)
    const fits = corners.every((c) => {
      q.copy(c).project(camera)
      return q.z < 1 && Math.abs(q.x) <= margin && Math.abs(q.y) <= margin
    })
    if (fits) hi = mid; else lo = mid
  }
  place(hi)
  return hi
}

/** The pointer, as normalised device coordinates of a canvas, watched over an area. */
export type Pointer = { x: number; y: number; inside: boolean; lastAt: number; dispose: () => void }

export function watchPointer(area: HTMLElement | Window, canvas: HTMLElement): Pointer {
  const p: Pointer = { x: 0, y: 0.1, inside: false, lastAt: -Infinity, dispose: () => {} }
  const move = (e: Event) => {
    const ev = e as PointerEvent
    const r = canvas.getBoundingClientRect()
    p.x = THREE.MathUtils.clamp(((ev.clientX - r.left) / r.width) * 2 - 1, -4, 4)
    p.y = THREE.MathUtils.clamp(-(((ev.clientY - r.top) / r.height) * 2 - 1), -4, 4)
    p.inside = true
    p.lastAt = performance.now()
  }
  const leave = () => { p.inside = false }
  area.addEventListener('pointermove', move, { passive: true })
  area.addEventListener('pointerleave', leave)
  p.dispose = () => { area.removeEventListener('pointermove', move); area.removeEventListener('pointerleave', leave) }
  return p
}

/**
 * Where a robot's head should point to look at the pointer, in degrees.
 *
 * The head aims through the camera: at the point under the pointer, most of
 * the way from the camera to the robot. So it is really looking at the
 * pointer, from wherever it stands and however its body is turned. Tilt only
 * goes up — the real hinge stops at level.
 *
 * `letGo`: past this pan the pointer is behind the robot's shoulder, and it
 * looks ahead again rather than wrenching its head round.
 */
const _ray = new THREE.Raycaster()
const _head = new THREE.Vector3(), _aim = new THREE.Vector3(), _ndc = new THREE.Vector2()
export function aimAt(robot: Robot, camera: THREE.Camera, ndc: { x: number; y: number }, {
  reach = 0.72, maxPan = 55, maxTilt = 30, letGo = Infinity,
}: { reach?: number; maxPan?: number; maxTilt?: number; letGo?: number } = {}): { pan: number; tilt: number } {
  _ray.setFromCamera(_ndc.set(ndc.x, ndc.y), camera)
  robot.root.getObjectByName('Head_Tilt')!.getWorldPosition(_head)
  _ray.ray.at(camera.position.distanceTo(_head) * reach, _aim)
  robot.root.worldToLocal(_aim)
  const pan = THREE.MathUtils.radToDeg(Math.atan2(_aim.x, _aim.z))
  if (Math.abs(pan) > letGo) return { pan: 0, tilt: 0 }
  const tilt = THREE.MathUtils.radToDeg(Math.atan2(_aim.y - TILT_Y, Math.hypot(_aim.x, _aim.z)))
  return {
    pan: THREE.MathUtils.clamp(pan, -maxPan, maxPan),
    tilt: THREE.MathUtils.clamp(tilt, 0, maxTilt),
  }
}

/**
 * A servo: a critically damped spring with a top speed, in degrees. It
 * arrives and never overshoots, which is what reads as a motor rather than a
 * mouse-follower.
 */
export class Servo {
  x = 0
  v = 0
  constructor(public stiffness = 85, public maxSpeed = 400) {}
  step(target: number, dt: number) {
    const a = (target - this.x) * this.stiffness - this.v * 2 * Math.sqrt(this.stiffness)
    this.v = THREE.MathUtils.clamp(this.v + a * dt, -this.maxSpeed, this.maxSpeed)
    this.x += this.v * dt
    return this.x
  }
}

/** Where on the face the eyes look, in cells, from the pointer and where the head is on screen. */
const _p = new THREE.Vector3()
export function gazeFor(robot: Robot, camera: THREE.Camera, ndc: { x: number; y: number }) {
  robot.root.getObjectByName('Head_Tilt')!.getWorldPosition(_p).project(camera)
  return {
    x: Math.round(THREE.MathUtils.clamp((ndc.x - _p.x) * 1.6, -1, 1) * 2) / 2,
    y: Math.round(THREE.MathUtils.clamp(-(ndc.y - _p.y) * 1.2, -0.5, 1) * 2) / 2,
  }
}

/** A gaze target that wanders on its own, for when nobody is pointing. */
export function wanderer(seed = 0) {
  const t = { x: 0, y: 0.1, next: 0 }
  let n = seed
  const rand = () => { n = (n * 9301 + 49297) % 233280; return n / 233280 }
  return (now: number) => {
    if (now > t.next) {
      t.x = (rand() - 0.5) * 1.4
      t.y = rand() * 0.7 - 0.15
      if (rand() < 0.3) { t.x = 0; t.y = 0.15 }
      t.next = now + 1200 + rand() * 2400
    }
    return t
  }
}
