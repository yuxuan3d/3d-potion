import { useFrame, useLoader } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { MODEL_LIQUID, POTION_RENDER_ORDER } from './constants.js'
import ModelLayer from './ModelLayer.jsx'

const FALLBACK_GRAVITY = [0, -1, 0]
const SURFACE_GEOMETRY_NORMAL = new THREE.Vector3(0, 0, 1)
const LIQUID_STENCIL_REF = 0
const LIQUID_STENCIL_MASK = 0xff

function clamp01(value) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function lerp(from, to, t) {
  return from + (to - from) * t
}

export default function PotionLiquid({
  bottleRef,
  enabled = true,
  fill = 0.55,
  color = '#d10a0a',
  radiusScale = 1.0,
  centerYOffset = 0.0,
  gravityWorld = FALLBACK_GRAVITY,
  sloshFrequency = 3.0,
  sloshDamping = 0.8,
  showDebug = false,
}) {
  const liquidGltf = useLoader(GLTFLoader, MODEL_LIQUID)
  const surfaceRef = useRef(null)

  const liquidShape = useMemo(() => {
    const scene = liquidGltf.scene
    scene.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    const minY = box.min.y
    const maxY = box.max.y

    return {
      minY,
      maxY,
      centerX: center.x,
      centerY: center.y,
      centerZ: center.z,
      capExtent: Math.max(size.x, size.z),
      horizontalRadius: Math.max(0.5 * Math.max(size.x, size.z), 1e-4),
    }
  }, [liquidGltf.scene])

  const liquidScale = Math.max(radiusScale, 1e-4)
  const radius = Math.max(liquidShape.horizontalRadius * liquidScale, 1e-4)
  const capExtent = Math.max(liquidShape.capExtent * liquidScale * 1.25, 0.5)

  const centerX = liquidShape.centerX * liquidScale
  const centerY = (liquidShape.centerY * liquidScale) + centerYOffset
  const centerZ = liquidShape.centerZ * liquidScale
  const minFillY = (liquidShape.minY * liquidScale) + centerYOffset
  const maxFillY = (liquidShape.maxY * liquidScale) + centerYOffset

  const fillHeightY = useMemo(() => {
    const clampedFill = clamp01(fill)
    return lerp(minFillY, maxFillY, clampedFill)
  }, [fill, minFillY, maxFillY])

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const clippingPlanes = useMemo(() => [clipPlane], [clipPlane])
  const localPlane = useMemo(() => new THREE.Plane(), [])

  const gravityWorldVectorRef = useRef(new THREE.Vector3(...FALLBACK_GRAVITY))
  const gravityLocalVectorRef = useRef(new THREE.Vector3(...FALLBACK_GRAVITY))
  const targetNormalLocalRef = useRef(new THREE.Vector3(0, 1, 0))
  const sloshNormalLocalRef = useRef(new THREE.Vector3(0, 1, 0))
  const sloshVelocityLocalRef = useRef(new THREE.Vector3())

  const surfacePointLocalRef = useRef(new THREE.Vector3(0, centerY, 0))
  const bottleWorldQuatRef = useRef(new THREE.Quaternion())
  const bottleWorldQuatInvRef = useRef(new THREE.Quaternion())
  const surfaceQuatRef = useRef(new THREE.Quaternion())

  const accelRef = useRef(new THREE.Vector3())
  const debugDirRef = useRef(new THREE.Vector3())

  const debugGravityArrow = useMemo(
    () => new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0), 0.4, 0x39ff14),
    [],
  )
  const debugSloshArrow = useMemo(
    () => new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.4, 0x2aa8ff),
    [],
  )

  useFrame((_, delta) => {
    if (!enabled) return

    const bottle = bottleRef?.current
    if (!bottle) return

    const step = Math.min(Math.max(delta, 0), 1 / 30)
    const safeFrequency = Math.max(0, sloshFrequency)
    const safeDamping = Math.max(0, sloshDamping)

    const omega = 2 * Math.PI * safeFrequency
    const omega2 = omega * omega
    const dampTerm = 2 * safeDamping * omega

    bottle.getWorldQuaternion(bottleWorldQuatRef.current)
    bottleWorldQuatInvRef.current.copy(bottleWorldQuatRef.current).invert()

    gravityWorldVectorRef.current.set(
      gravityWorld?.[0] ?? FALLBACK_GRAVITY[0],
      gravityWorld?.[1] ?? FALLBACK_GRAVITY[1],
      gravityWorld?.[2] ?? FALLBACK_GRAVITY[2],
    )

    if (gravityWorldVectorRef.current.lengthSq() < 1e-6) {
      gravityWorldVectorRef.current.set(...FALLBACK_GRAVITY)
    } else {
      gravityWorldVectorRef.current.normalize()
    }

    gravityLocalVectorRef.current
      .copy(gravityWorldVectorRef.current)
      .applyQuaternion(bottleWorldQuatInvRef.current)

    if (gravityLocalVectorRef.current.lengthSq() < 1e-6) {
      gravityLocalVectorRef.current.set(...FALLBACK_GRAVITY)
    }

    targetNormalLocalRef.current
      .copy(gravityLocalVectorRef.current)
      .normalize()
      .multiplyScalar(-1)

    accelRef.current
      .copy(targetNormalLocalRef.current)
      .sub(sloshNormalLocalRef.current)
      .multiplyScalar(omega2)
      .addScaledVector(sloshVelocityLocalRef.current, -dampTerm)

    sloshVelocityLocalRef.current.addScaledVector(accelRef.current, step)
    sloshNormalLocalRef.current.addScaledVector(sloshVelocityLocalRef.current, step)

    if (sloshNormalLocalRef.current.lengthSq() < 1e-6) {
      sloshNormalLocalRef.current.set(0, 1, 0)
    } else {
      sloshNormalLocalRef.current.normalize()
    }

    surfacePointLocalRef.current
      .set(centerX, fillHeightY, centerZ)

    localPlane
      .setFromNormalAndCoplanarPoint(sloshNormalLocalRef.current, surfacePointLocalRef.current)

    // Three's clipping keeps the "positive" side by default; flip so liquid stays on the gravity side.
    clipPlane.copy(localPlane).applyMatrix4(bottle.matrixWorld).negate()

    if (surfaceRef.current) {
      surfaceRef.current.position.copy(surfacePointLocalRef.current)
      surfaceQuatRef.current.setFromUnitVectors(SURFACE_GEOMETRY_NORMAL, sloshNormalLocalRef.current)
      surfaceRef.current.quaternion.copy(surfaceQuatRef.current)
    }

    if (showDebug) {
      debugGravityArrow.position.set(centerX, centerY, centerZ)
      debugSloshArrow.position.set(centerX, centerY, centerZ)

      debugDirRef.current.copy(gravityLocalVectorRef.current).normalize()
      debugGravityArrow.setDirection(debugDirRef.current)

      debugDirRef.current.copy(sloshNormalLocalRef.current).normalize()
      debugSloshArrow.setDirection(debugDirRef.current)

      debugGravityArrow.setLength(Math.max(radius * 1.15, 0.15))
      debugSloshArrow.setLength(Math.max(radius * 1.15, 0.15))
    }
  })

  if (!enabled) return null

  return (
    <group>
      <group position={[0, centerYOffset, 0]} scale={liquidScale}>
        <ModelLayer
          url={MODEL_LIQUID}
          renderOrder={POTION_RENDER_ORDER.liquid - 0.02}
          castShadow={false}
          receiveShadow={false}
          inject={(
            <meshBasicMaterial
              side={THREE.BackSide}
              clippingPlanes={clippingPlanes}
              colorWrite={false}
              depthWrite={false}
              stencilWrite
              stencilRef={LIQUID_STENCIL_REF}
              stencilFunc={THREE.AlwaysStencilFunc}
              stencilFuncMask={LIQUID_STENCIL_MASK}
              stencilFail={THREE.KeepStencilOp}
              stencilZFail={THREE.KeepStencilOp}
              stencilZPass={THREE.IncrementWrapStencilOp}
            />
          )}
        />
        <ModelLayer
          url={MODEL_LIQUID}
          renderOrder={POTION_RENDER_ORDER.liquid - 0.01}
          castShadow={false}
          receiveShadow={false}
          inject={(
            <meshBasicMaterial
              side={THREE.FrontSide}
              clippingPlanes={clippingPlanes}
              colorWrite={false}
              depthWrite={false}
              stencilWrite
              stencilRef={LIQUID_STENCIL_REF}
              stencilFunc={THREE.AlwaysStencilFunc}
              stencilFuncMask={LIQUID_STENCIL_MASK}
              stencilFail={THREE.KeepStencilOp}
              stencilZFail={THREE.KeepStencilOp}
              stencilZPass={THREE.DecrementWrapStencilOp}
            />
          )}
        />
        <ModelLayer
          url={MODEL_LIQUID}
          renderOrder={POTION_RENDER_ORDER.liquid}
          castShadow={false}
          receiveShadow={false}
          inject={(
            <meshPhysicalMaterial
              color={color}
              roughness={0.14}
              metalness={0}
              clearcoat={1}
              clearcoatRoughness={0.08}
              envMapIntensity={0.35}
              toneMapped
              clippingPlanes={clippingPlanes}
              side={THREE.DoubleSide}
            />
          )}
        />
      </group>

      <mesh
        ref={surfaceRef}
        scale={[capExtent, capExtent, 1]}
        renderOrder={POTION_RENDER_ORDER.liquid + 0.02}
        castShadow={false}
        receiveShadow={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.06}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={0.6}
          toneMapped
          side={THREE.DoubleSide}
          stencilWrite
          stencilRef={LIQUID_STENCIL_REF}
          stencilFunc={THREE.NotEqualStencilFunc}
          stencilFuncMask={LIQUID_STENCIL_MASK}
          stencilFail={THREE.KeepStencilOp}
          stencilZFail={THREE.KeepStencilOp}
          stencilZPass={THREE.KeepStencilOp}
        />
      </mesh>

      {showDebug && (
        <>
          <primitive object={debugGravityArrow} />
          <primitive object={debugSloshArrow} />
        </>
      )}
    </group>
  )
}
