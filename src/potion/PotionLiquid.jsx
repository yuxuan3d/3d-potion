import { useFrame, useLoader } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { MODEL_INNER, POTION_RENDER_ORDER } from './constants.js'

const FALLBACK_GRAVITY = [0, -1, 0]
const SURFACE_GEOMETRY_NORMAL = new THREE.Vector3(0, 0, 1)

function clamp01(value) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function sphereFillFraction(planeOffset, radius) {
  const clampedOffset = Math.min(radius, Math.max(-radius, planeOffset))
  // Height from the bottom of the sphere (0..2R).
  const height = clampedOffset + radius
  // Volume below plane / total volume for a sphere, simplified.
  return ((height ** 2) * (2 * radius - clampedOffset)) / (4 * (radius ** 3))
}

function solveSpherePlaneOffset(fill, radius) {
  const clampedFill = clamp01(fill)
  const safeRadius = Math.max(1e-4, radius)

  if (clampedFill <= 0) return -safeRadius
  if (clampedFill >= 1) return safeRadius

  let low = -safeRadius
  let high = safeRadius

  for (let i = 0; i < 28; i += 1) {
    const mid = (low + high) / 2
    const fraction = sphereFillFraction(mid, safeRadius)
    if (fraction < clampedFill) low = mid
    else high = mid
  }

  return (low + high) / 2
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
  const innerGltf = useLoader(GLTFLoader, MODEL_INNER)
  const volumeRef = useRef(null)
  const surfaceRef = useRef(null)

  const innerBounds = useMemo(() => {
    const scene = innerGltf.scene
    scene.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    // Use a conservative horizontal radius, then bias the center slightly downward.
    const horizontalRadius = 0.5 * Math.min(size.x, size.z)
    const radius = Math.max(horizontalRadius * 0.92, 1e-4)
    const centerY = center.y - size.y * 0.12

    return { radius, centerY }
  }, [innerGltf.scene])

  const radius = Math.max(innerBounds.radius * radiusScale, 1e-4)
  const centerY = innerBounds.centerY + centerYOffset

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

  const planeOffset = useMemo(() => solveSpherePlaneOffset(fill, radius), [fill, radius])
  const surfaceRadius = useMemo(() => {
    const r2 = (radius ** 2) - (planeOffset ** 2)
    return Math.sqrt(Math.max(r2, 0))
  }, [radius, planeOffset])

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
      .set(0, centerY, 0)
      .addScaledVector(sloshNormalLocalRef.current, planeOffset)

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
      debugGravityArrow.position.set(0, centerY, 0)
      debugSloshArrow.position.set(0, centerY, 0)

      debugDirRef.current.copy(gravityLocalVectorRef.current).normalize()
      debugGravityArrow.setDirection(debugDirRef.current)

      debugDirRef.current.copy(sloshNormalLocalRef.current).normalize()
      debugSloshArrow.setDirection(debugDirRef.current)

      debugGravityArrow.setLength(Math.max(radius * 1.15, 0.15))
      debugSloshArrow.setLength(Math.max(radius * 1.15, 0.15))
    }

    if (volumeRef.current) {
      volumeRef.current.renderOrder = POTION_RENDER_ORDER.liquid
    }
  })

  if (!enabled) return null

  return (
    <group>
      <mesh
        ref={volumeRef}
        position={[0, centerY, 0]}
        scale={radius}
        renderOrder={POTION_RENDER_ORDER.liquid}
        castShadow={false}
        receiveShadow={false}
      >
        <sphereGeometry args={[1, 64, 64]} />
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
      </mesh>

      <mesh
        ref={surfaceRef}
        scale={[surfaceRadius, surfaceRadius, 1]}
        renderOrder={POTION_RENDER_ORDER.liquid + 0.01}
        castShadow={false}
        receiveShadow={false}
      >
        <circleGeometry args={[1, 64]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.06}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={0.6}
          toneMapped
          side={THREE.DoubleSide}
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
