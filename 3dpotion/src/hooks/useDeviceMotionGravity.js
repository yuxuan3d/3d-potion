import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const FALLBACK_GRAVITY_VECTOR = [0, -9.81, 0]
const DEFAULT_MOTION_LOW_PASS_ALPHA = 0.9

function vectorToArray(vector) {
  return [vector.x, vector.y, vector.z]
}

export default function useDeviceMotionGravity({
  enabled = true,
  lowPassAlpha = DEFAULT_MOTION_LOW_PASS_ALPHA,
  axisCorrectionDegrees = [0, 0, 0],
  computeJerk = true,
}) {
  const motionSupport = typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined'
  const permissionRequired = motionSupport && typeof window.DeviceMotionEvent.requestPermission === 'function'
  const [permissionResult, setPermissionResult] = useState('unknown')
  const [snapshot, setSnapshot] = useState({
    raw: [...FALLBACK_GRAVITY_VECTOR],
    filtered: [...FALLBACK_GRAVITY_VECTOR],
    jerk: 0,
    hasMotionData: false,
  })

  const rawGravityRef = useRef(new THREE.Vector3(...FALLBACK_GRAVITY_VECTOR))
  const filteredGravityRef = useRef(new THREE.Vector3(...FALLBACK_GRAVITY_VECTOR))
  const correctedGravityRef = useRef(new THREE.Vector3(...FALLBACK_GRAVITY_VECTOR))
  const deltaGravityRef = useRef(new THREE.Vector3())
  const jerkRef = useRef(0)
  const previousRawRef = useRef(new THREE.Vector3(...FALLBACK_GRAVITY_VECTOR))
  const hasPreviousRawRef = useRef(false)
  const previousTimeRef = useRef(0)
  const snapshotTimeRef = useRef(0)
  const filterSeededRef = useRef(false)

  const permissionState = (
    !motionSupport
      ? 'unsupported'
      : permissionRequired
        ? (permissionResult === 'unknown' ? 'prompt' : permissionResult)
        : 'granted'
  )

  const correctionEuler = useMemo(() => {
    const [x = 0, y = 0, z = 0] = axisCorrectionDegrees
    return new THREE.Euler(
      THREE.MathUtils.degToRad(x),
      THREE.MathUtils.degToRad(y),
      THREE.MathUtils.degToRad(z),
      'XYZ',
    )
  }, [axisCorrectionDegrees])

  const requestPermission = useCallback(async () => {
    if (!motionSupport) return false
    if (!permissionRequired) return true

    try {
      const permissionResult = await window.DeviceMotionEvent.requestPermission()
      const granted = permissionResult === 'granted'
      setPermissionResult(granted ? 'granted' : 'denied')
      return granted
    } catch {
      setPermissionResult('denied')
      return false
    }
  }, [motionSupport, permissionRequired])

  useEffect(() => {
    if (!computeJerk) {
      jerkRef.current = 0
      hasPreviousRawRef.current = false
      previousTimeRef.current = 0
    }
  }, [computeJerk])

  useEffect(() => {
    if (!enabled || !motionSupport || permissionState !== 'granted') return

    const handleMotion = (event) => {
      const acceleration = event.accelerationIncludingGravity
      if (!acceleration) return

      const { x, y, z } = acceleration
      if (x == null || y == null || z == null) return

      const correctedRaw = correctedGravityRef.current
      correctedRaw.set(x, y, z).applyEuler(correctionEuler)
      rawGravityRef.current.copy(correctedRaw)

      if (!filterSeededRef.current) {
        filteredGravityRef.current.copy(correctedRaw)
        filterSeededRef.current = true
      } else {
        filteredGravityRef.current
          .multiplyScalar(lowPassAlpha)
          .addScaledVector(correctedRaw, 1 - lowPassAlpha)
      }

      if (computeJerk) {
        const currentTime = Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now()
        if (hasPreviousRawRef.current && previousTimeRef.current > 0) {
          const deltaTimeSeconds = Math.max((currentTime - previousTimeRef.current) / 1000, 1 / 240)
          jerkRef.current = deltaGravityRef.current.copy(correctedRaw).sub(previousRawRef.current).length() / deltaTimeSeconds
        } else {
          jerkRef.current = 0
        }
        previousRawRef.current.copy(correctedRaw)
        hasPreviousRawRef.current = true
        previousTimeRef.current = currentTime
      }

      const currentClock = performance.now()
      if (currentClock - snapshotTimeRef.current > 80) {
        snapshotTimeRef.current = currentClock
        setSnapshot({
          raw: vectorToArray(rawGravityRef.current),
          filtered: vectorToArray(filteredGravityRef.current),
          jerk: jerkRef.current,
          hasMotionData: true,
        })
      }
    }

    window.addEventListener('devicemotion', handleMotion, { passive: true })
    return () => {
      window.removeEventListener('devicemotion', handleMotion)
    }
  }, [enabled, motionSupport, permissionState, correctionEuler, lowPassAlpha, computeJerk])

  useEffect(() => {
    if (enabled) return

    filterSeededRef.current = false
    rawGravityRef.current.set(...FALLBACK_GRAVITY_VECTOR)
    filteredGravityRef.current.set(...FALLBACK_GRAVITY_VECTOR)
    correctedGravityRef.current.set(...FALLBACK_GRAVITY_VECTOR)
    deltaGravityRef.current.set(0, 0, 0)
    jerkRef.current = 0
    hasPreviousRawRef.current = false
    previousRawRef.current.set(...FALLBACK_GRAVITY_VECTOR)
    previousTimeRef.current = 0
    snapshotTimeRef.current = 0
  }, [enabled])

  const isActive = enabled && motionSupport && permissionState === 'granted'

  return {
    motionSupport,
    permissionRequired,
    permissionState,
    requestPermission,
    hasMotionData: isActive && snapshot.hasMotionData,
    rawGravity: isActive ? snapshot.raw : FALLBACK_GRAVITY_VECTOR,
    filteredGravity: isActive ? snapshot.filtered : FALLBACK_GRAVITY_VECTOR,
    jerk: isActive && computeJerk ? snapshot.jerk : 0,
  }
}
