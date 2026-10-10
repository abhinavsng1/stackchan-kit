/**
 * The v3 body, as it is actually printed.
 *
 * `assembled_v3.stl` is the real assembled preview from the body project, so
 * the shell, neck and base are the parts themselves rather than anything
 * modelled from a photograph. 43k triangles, 54 x 60 x 79 mm.
 *
 * What the STL does not contain is the CoreS3 module — that is a bought part,
 * not a printed one, so the head arrives as an open frame with a cavity. The
 * screen is the single most important thing in a product shot, so the module
 * and its panel are added here: a rounded box at the published
 * 54 x 54 x 16.5 mm, seated in the cavity with the panel flush to the front
 * opening.
 *
 * Orientation, established by rendering the mesh from each axis rather than
 * assumed: the STL is Z-up, so it stands with `rotation.x = -PI/2`, and the
 * head's open front — the thin rim, not the one with the two M3 bosses the
 * assembly notes say you reach the Lite's screws through — faces -Z.
 */

export const CORE = { w: 54.0, h: 54.0, d: 16.5 }
export const SCREEN = { w: 40.8, h: 30.6, px: [320, 240] }

/** Shell colours. The shell is printed, so a colourway is a spool change. */
export const SHELLS = [
  { id: 'graphite', name: 'Graphite', hex: '#2b2d31' },
  { id: 'bone', name: 'Bone', hex: '#e9e6df' },
  { id: 'signal', name: 'Signal', hex: '#5ce1e6' },
  { id: 'ember', name: 'Ember', hex: '#d2552f' },
  { id: 'moss', name: 'Moss', hex: '#7f9b55' },
]

export async function buildV3(THREE, STLLoader, { shellHex = '#2b2d31', mergeVertices = null } = {}) {
  const geo = await new Promise((res, rej) =>
    new STLLoader().load('/assets-src/stl/assembled_v3.stl', res, undefined, rej))
  if (mergeVertices) {
    const merged = mergeVertices(geo, 1e-4)
    merged.computeVertexNormals()
    return assemble(THREE, merged, shellHex)
  }
  geo.computeVertexNormals()
  return assemble(THREE, geo, shellHex)
}

function assemble(THREE, geo, shellHex) {
  const printed = new THREE.MeshPhysicalMaterial({
    color: shellHex,
    // Matte PLA: rough, with a weak clearcoat for the sheen a printed wall
    // has along its layer lines. Fully matte reads as clay.
    roughness: 0.62, metalness: 0.0,
    clearcoat: 0.22, clearcoatRoughness: 0.5,
  })

  const root = new THREE.Group()
  root.name = 'Robot'

  const body = new THREE.Mesh(geo, printed)
  body.rotation.x = -Math.PI / 2
  body.name = 'Body'
  root.add(body)

  // Where the printed parts actually are, measured off the mesh rather than
  // taken from the drawing.
  const bounds = new THREE.Box3().setFromObject(body)

  const core = new THREE.Mesh(roundedBox(THREE, CORE.w, CORE.h, CORE.d, 3.4),
    new THREE.MeshPhysicalMaterial({
      color: '#1d1f22', roughness: 0.38, metalness: 0.05, clearcoat: 0.4,
    }))
  // Seated in the head cavity: centred on X, top of the model down by half
  // the module, and pushed forward so the panel sits in the opening.
  const headTop = bounds.max.y
  core.position.set(0, headTop - CORE.h / 2 - 2.0, bounds.min.z + CORE.d / 2 + 1.2)
  core.name = 'CoreS3'
  root.add(core)

  core.geometry.computeBoundingBox()
  const front = core.position.z + core.geometry.boundingBox.min.z

  const bezel = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN.w + 4.2, SCREEN.h + 11),
    new THREE.MeshPhysicalMaterial({ color: '#0a0b0d', roughness: 0.12, clearcoat: 1 }))
  bezel.position.set(0, core.position.y + 1.2, front - 0.25)
  bezel.rotation.y = Math.PI
  bezel.name = 'Screen_Bezel'
  root.add(bezel)

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
    new THREE.MeshBasicMaterial({ color: '#0b1a24', toneMapped: false }))
  screen.position.set(0, core.position.y + 2.4, front - 0.5)
  screen.rotation.y = Math.PI
  screen.name = 'Screen'
  root.add(screen)

  return { root, screen, shellMaterial: printed, bounds }
}

/** A box with rounded vertical edges, centred on its own origin. */
function roundedBox(THREE, w, h, d, r) {
  const shape = new THREE.Shape()
  const x = w / 2, z = d / 2
  shape.moveTo(-x + r, -z)
  shape.lineTo(x - r, -z); shape.quadraticCurveTo(x, -z, x, -z + r)
  shape.lineTo(x, z - r); shape.quadraticCurveTo(x, z, x - r, z)
  shape.lineTo(-x + r, z); shape.quadraticCurveTo(-x, z, -x, z - r)
  shape.lineTo(-x, -z + r); shape.quadraticCurveTo(-x, -z, -x + r, -z)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6,
    bevelSegments: 2, curveSegments: 8,
  })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, -h / 2, 0)
  geo.computeVertexNormals()
  return geo
}
