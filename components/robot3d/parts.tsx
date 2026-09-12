'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

/** Real printed parts, straight from the STLs that print the shell. */
export const PRINTED = {
  shell: '/model/shell_SCS0009.glb',
  feet: '/model/feet_SCS0009.glb',
  bracketF: '/model/bracket_SCS0009_f.glb',
  bracketB: '/model/bracket_SCS0009_b.glb',
} as const

/** Matte black PLA. Rough and slightly scattered — printed, not moulded. */
export function usePlaMaterial(color = '#15181c') {
  return useMemo(() => new THREE.MeshStandardMaterial({
    color, roughness: 0.78, metalness: 0.04,
  }), [color])
}

export function Printed({
  url, material, ...props
}: { url: string; material: THREE.Material } & React.ComponentProps<'group'>) {
  const { scene } = useGLTF(url)
  const mesh = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) { m.material = material; m.castShadow = true; m.receiveShadow = true }
    })
    return clone
  }, [scene, material])
  return <group {...props}><primitive object={mesh} /></group>
}

Object.values(PRINTED).forEach((u) => useGLTF.preload(u))
