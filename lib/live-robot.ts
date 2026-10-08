import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { FACES, faceSvg, SCREEN } from '@/lib/faces'

/**
 * The live model's actual machinery, kept out of the component so none of
 * three reaches the initial bundle — the component imports this lazily, once
 * the card is near the viewport.
 *
 * The movement is the point. A head that snaps to the pointer looks like a
 * mouse-follower; a head that eases into position looks like a servo, which
 * is what the real robot has. So the angles are clamped to what the hardware
 * can actually reach and approached with a fixed per-frame fraction, which is
 * critically damped in practice: it arrives, and it never overshoots.
 */

/**
 * What the servos actually reach, from the body project's assembly notes:
 * tilt 0 to 90 degrees, pan +/-90, collision-free from -1 to 91 and +/-95.
 *
 * The cursor is mapped into a fraction of that rather than the whole of it.
 * A head that swings 90 degrees to follow a mouse reads as a turret; a head
 * that leans is the thing the real robot does when it notices you.
 */
const PAN_LIMIT = 42
const TILT_MIN = -6
const TILT_MAX = 26
/** Fraction of the remaining distance covered each frame. */
const EASE = 0.08
/** How long without a pointer before it starts looking around by itself. */
const IDLE_AFTER_MS = 5000

export type Started = { setFace: (id: string) => void; dispose: () => void }

