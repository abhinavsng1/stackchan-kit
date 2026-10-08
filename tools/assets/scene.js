/**
 * The robot, assembled in three.js.
 *
 * This file runs in a browser — under Playwright for the asset build, and it
 * is the same description the live model on the site loads. One scene
 * definition rather than two is the whole point: a render in the gallery and
 * the model you can drag cannot drift apart if they were built from the same
 * geometry.
 *
 * Units are millimetres throughout, taken from the STLs, so a number here can
 * be checked against a ruler against a real unit.
 *
 * What comes from the print files and what does not:
 *
 *   shell, brackets   printed parts, loaded from assets-src/stl/
 *   CoreS3 head       not a printed part. A rounded box at the published
 *                     54.0 x 54.0 x 16.5 mm with the 2.0" 4:3 screen inset.
 *   base and feet     modelled here from photographs of a batch 01 unit.
 *                     The legs were redesigned after the STLs in this repo
 *                     were cut, and the new print files do not exist on this
 *                     machine. Every dimension below is read off the photos
 *                     against the shell's known 54 mm width, so it is a
 *                     likeness rather than the part. See BASE_PROVENANCE.
 */

export const BASE_PROVENANCE =
  'Base and feet modelled from photographs of a batch 01 unit, scaled against '
  + 'the shell. Not cut from the production print files.'

/** M5Stack CoreS3 Lite, from the datasheet. */
export const CORE = { w: 54.0, h: 54.0, d: 16.5 }
/** The 2.0" 4:3 panel. */
export const SCREEN = { w: 40.8, h: 30.6, px: [320, 240] }

export const PART_URLS = {
  shell: '/assets-src/stl/shell_SCS0009.stl',
  feet: '/assets-src/stl/feet_SCS0009.stl',
  bracketF: '/assets-src/stl/bracket_SCS0009_f.stl',
  bracketB: '/assets-src/stl/bracket_SCS0009_b.stl',
}

/**
 * Build the whole robot.
 *
 * Node names are fixed — Base, Neck_Pan, Head_Tilt, Screen — because the live
 * component drives the rig by looking them up, and the GLB export carries them
 * through.
 */
