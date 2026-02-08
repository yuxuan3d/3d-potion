import { Clone } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function useSceneClone(url, renderOrder) {
  const gltf = useLoader(GLTFLoader, url)

  return useMemo(() => {
    const clonedScene = gltf.scene.clone(true)
    clonedScene.traverse((child) => {
      if (!child.isMesh) return
      child.renderOrder = renderOrder
    })
    return clonedScene
  }, [gltf.scene, renderOrder])
}

export default function ModelLayer({ url, renderOrder, inject, castShadow = true, receiveShadow = true, ...props }) {
  const scene = useSceneClone(url, renderOrder)

  return (
    <Clone
      object={scene}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      inject={inject}
      {...props}
    />
  )
}
