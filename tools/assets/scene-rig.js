/**
 * The robot, built from its seven printed parts and rigged to move.
 *
 * The parts are placed from `assembly.json`, which solve_assembly.py works out
 * by correlating each part's surface against the assembled preview. Nothing
 * here is positioned by eye.
 *
 * Three groups, matching the two servos:
 *
 *   Base      06_base + 07_bottom_cover            fixed to the desk
 *   Neck_Pan  02_neck + 03_neck_cover + pivot      turns about the vertical
 *   Head_Tilt 01_head + 04_horn_plate + CoreS3     nods about the horizontal
 *
 * The CoreS3 is modelled rather than printed — it is a bought part, so the
 * head STL is an open frame with a cavity for it. It rides with the head.
 *
 * Axes come from the parts themselves: the pan axis is the neck's own centre
 * line, and the tilt axis runs through the horn plate and the pivot plate,
 * which are the two ends of the head's hinge.
 */

export const CORE = { w: 54.0, h: 54.0, d: 16.5 }
export const SCREEN = { w: 40.8, h: 30.6, px: [320, 240] }

/** Per the assembly notes: tilt 0-90 degrees, pan +/-90. */
export const RANGE = { panMax: 90, tiltMin: -1, tiltMax: 90 }

const GROUPS = {
  base: ['06_base.stl', '07_bottom_cover.stl'],
  pan: ['02_neck.stl', '03_neck_cover.stl', '05_pivot_plate.stl'],
  tilt: ['01_head.stl', '04_horn_plate.stl'],
}

export async function buildRig(THREE, STLLoader, {
  shellHex = '#2b2d31', mergeVertices = null,
} = {}) {
  const assembly = await fetch('/tools/assets/assembly.json').then((r) => r.json())
  const loader = new STLLoader()

  const printed = new THREE.MeshPhysicalMaterial({
    color: shellHex, roughness: 0.62, metalness: 0.0,
    clearcoat: 0.22, clearcoatRoughness: 0.5,
  })

  async function placed(name) {
    const spec = assembly[name]
    if (!spec) throw new Error(`no solved placement for ${name}`)
    let geo = await new Promise((res, rej) =>
      loader.load(`/assets-src/stl/${name}`, res, undefined, rej))
    if (mergeVertices) geo = mergeVertices(geo, 1e-4)

    // The solver reports the rotation and where the rotated part's minimum
    // corner lands. Re-derive that corner here rather than storing it, so the
    // geometry and the number can never disagree.
    const r = spec.rotation
    const m = new THREE.Matrix4().set(
      r[0][0], r[0][1], r[0][2], 0,
      r[1][0], r[1][1], r[1][2], 0,
      r[2][0], r[2][1], r[2][2], 0,
      0, 0, 0, 1,
    )
    geo.applyMatrix4(m)
    geo.computeBoundingBox()
    const min = geo.boundingBox.min
    const t = spec.translation
    geo.translate(t[0] - min.x, t[1] - min.y, t[2] - min.z)
    geo.computeVertexNormals()

    const mesh = new THREE.Mesh(geo, printed)
    mesh.name = name.replace(/^\d+_|\.stl$/g, '')
    return mesh
  }

  const root = new THREE.Group()
  root.name = 'Robot'
  // The STLs are Z-up; three is Y-up. One rotation at the root keeps every
  // solved coordinate below in the millimetres the CAD uses.
  root.rotation.x = -Math.PI / 2

  const base = new THREE.Group(); base.name = 'Base'
  const pan = new THREE.Group(); pan.name = 'Neck_Pan'
  const tilt = new THREE.Group(); tilt.name = 'Head_Tilt'

  for (const name of GROUPS.base) base.add(await placed(name))
  const panParts = []
  for (const name of GROUPS.pan) { const m = await placed(name); panParts.push(m); pan.add(m) }
  const tiltParts = []
  for (const name of GROUPS.tilt) { const m = await placed(name); tiltParts.push(m); tilt.add(m) }

  /* ----------------------------- the axes ----------------------------- */

  const boxOf = (meshes) => {
    const b = new THREE.Box3()
    for (const m of meshes) b.expandByObject(m)
    return b
  }

  // Measure everything while every part is still in plain CAD coordinates.
  const neckMid = boxOf([panParts[0]]).getCenter(new THREE.Vector3())
  const horn = boxOf([tiltParts[1]]).getCenter(new THREE.Vector3())
  const pivotPlate = boxOf([panParts[2]]).getCenter(new THREE.Vector3())
  const headBox = boxOf([tiltParts[0]])

  // Pan: the neck's own vertical centre line. Tilt: the line between the horn
  // plate and the pivot plate, which are the two ends of the head's hinge.
  const panAxis = new THREE.Vector3(neckMid.x, neckMid.y, 0)
  const hinge = new THREE.Vector3(
    0, (horn.y + pivotPlate.y) / 2, (horn.z + pivotPlate.z) / 2)

  /* ---------------------------- the CoreS3 ---------------------------- */

  // Built in CAD coordinates with the rest, then shifted with the head.
  const core = new THREE.Mesh(roundedBox(THREE, CORE.w, CORE.d, CORE.h, 3.4),
    new THREE.MeshPhysicalMaterial({
      color: '#1d1f22', roughness: 0.38, metalness: 0.05, clearcoat: 0.4,
    }))
  core.name = 'CoreS3'
  core.position.set(
    (headBox.min.x + headBox.max.x) / 2,
    headBox.max.y - CORE.d / 2 - 1.0,
    (headBox.min.z + headBox.max.z) / 2 + 1.5,
  )
  tilt.add(core)

  const faceY = core.position.y + CORE.d / 2 + 0.2
  const bezel = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN.w + 4.2, SCREEN.h + 11),
    new THREE.MeshPhysicalMaterial({ color: '#0a0b0d', roughness: 0.12, clearcoat: 1 }))
  bezel.rotation.x = -Math.PI / 2
  bezel.position.set(core.position.x, faceY, core.position.z)
  bezel.name = 'Screen_Bezel'
  tilt.add(bezel)

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
    new THREE.MeshBasicMaterial({ color: '#0b1a24', toneMapped: false }))
  screen.rotation.x = -Math.PI / 2
  screen.position.set(core.position.x, faceY + 0.25, core.position.z + 1.6)
  screen.name = 'Screen'
  tilt.add(screen)

  /* --------------------------- the hierarchy --------------------------- */

  // Each group's contents move back by its own axis, and the group moves
  // forward by the same amount: the parts stay put and the group now turns
  // about the right line. The offset is applied in exactly one place per
  // child — to the geometry when the child carries its position in its
  // vertices, to the transform when it does not. Doing both moves it twice.
  shiftInto(tilt, hinge)
  shiftInto(pan, panAxis)

  // tilt becomes a child of pan, so its own origin is now expressed in pan's
  // frame rather than the world's.
  tilt.position.copy(hinge).sub(panAxis)
  pan.add(tilt)

  root.add(base)
  root.add(pan)

  /**
   * Point the head, in degrees, clamped to what the servos reach.
   *
   * Exposed rather than left to the caller because the axis is not the one
   * you would guess: inside the rig the CAD frame still applies, so the
   * vertical the head pans about is Z, not Y. Setting pan.rotation.y tips the
   * whole head sideways off the base, which is a convincing enough failure to
   * be worth making unreachable.
   */
  function setPose(panDeg, tiltDeg) {
    const p = THREE.MathUtils.clamp(panDeg, -RANGE.panMax, RANGE.panMax)
    const t = THREE.MathUtils.clamp(tiltDeg, RANGE.tiltMin, RANGE.tiltMax)
    pan.rotation.z = THREE.MathUtils.degToRad(p)
    tilt.rotation.x = THREE.MathUtils.degToRad(t)
  }

  return { root, base, pan, tilt, screen, shellMaterial: printed, setPose }
}