export async function buildRobot(THREE, STLLoader, {
  shellColour = '#2a2b2e', mergeVertices = null, simplify = null,
} = {}) {
  const loader = new STLLoader()
  /**
   * STL has no concept of a shared vertex: every triangle carries its own
   * three, so a 16k-triangle shell arrives as 48k positions with every
   * interior vertex repeated six times. Indexing it is the single biggest
   * size win available and it changes nothing about the shape.
   *
   * `simplify` then decimates for the web model only. The renders use the
   * full-resolution geometry, because a still has no frame budget to protect.
   */
  const load = async (url) => {
    let geo = await new Promise((res, rej) => loader.load(url, res, undefined, rej))
    if (mergeVertices) geo = mergeVertices(geo, 1e-4)
    if (simplify) geo = simplify(geo)
    geo.computeVertexNormals()
    return geo
  }

  const printed = new THREE.MeshPhysicalMaterial({
    color: shellColour,
    // Matte PLA. A printed part is rough and slightly translucent at the
    // edges; a default material reads as injection-moulded ABS.
    roughness: 0.78, metalness: 0.0, clearcoat: 0.08, clearcoatRoughness: 0.6,
    sheen: 0.25, sheenColor: new THREE.Color('#555'),
  })
  const coreBody = new THREE.MeshPhysicalMaterial({
    color: '#d8d8d6', roughness: 0.42, metalness: 0.0, clearcoat: 0.35,
  })
  const bezel = new THREE.MeshPhysicalMaterial({
    color: '#1b1c1f', roughness: 0.25, metalness: 0.1, clearcoat: 0.9,
  })

  const root = new THREE.Group()
  root.name = 'Robot'

  /* ------------------------------ base ------------------------------ */

  const base = new THREE.Group()
  base.name = 'Base'

  // Chamfered body block. The photographed unit has a clear bevel along the
  // front top edge, which is what stops it reading as a plain cuboid.
  const body = new THREE.Mesh(roundedBox(THREE, 46, 26, 40, 3), printed)
  body.position.set(0, 13, 0)
  body.name = 'Base_Body'
  base.add(body)

  // Two stub feet, wider than the old printed feet — this is the change that
  // took the previous model off the page.
  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(roundedBox(THREE, 17, 15, 31, 3.5), printed)
    foot.position.set(side * 31, 7.5, 1)
    foot.name = side < 0 ? 'Foot_L' : 'Foot_R'
    base.add(foot)
  }

  root.add(base)

  /* ---------------------------- pan stage ---------------------------- */

  const pan = new THREE.Group()
  pan.name = 'Neck_Pan'
  // The pan axis is vertical through the servo output shaft, which sits on the
  // body's centre line. Measured from the bracket STL's own origin.
  pan.position.set(0, 26, 0)

  const turntable = new THREE.Mesh(
    new THREE.CylinderGeometry(19, 20, 7, 48), printed)
  turntable.position.y = 3.5
  turntable.name = 'Pan_Turntable'
  pan.add(turntable)

  const [bf, bb] = await Promise.all([load(PART_URLS.bracketF), load(PART_URLS.bracketB)])
  for (const [geo, z, name] of [[bf, 6, 'Bracket_F'], [bb, -9, 'Bracket_B']]) {
    geo.center()
    const m = new THREE.Mesh(geo, printed)
    // The STLs are cut flat for printing, Z up. Stand them up.
    m.rotation.x = -Math.PI / 2
    m.position.set(0, 20, z)
    m.name = name
    pan.add(m)
  }

  /* ---------------------------- tilt stage ---------------------------- */

  const tilt = new THREE.Group()
  tilt.name = 'Head_Tilt'
  // Horizontal axis through the tilt servo's output shaft, 34 mm above the
  // turntable — the height the brackets carry it to.
  tilt.position.set(0, 34, 0)
  pan.add(tilt)

  const shellGeo = await load(PART_URLS.shell)
  shellGeo.center()
  const shell = new THREE.Mesh(shellGeo, printed)
  // The STL is cut flat for printing, Z up, with its open face toward -Z.
  // Stand it up, then turn it to face the camera so the CoreS3 sits inside
  // the opening rather than behind the back wall.
  shell.rotation.set(-Math.PI / 2, 0, 0)
  shell.rotateZ(Math.PI)
  shell.position.set(0, 4, -2)
  shell.name = 'Shell'
  tilt.add(shell)

  // The CoreS3 itself: a rounded box, not a printed part.
  const core = new THREE.Mesh(roundedBox(THREE, CORE.w, CORE.h, CORE.d, 4), coreBody)
  core.position.set(0, 4, 13)
  core.name = 'CoreS3'
  tilt.add(core)

  // Place the screen off the head's real front face, not its nominal depth:
  // the rounded box carries a bevel, so its geometry is slightly deeper than
  // CORE.d and a screen positioned at the nominal face ends up buried inside
  // the head, invisible and lighting nothing.
  core.geometry.computeBoundingBox()
  const front = core.position.z + core.geometry.boundingBox.max.z

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN.w + 3.6, SCREEN.h + 10), bezel)
  glass.position.set(0, 4, front + 0.3)
  glass.name = 'Screen_Bezel'
  tilt.add(glass)

  // Its own mesh with clean 0-1 UVs: the face texture is swapped per render
  // and animated live.
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
    new THREE.MeshBasicMaterial({ color: '#0b1a24', toneMapped: false }),
  )
  screen.position.set(0, 6.4, front + 0.6)
  screen.name = 'Screen'
  tilt.add(screen)

  root.add(pan)
  return { root, base, pan, tilt, screen }
}

/** A box with rounded vertical edges, which is what a printed part looks like. */
function roundedBox(THREE, w, h, d, r) {
  const shape = new THREE.Shape()
  const x = w / 2, z = d / 2
  shape.moveTo(-x + r, -z)
  shape.lineTo(x - r, -z); shape.quadraticCurveTo(x, -z, x, -z + r)
  shape.lineTo(x, z - r); shape.quadraticCurveTo(x, z, x - r, z)
  shape.lineTo(-x + r, z); shape.quadraticCurveTo(-x, z, -x, z - r)
  shape.lineTo(-x, -z + r); shape.quadraticCurveTo(-x, -z, -x + r, -z)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 2,
    curveSegments: 8,
  })
  // rotateX(-90) maps the extrusion axis (+Z, running 0..h) onto +Y, so the
  // box already sits with its base at y=0. Translating by +h/2 would lift it
  // clear of its own origin; -h/2 is what centres it.
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, -h / 2, 0)
  geo.computeVertexNormals()
  return geo
}
