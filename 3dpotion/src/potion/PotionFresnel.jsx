import * as THREE from 'three'

import ModelLayer from './ModelLayer.jsx'
import './FresnelRimMaterial.jsx'
import { MODEL_FRESNEL, MODEL_INNER, POTION_RENDER_ORDER } from './constants.js'

export function PotionInnerRim({
  rimColor = '#9ae6ff',
  rimPower = 5.0,
  rimIntensity = 0.5,
  rimOpacity = 0.1,
  ...props
}) {
  return (
    <ModelLayer
      url={MODEL_INNER}
      renderOrder={POTION_RENDER_ORDER.innerRim}
      castShadow={false}
      receiveShadow={false}
      inject={
        <fresnelRimMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          rimPower={rimPower}
          rimIntensity={rimIntensity}
          opacity={rimOpacity}
          rimColor={rimColor}
        />
      }
      {...props}
    />
  )
}

export function PotionOuterFresnel({
  rimColor = '#a9e0fa',
  rimPower = 4.0,
  rimIntensity = 0.8,
  rimOpacity = 0.5,
  ...props
}) {
  return (
    <ModelLayer
      url={MODEL_FRESNEL}
      renderOrder={POTION_RENDER_ORDER.outerFresnel}
      castShadow={false}
      receiveShadow={false}
      inject={
        <fresnelRimMaterial
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          rimPower={rimPower}
          rimIntensity={rimIntensity}
          opacity={rimOpacity}
          rimColor={rimColor}
        />
      }
      {...props}
    />
  )
}
