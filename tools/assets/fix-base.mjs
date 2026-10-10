/**
 * Turn the base of the shipped model round, in place.
 *
 * scene-rig.js now builds the base facing the way a real unit has it (feet
 * forward, under the screen). This applies the same half turn to the
 * already-optimised public/models/pebble-v3.glb, so the live robot is fixed
 * without re-running the whole solve and compression pipeline. It is
 * idempotent: it sets the transform outright rather than adding to it.
 *
 *   node tools/assets/fix-base.mjs
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'

const FILE = new URL('../../public/models/pebble-v3.glb', import.meta.url).pathname

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  })

const doc = await io.read(FILE)
const nodes = doc.getRoot().listNodes()
const base = nodes.find((n) => n.getName() === 'Base')
const pan = nodes.find((n) => n.getName() === 'Neck_Pan')
if (!base || !pan) throw new Error('pebble-v3.glb is missing Base or Neck_Pan')

// The pan axis, in the Robot node's frame (CAD millimetres, Z up).
const [ax, ay] = pan.getTranslation()
// Half a turn about local Z through (ax, ay): p' = 2a - p in XY.
base.setTranslation([2 * ax, 2 * ay, 0])
base.setRotation([0, 0, 1, 0]) // quaternion for 180 degrees about Z

await io.write(FILE, doc)
console.log(`Base turned about the pan axis at (${ax.toFixed(2)}, ${ay.toFixed(2)})`)