/**
 * Move a group's contents back by `pivot`, and the group forward by it.
 *
 * A part loaded from an STL carries its placement in its vertices and sits at
 * position (0,0,0); a part built here carries it in its transform and has a
 * zeroed geometry. Each needs the offset applied once, to whichever of the
 * two actually holds its position — applying it to both moves the part twice,
 * which scatters the robot across the frame.
 */
function shiftInto(group, pivot) {
  for (const child of group.children) {
    if (child.position.lengthSq() === 0 && child.geometry) {
      child.geometry.translate(-pivot.x, -pivot.y, -pivot.z)
      child.geometry.computeBoundingBox()
    } else {
      child.position.sub(pivot)
    }
  }
  group.position.copy(pivot)
}

/** A box with rounded edges, centred on its own origin. Y is its thickness. */
function roundedBox(THREE, w, d, h, r) {
  const shape = new THREE.Shape()
  const x = w / 2, z = h / 2
  shape.moveTo(-x + r, -z)
  shape.lineTo(x - r, -z); shape.quadraticCurveTo(x, -z, x, -z + r)
  shape.lineTo(x, z - r); shape.quadraticCurveTo(x, z, x - r, z)
  shape.lineTo(-x + r, z); shape.quadraticCurveTo(-x, z, -x, z - r)
  shape.lineTo(-x, -z + r); shape.quadraticCurveTo(-x, -z, -x + r, -z)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6,
    bevelSegments: 2, curveSegments: 8,
  })
  geo.translate(0, 0, -d / 2)
  // Extrusion runs along +Z, but inside the rig the CAD axes still apply:
  // X is width, Y is front-to-back and Z is up. Standing the box up puts its
  // thickness across the head rather than through it.
  geo.rotateX(-Math.PI / 2)
  geo.computeVertexNormals()
  return geo
}
