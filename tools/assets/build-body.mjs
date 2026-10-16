/**
 * The body model: public/models/stackchan-body.glb.
 *
 *   node tools/assets/build-body.mjs
 *
 * Built straight from assets-src/stl/assembled_v4.stl, the assembled v4
 * preview (the body that ships: five printed parts, no screws outside), so
 * every printed part sits exactly where the CAD put it: no solving, no hand
 * placement. The file holds the five parts in their assembled positions,
 * already split by servo:
 *
 *   Robot
 *     Base          base, bottom_cover                  fixed to the desk
 *     Neck_Pan      neck, pivot_pin                     turns about Y
 *       Head_Tilt   head                                nods about X, at the hinge
 *
 * Coordinates are three's: millimetres, Y up, the face looking down +Z. The
 * pan axis is the origin's vertical; Head_Tilt sits at the hinge height so a
 * rotation of that node is the real tilt.
 *
 * Only positions and indices are stored. Normals are rebuilt at load with a
 * crease angle (lib/robot-body.ts), which keeps the fillets smooth and the
 * CAD edges sharp, and keeps the file small.
 *
 * Everything bought — the CoreS3 Lite, both SCS0009 servos, the horns, the
 * bus adapter and its DC socket — is modelled in lib/robot-body.ts.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { Document, NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SRC = join(ROOT, 'assets-src/stl/assembled_v4.stl')
const OUT = join(ROOT, 'public/models/stackchan-body.glb')

/** Height of the tilt hinge: the tilt servo's shaft and the pivot pin. */
export const TILT_Y = 51.7

/**
 * The assembled preview is the five part files concatenated in order, so
 * each part is a run of triangles. The counts are the part files' own, and
 * the bounding boxes below are checked so a re-exported preview cannot be
 * split in the wrong place silently.
 */
const PARTS = [
  ['head', 17082, 'tilt'],
  ['neck', 9906, 'pan'],
  ['pivot_pin', 2156, 'pan'],
  ['base', 11122, 'base'],
  ['bottom_cover', 3852, 'base'],
]
/** Expected CAD bounds (mm, Z up) per part, to 0.1 mm. */
const EXPECT = {
  head: [[-27, -17.69, 24.7], [27, 28.3, 78.7]],
  base: [[-23.98, -31.98, 0], [23.98, 23.98, 18.4]],
}

const buf = await readFile(SRC)
const tris = buf.readUInt32LE(80)
const total = PARTS.reduce((s, p) => s + p[1], 0)
if (tris !== total) throw new Error(`${SRC} has ${tris} triangles, expected ${total}`)

const doc = new Document()
const bin = doc.createBuffer()
const scene = doc.createScene('Robot')
const robot = doc.createNode('Robot')
scene.addChild(robot)
const groups = {
  base: doc.createNode('Base'),
  pan: doc.createNode('Neck_Pan'),
  tilt: doc.createNode('Head_Tilt').setTranslation([0, TILT_Y, 0]),
}
robot.addChild(groups.base)
robot.addChild(groups.pan)
groups.pan.addChild(groups.tilt)

let t = 0
for (const [name, count, group] of PARTS) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
  const index = new Map()
  const pos = []
  const idx = []
  const pivotY = group === 'tilt' ? TILT_Y : 0
  for (let i = 0; i < count; i++, t++) {
    const o = 84 + t * 50
    const tri = []
    for (let v = 0; v < 3; v++) {
      const x = buf.readFloatLE(o + 12 + v * 12)
      const y = buf.readFloatLE(o + 16 + v * 12)
      const z = buf.readFloatLE(o + 20 + v * 12)
      lo[0] = Math.min(lo[0], x); lo[1] = Math.min(lo[1], y); lo[2] = Math.min(lo[2], z)
      hi[0] = Math.max(hi[0], x); hi[1] = Math.max(hi[1], y); hi[2] = Math.max(hi[2], z)
      const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`
      let id = index.get(key)
      if (id === undefined) {
        id = pos.length / 3
        index.set(key, id)
        // CAD (x, y, z) with Z up and the face at -Y  ->  three (x, z, -y).
        // That is a proper rotation, so the winding survives.
        pos.push(x, z - pivotY, -y)
      }
      tri.push(id)
    }
    if (tri[0] !== tri[1] && tri[1] !== tri[2] && tri[0] !== tri[2]) idx.push(...tri)
  }
  const want = EXPECT[name]
  if (want && [0, 1, 2].some((k) => Math.abs(lo[k] - want[0][k]) > 0.1 || Math.abs(hi[k] - want[1][k]) > 0.1)) {
    throw new Error(`${name} landed at ${lo} .. ${hi}; the preview is not split where expected`)
  }
  const positions = doc.createAccessor(`${name}_pos`).setType('VEC3').setArray(new Float32Array(pos)).setBuffer(bin)
  const indices = doc.createAccessor(`${name}_idx`).setType('SCALAR')
    .setArray(pos.length / 3 < 65536 ? new Uint16Array(idx) : new Uint32Array(idx)).setBuffer(bin)
  const prim = doc.createPrimitive().setAttribute('POSITION', positions).setIndices(indices)
  const mesh = doc.createMesh(name).addPrimitive(prim)
  groups[group].addChild(doc.createNode(name).setMesh(mesh))
  console.log(`  ${name.padEnd(13)} ${String(idx.length / 3).padStart(6)} tris  ${group}`)
}

// Draco in-process, through the WASM encoder: the gltf-transform CLI pulls in
// sharp's native module, which some machines refuse to load.
doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({
  method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
})
const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(),
  'draco3d.decoder': await draco3d.createDecoderModule(),
})
await io.write(OUT, doc)
const size = (await readFile(OUT)).length
console.log(`wrote public/models/stackchan-body.glb (${(size / 1024).toFixed(0)} KB)`)