export async function start(
  host: HTMLElement,
  { onFace }: { onFace?: (index: number) => void } = {},
): Promise<Started> {
  // Quality scales with the screen it is drawn on.
  //
  // Measured at 4x CPU throttle on a 390px viewport, full-fat settings gave
  // 28 fps. Multisampling and a 2x pixel ratio are both quadratic in pixels
  // and neither is visible on a palm-sized canvas: dropping them is most of
  // the frame budget back for no difference anyone can see. A desktop keeps
  // both, where there is headroom and the canvas is large enough to show it.
  const small = window.innerWidth < 900
  const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2))
  renderer.setSize(host.clientWidth, host.clientHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), small ? 0.12 : 0.04).texture

  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(90, 140, 120)
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.45))
  const rim = new THREE.DirectionalLight(0x9ec5ff, 0.9)
  rim.position.set(-120, 60, -90)
  scene.add(rim)

  const draco = new DRACOLoader()
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)

  const gltf = await loader.loadAsync('/models/pebble-v3.glb')
  const root = gltf.scene
  scene.add(root)

  const pan = root.getObjectByName('Neck_Pan')
  const tilt = root.getObjectByName('Head_Tilt')
  const screen = root.getObjectByName('Screen') as THREE.Mesh | undefined
  if (!pan || !tilt || !screen) {
    throw new Error('pebble.glb is missing its rig — Neck_Pan, Head_Tilt or Screen')
  }

  // Frame from the model's own bounds so a change to the geometry cannot
  // crop the shot, exactly as the render pipeline does.
  const box = new THREE.Box3().setFromObject(root)
  const centre = box.getCenter(new THREE.Vector3())
  const radius = box.getSize(new THREE.Vector3()).length() / 2
  const camera = new THREE.PerspectiveCamera(32, 4 / 3, 1, 3000)

  /**
   * Keep the drawing buffer inside a fixed pixel budget.
   *
   * Cost here is per device pixel, not per CSS pixel, so a wide canvas on a
   * 2x display is four times the work of the same canvas on a phone. Capping
   * the ratio alone does not bound that — a 1600px-wide card still asks for
   * three million pixels a frame. This holds the total instead, which is what
   * the GPU actually cares about, and lets the ratio fall where it must.
   */
  const PIXEL_BUDGET = 1_200_000

  function frame() {
    const w = host.clientWidth, h = host.clientHeight
    const want = Math.min(window.devicePixelRatio, small ? 1.5 : 2)
    const fit = Math.sqrt(PIXEL_BUDGET / Math.max(1, w * h))
    renderer.setPixelRatio(Math.max(1, Math.min(want, fit)))
    renderer.setSize(w, h)
    camera.aspect = w / h
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const fitH = radius / Math.sin(vFov / 2)
    const fitW = radius / Math.sin(Math.atan(Math.tan(vFov / 2) * camera.aspect))
    const dist = Math.max(fitH, fitW) * 1.08
    camera.position.set(centre.x + dist * 0.28, centre.y + dist * 0.2, centre.z + dist * 0.94)
    camera.lookAt(centre)
    camera.updateProjectionMatrix()
  }
  frame()

  /* ------------------------------ the face ------------------------------ */

  const canvas = document.createElement('canvas')
  canvas.width = SCREEN.w
  canvas.height = SCREEN.h
  const ctx = canvas.getContext('2d')!
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  screen.material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })

  let faceIndex = 0
  function drawFace(index: number) {
    const face = FACES[index % FACES.length]
    const img = new window.Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      texture.needsUpdate = true
    }
    img.src = 'data:image/svg+xml;base64,'
      + btoa(unescape(encodeURIComponent(faceSvg(face))))
    onFace?.(index % FACES.length)
  }
  drawFace(0)

  /* ----------------------------- the motion ----------------------------- */

  // The screen sits in the CAD frame too, so its plane is XZ and the face
  // texture needs no extra flip here.
  const want = { pan: 0, tilt: 0 }
  const shown = { pan: 0, tilt: 0 }
  let lastPointerAt = performance.now()
  let pointerInside = false

  const aim = (clientX: number, clientY: number) => {
    const r = host.getBoundingClientRect()
    const nx = ((clientX - r.left) / r.width) * 2 - 1
    const ny = ((clientY - r.top) / r.height) * 2 - 1
    want.pan = THREE.MathUtils.clamp(-nx * PAN_LIMIT, -PAN_LIMIT, PAN_LIMIT)
    want.tilt = THREE.MathUtils.clamp(ny * TILT_MAX, TILT_MIN, TILT_MAX)
    lastPointerAt = performance.now()
  }

  const onMove = (e: PointerEvent) => { pointerInside = true; aim(e.clientX, e.clientY) }
  const onLeave = () => { pointerInside = false }
  const onTap = () => { faceIndex += 1; drawFace(faceIndex) }

  host.addEventListener('pointermove', onMove, { passive: true })
  host.addEventListener('pointerleave', onLeave)
  host.addEventListener('pointerdown', onTap)

  /* ------------------------------ the loop ------------------------------ */

  let frameId = 0
  let running = false

  const tick = () => {
    if (!running) return
    frameId = requestAnimationFrame(tick)
    const now = performance.now()

    // Left alone, it looks around on its own rather than freezing mid-stare.
    if (!pointerInside && now - lastPointerAt > IDLE_AFTER_MS) {
      const t = now / 1000
      want.pan = Math.sin(t * 0.35) * 22 + Math.sin(t * 0.11) * 8
      want.tilt = Math.sin(t * 0.23) * 5
    }

    shown.pan += (want.pan - shown.pan) * EASE
    shown.tilt += (want.tilt - shown.tilt) * EASE
    // Inside the model the CAD frame still applies: the vertical the head
    // pans about is Z, not Y. Driving rotation.y tips the head off the base.
    pan!.rotation.z = THREE.MathUtils.degToRad(shown.pan)
    tilt!.rotation.x = THREE.MathUtils.degToRad(shown.tilt)
    renderer.render(scene, camera)
  }

  const run = (on: boolean) => {
    if (on === running) return
    running = on
    if (on) frameId = requestAnimationFrame(tick)
    else cancelAnimationFrame(frameId)
  }

  // Offscreen or a background tab means nobody is looking. Painting an idle
  // animation into either is a laptop fan for no reason.
  const io = new IntersectionObserver(([e]) => run(e.isIntersecting), { threshold: 0.01 })
  io.observe(host)
  const onVisibility = () => run(document.visibilityState === 'visible')
  document.addEventListener('visibilitychange', onVisibility)
  const onResize = () => frame()
  window.addEventListener('resize', onResize)
  run(true)

  return {
    setFace: (id: string) => {
      const i = FACES.findIndex((f) => f.id === id)
      if (i >= 0) { faceIndex = i; drawFace(i) }
    },
    dispose: () => {
      run(false)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      host.removeEventListener('pointerdown', onTap)
      renderer.dispose()
      pmrem.dispose()
      draco.dispose()
      renderer.domElement.remove()
    },
  }
}
