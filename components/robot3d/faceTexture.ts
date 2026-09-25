import * as THREE from 'three'
import { faceSvg, type Face } from '@/lib/faces'

/**
 * The panel texture is the same SVG the site renders, so the face on the model
 * and the face in the atlas are the same drawing, not two interpretations.
 *
 * Only the faces are cached this way. The capability screens are live — a
 * microphone level or a camera frame changes every tick — so they are drawn
 * into a single canvas in `lib/panel.ts` instead.
 */
const cache = new Map<string, THREE.Texture>()

export function faceTexture(f: Face, closed = false): THREE.Texture {
  const key = `${f.id}:${closed ? 'shut' : 'open'}`
  const hit = cache.get(key)
  if (hit) return hit

  const svg = faceSvg(f, { eyeScaleY: closed ? 0.06 : 1 })
  const tex = new THREE.TextureLoader().load(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  )
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}

export function disposeFaceTextures() {
  for (const t of cache.values()) t.dispose()
  cache.clear()
}
