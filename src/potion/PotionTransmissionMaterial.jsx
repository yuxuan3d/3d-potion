import { MeshTransmissionMaterial, useFBO } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { DiscardMaterial } from '@react-three/drei/materials/DiscardMaterial.js'

function useTransmissionFbo(resolution) {
  // Match Drei's MeshTransmissionMaterial behavior: width is clamped by `resolution`,
  // height follows the viewport so screen-space UV sampling stays correct.
  return useFBO(resolution, undefined, { stencilBuffer: true })
}

export default function PotionTransmissionMaterial({
  buffer,
  transmissionSampler = false,
  backside = false,
  side = THREE.FrontSide,
  transmission = 1,
  thickness = 0,
  backsideThickness = 0,
  backsideEnvMapIntensity = 1,
  samples = 10,
  resolution,
  backsideResolution,
  background,
  ...props
}) {
  const ref = useRef(null)
  const fboBack = useTransmissionFbo(backsideResolution || resolution)
  const fboMain = useTransmissionFbo(resolution)
  const [discardMaterial] = useState(() => new DiscardMaterial())

  const savedStateRef = useRef({
    toneMapping: null,
    background: null,
    envMapIntensity: null,
  })

  const effectiveBuffer = buffer || fboMain.texture

  useFrame((state) => {
    const material = ref.current
    if (!material || transmissionSampler) return

    // When a custom buffer is passed, assume the caller renders it externally.
    if (buffer) return

    const parent = material.__r3f?.parent?.object
    if (!parent) return

    savedStateRef.current.toneMapping = state.gl.toneMapping
    savedStateRef.current.background = state.scene.background
    savedStateRef.current.envMapIntensity = material.envMapIntensity

    state.gl.toneMapping = THREE.NoToneMapping
    if (background) state.scene.background = background

    parent.material = discardMaterial

    if (backside) {
      state.gl.setRenderTarget(fboBack)
      state.gl.render(state.scene, state.camera)

      parent.material = material
      parent.material.buffer = fboBack.texture
      parent.material.thickness = backsideThickness
      parent.material.side = THREE.BackSide
      parent.material.envMapIntensity = backsideEnvMapIntensity
    }

    state.gl.setRenderTarget(fboMain)
    state.gl.render(state.scene, state.camera)

    parent.material = material
    parent.material.thickness = thickness
    parent.material.side = side
    parent.material.buffer = fboMain.texture
    parent.material.envMapIntensity = savedStateRef.current.envMapIntensity

    state.scene.background = savedStateRef.current.background
    state.gl.setRenderTarget(null)
    state.gl.toneMapping = savedStateRef.current.toneMapping
  })

  const args = useMemo(() => [samples, transmissionSampler], [samples, transmissionSampler])

  return (
    <MeshTransmissionMaterial
      ref={ref}
      args={args}
      buffer={effectiveBuffer}
      // Prevent the upstream component from allocating large unused internal FBOs.
      resolution={1}
      backsideResolution={1}
      transmission={transmission}
      thickness={thickness}
      side={side}
      {...props}
    />
  )
}
