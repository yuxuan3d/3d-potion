import { MeshTransmissionMaterial } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

import { MODEL_CAP, MODEL_INNER, MODEL_OUTER, POTION_RENDER_ORDER } from './constants.js'
import ModelLayer from './ModelLayer.jsx'
import { PotionInnerRim, PotionOuterFresnel } from './PotionFresnel.jsx'
import PotionLiquid from './PotionLiquid.jsx'

const DEFAULT_GLASS_QUALITY = { samples: 8, resolution: 2048 }

const baseGlassMaterialProps = {
  color: '#ffffff',
  transmission: 1,
  roughness: 0.02,
  metalness: 0,
  thickness: 0.02,
  ior: 1.45,
  chromaticAberration: 0,
  anisotropicBlur: 0,
  distortion: 0,
  distortionScale: 0,
  temporalDistortion: 0,
  envMapIntensity: 0.65,
}

const outerGlassMaterialProps = {
  ...baseGlassMaterialProps,
  transmissionSampler: false,
}

const innerGlassMaterialProps = {
  ...baseGlassMaterialProps,
  transmissionSampler: true,
  envMapIntensity: 0.4,
}

const capMaterialProps = {
  color: '#a67c52',
  roughness: 0.96,
  metalness: 0,
  clearcoat: 0,
  clearcoatRoughness: 1,
  reflectivity: 0.04,
  sheen: 0,
  sheenRoughness: 1,
  envMapIntensity: 0.08,
  specularIntensity: 0.22,
  specularColor: '#c49b71',
}

function PotionOuterGlass({ glassQuality, ...props }) {
  return (
    <ModelLayer
      url={MODEL_OUTER}
      renderOrder={POTION_RENDER_ORDER.outerGlass}
      inject={(
        <MeshTransmissionMaterial
          {...outerGlassMaterialProps}
          samples={glassQuality.samples}
          resolution={glassQuality.resolution}
        />
      )}
      {...props}
    />
  )
}

function PotionInnerGlass({ glassQuality, ...props }) {
  return (
    <ModelLayer
      url={MODEL_INNER}
      renderOrder={POTION_RENDER_ORDER.innerGlass}
      inject={(
        <MeshTransmissionMaterial
          {...innerGlassMaterialProps}
          samples={glassQuality.samples}
          resolution={glassQuality.resolution}
          side={THREE.BackSide}
        />
      )}
      {...props}
    />
  )
}

function PotionCap(props) {
  return (
    <ModelLayer
      url={MODEL_CAP}
      renderOrder={POTION_RENDER_ORDER.cap}
      inject={<meshPhysicalMaterial {...capMaterialProps} side={THREE.FrontSide} />}
      {...props}
    />
  )
}

export default function PotionBottle({
  rotation,
  glassQuality = DEFAULT_GLASS_QUALITY,
  outerRimColor,
  outerRimPower,
  outerRimIntensity,
  outerRimOpacity,
  innerRimColor,
  innerRimPower,
  innerRimIntensity,
  innerRimOpacity,
  liquidEnabled,
  liquidFill,
  liquidColor,
  liquidRadiusScale,
  liquidCenterYOffset,
  liquidSloshFrequency,
  liquidSloshDamping,
  liquidShowDebug,
  sloshGravityWorld,
}) {
  const bottleRef = useRef(null)

  return (
    <group ref={bottleRef} rotation={rotation}>
      <PotionLiquid
        bottleRef={bottleRef}
        enabled={liquidEnabled}
        fill={liquidFill}
        color={liquidColor}
        radiusScale={liquidRadiusScale}
        centerYOffset={liquidCenterYOffset}
        sloshFrequency={liquidSloshFrequency}
        sloshDamping={liquidSloshDamping}
        showDebug={liquidShowDebug}
        gravityWorld={sloshGravityWorld}
      />
      <PotionOuterGlass glassQuality={glassQuality} />
      <PotionInnerGlass glassQuality={glassQuality} />
      <PotionInnerRim
        rimColor={innerRimColor}
        rimPower={innerRimPower}
        rimIntensity={innerRimIntensity}
        rimOpacity={innerRimOpacity}
      />
      <PotionCap />
      <PotionOuterFresnel
        rimColor={outerRimColor}
        rimPower={outerRimPower}
        rimIntensity={outerRimIntensity}
        rimOpacity={outerRimOpacity}
      />
    </group>
  )
}
