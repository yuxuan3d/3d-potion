import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

import { MODEL_CAP, MODEL_INNER, MODEL_OUTER, POTION_RENDER_ORDER } from './constants.js'
import ModelLayer from './ModelLayer.jsx'
import { PotionInnerRim, PotionOuterFresnel } from './PotionFresnel.jsx'

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
  samples: 1,
  resolution: 1024,
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

function PotionOuterGlass(props) {
  return (
    <ModelLayer
      url={MODEL_OUTER}
      renderOrder={POTION_RENDER_ORDER.outerGlass}
      inject={<MeshTransmissionMaterial {...outerGlassMaterialProps} />}
      {...props}
    />
  )
}

function PotionInnerGlass(props) {
  return (
    <ModelLayer
      url={MODEL_INNER}
      renderOrder={POTION_RENDER_ORDER.innerGlass}
      inject={<MeshTransmissionMaterial {...innerGlassMaterialProps} side={THREE.BackSide} />}
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
  outerRimColor,
  outerRimPower,
  outerRimIntensity,
  outerRimOpacity,
  innerRimColor,
  innerRimPower,
  innerRimIntensity,
  innerRimOpacity,
}) {
  return (
    <group rotation={rotation}>
      <PotionOuterGlass />
      <PotionInnerGlass />
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
