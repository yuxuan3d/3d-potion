import './App.css'

import { Bounds, Center, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Leva, useControls } from 'leva'
import { Suspense, useCallback, useMemo, useState } from 'react'
import * as THREE from 'three'

import PotionBottle from './potion/PotionBottle.jsx'
import SceneEnvironment from './components/SceneEnvironment.jsx'
import LightformerGizmo from './components/LightformerGizmo.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import SceneReadySignal from './components/SceneReadySignal.jsx'
import useDeviceMotionGravity from './hooks/useDeviceMotionGravity.js'

const DEFAULT_HDR_FILE = 'pink_sunrise_1k.hdr'
const DEFAULT_BOTTLE_TILT_X_DEGREES = 25
const DEFAULT_FRONT_TURN_AXIS = 'z'
const DEFAULT_FRONT_TURN_DEGREES = -30
const DEFAULT_MOTION_LOW_PASS_ALPHA = 0.9
const CANVAS_GL_OPTIONS = { stencil: true }
const BOUNDS_FIT_MAX_DURATION = 0.01
const GLASS_QUALITY_MOBILE = { samples: 4, resolution: 1024 }
const GLASS_QUALITY_DESKTOP = { samples: 8, resolution: 2048 }

function formatVector(vector, digits = 2) {
  return `(${vector.map((component) => (Number.isFinite(component) ? component.toFixed(digits) : '0.00')).join(', ')})`
}

function useTuningControls() {
  const { mode: envMode, hdrFile: envHdrFile } = useControls('Environment', {
    mode: {
      value: 'hdr',
      options: {
        HDR: 'hdr',
        Lightformer: 'lightformer',
        'HDR + Lightformer': 'hdr+lightformer',
      },
    },
    hdrFile: {
      value: DEFAULT_HDR_FILE,
      options: {
        Studio: 'brown_photostudio_01_1k.hdr',
        Sunrise: 'pink_sunrise_1k.hdr',
      },
    },
  })

  const lightformer = useControls('Lightformer', {
    enabled: false,
    showGizmo: false,
    gizmoOpacity: { value: 0.25, min: 0, max: 1, step: 0.01 },
    form: {
      value: 'rect',
      options: {
        Rect: 'rect',
        Circle: 'circle',
        Ring: 'ring',
      },
    },
    intensity: { value: 6, min: 0, max: 50, step: 0.1 },
    color: '#ffffff',
    position: { value: [0, 2, 2], step: 0.05 },
    rotation: { value: [0, 0, 0], step: 1 },
    scale: { value: [2.5, 2.5, 1], step: 0.05 },
    envResolution: {
      value: 512,
      options: {
        64: 64,
        128: 128,
        256: 256,
        512: 512,
      },
    },
    liveEnv: true,
  })

  const bottle = useControls('Bottle Orientation', {
    bottleTiltXDegrees: { value: DEFAULT_BOTTLE_TILT_X_DEGREES, min: -180, max: 180, step: 1 },
    frontTurnAxis: {
      value: DEFAULT_FRONT_TURN_AXIS,
      options: {
        Y: 'y',
        X: 'x',
        Z: 'z',
      },
    },
    frontTurnDegrees: { value: DEFAULT_FRONT_TURN_DEGREES, min: -180, max: 180, step: 1 },
  })

  const motion = useControls('Device Motion', {
    enabled: true,
    showDebug: true,
    lowPassAlpha: { value: DEFAULT_MOTION_LOW_PASS_ALPHA, min: 0, max: 0.99, step: 0.01 },
    computeJerk: true,
    axisCorrection: { value: [0, 0, 0], step: 1 },
  })

  const outerFresnel = useControls('Outer Fresnel', {
    outerRimColor: '#dcf4ff',
    outerRimPower: { value: 4.0, min: 0, max: 12, step: 0.1 },
    outerRimIntensity: { value: 0.33, min: 0, max: 2, step: 0.01 },
    outerRimOpacity: { value: 0.53, min: 0, max: 1, step: 0.01 },
  })

  const innerFresnel = useControls('Inner Fresnel', {
    innerRimColor: '#ff0606',
    innerRimPower: { value: 8.0, min: 0, max: 12, step: 0.1 },
    innerRimIntensity: { value: 0.58, min: 0, max: 2, step: 0.01 },
    innerRimOpacity: { value: 0.54, min: 0, max: 1, step: 0.01 },
  })

  const liquid = useControls('Liquid', {
    enabled: true,
    fill: { value:0.6, min: 0, max: 1, step: 0.01 },
    color: '#d10a0a',
    sloshFrequency: { value: 3.7, min: 0.1, max: 8, step: 0.1 },
    sloshDamping: { value: 0.45, min: 0.05, max: 2, step: 0.05 },
    centerYOffset: { value: 0.0, min: -0.5, max: 0.5, step: 0.01 },
    showDebug: false,
    radiusScale: { value: 1.0, min: 0.5, max: 1.25, step: 0.01 },
  })

  return {
    envMode,
    envHdrFile,
    lightformer,
    bottle,
    motion,
    outerFresnel,
    innerFresnel,
    liquid,
  }
}

function App() {
  const [sceneReady, setSceneReady] = useState(false)
  const {
    envMode,
    envHdrFile,
    lightformer,
    bottle,
    motion,
    outerFresnel,
    innerFresnel,
    liquid,
  } = useTuningControls()

  const isMobileDevice = useMemo(() => {
    if (typeof window === 'undefined') return false

    const uaMobile = navigator.userAgentData?.mobile
    if (typeof uaMobile === 'boolean') return uaMobile

    if (typeof window.matchMedia !== 'function') return false
    if (window.matchMedia('(pointer: coarse)').matches) return true
    return window.matchMedia('(max-width: 768px)').matches
  }, [])

  const glassQuality = isMobileDevice ? GLASS_QUALITY_MOBILE : GLASS_QUALITY_DESKTOP

  const {
    enabled: lightformerEnabled,
    showGizmo: lightformerShowGizmo,
    gizmoOpacity: lightformerGizmoOpacity,
    form: lightformerForm,
    intensity: lightformerIntensity,
    color: lightformerColor,
    position: lightformerPosition,
    rotation: lightformerRotationDegrees,
    scale: lightformerScale,
    envResolution: lightformerEnvResolution,
    liveEnv: lightformerLiveEnv,
  } = lightformer

  const { bottleTiltXDegrees, frontTurnAxis, frontTurnDegrees } = bottle
  const {
    enabled: motionEnabled,
    showDebug: motionShowDebug,
    lowPassAlpha: motionLowPassAlpha,
    computeJerk: motionComputeJerk,
    axisCorrection: motionAxisCorrectionDegrees,
  } = motion
  const { outerRimColor, outerRimPower, outerRimIntensity, outerRimOpacity } = outerFresnel
  const { innerRimColor, innerRimPower, innerRimIntensity, innerRimOpacity } = innerFresnel
  const {
    enabled: liquidEnabled,
    fill: liquidFill,
    color: liquidColor,
    radiusScale: liquidRadiusScale,
    centerYOffset: liquidCenterYOffset,
    sloshFrequency: liquidSloshFrequency,
    sloshDamping: liquidSloshDamping,
    showDebug: liquidShowDebug,
  } = liquid

  const {
    motionSupport,
    permissionRequired: motionPermissionRequired,
    permissionState: motionPermissionState,
    requestPermission: requestMotionPermission,
    hasMotionData: motionHasData,
    rawGravity,
    filteredGravity,
    jerk: motionJerk,
  } = useDeviceMotionGravity({
    enabled: motionEnabled,
    lowPassAlpha: motionLowPassAlpha,
    axisCorrectionDegrees: motionAxisCorrectionDegrees,
    computeJerk: motionComputeJerk,
  })

  const sloshGravityVector = useMemo(() => {
    const vector = new THREE.Vector3(...filteredGravity)
    if (vector.lengthSq() < 1e-6) return [0, -1, 0]
    vector.normalize()
    return [vector.x, vector.y, vector.z]
  }, [filteredGravity])

  const motionStatus = useMemo(() => {
    if (!motionEnabled) return 'disabled'
    if (!motionSupport) return 'unsupported'
    if (motionPermissionState === 'prompt') return 'permission-required'
    if (motionPermissionState === 'denied') return 'permission-denied'
    if (!motionHasData) return 'waiting-for-data'
    return 'live'
  }, [motionEnabled, motionSupport, motionPermissionState, motionHasData])

  const showMotionPermissionButton = (
    motionEnabled
    && motionSupport
    && motionPermissionRequired
    && motionPermissionState !== 'granted'
  )

  const bottleRotation = useMemo(() => {
    const rotation = [THREE.MathUtils.degToRad(bottleTiltXDegrees), 0, 0]
    const frontTurnRadians = THREE.MathUtils.degToRad(frontTurnDegrees)

    if (frontTurnAxis === 'x') rotation[0] += frontTurnRadians
    if (frontTurnAxis === 'y') rotation[1] += frontTurnRadians
    if (frontTurnAxis === 'z') rotation[2] += frontTurnRadians

    return rotation
  }, [bottleTiltXDegrees, frontTurnAxis, frontTurnDegrees])

  const lightformerRotation = useMemo(
    () => lightformerRotationDegrees.map((deg) => THREE.MathUtils.degToRad(deg)),
    [lightformerRotationDegrees],
  )

  const handleSceneReady = useCallback(() => {
    setSceneReady(true)
  }, [])

  const handleCanvasCreated = useCallback(({ gl }) => {
    gl.localClippingEnabled = true
  }, [])

  return (
    <div className="app">
      <Leva collapsed={false} />
      <LoadingScreen sceneReady={sceneReady} />
      {showMotionPermissionButton && (
        <button type="button" className="motion-permission-button" onClick={requestMotionPermission}>
          {motionPermissionState === 'denied' ? 'Retry Motion Access' : 'Enable Motion Access'}
        </button>
      )}
      {motionShowDebug && (
        <div className="motion-debug" role="status" aria-live="polite">
          <div className="motion-debug-title">Device Motion</div>
          <div className="motion-debug-line">status: {motionStatus}</div>
          <div className="motion-debug-line">raw g: {formatVector(rawGravity)}</div>
          <div className="motion-debug-line">smoothed g: {formatVector(filteredGravity)}</div>
          <div className="motion-debug-line">slosh dir: {formatVector(sloshGravityVector)}</div>
          <div className="motion-debug-line">jerk: {motionJerk.toFixed(2)}</div>
        </div>
      )}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={CANVAS_GL_OPTIONS}
        onCreated={handleCanvasCreated}
        camera={{ position: [0, 0.2, 2], fov: 38, near: 0.01, far: 100 }}
      >
        <SceneEnvironment
          envMode={envMode}
          envHdrFile={envHdrFile}
          lightformerEnabled={lightformerEnabled}
          lightformerEnvResolution={lightformerEnvResolution}
          lightformerLiveEnv={lightformerLiveEnv}
          lightformerForm={lightformerForm}
          lightformerIntensity={lightformerIntensity}
          lightformerColor={lightformerColor}
          lightformerPosition={lightformerPosition}
          lightformerRotation={lightformerRotation}
          lightformerScale={lightformerScale}
        />

        <ambientLight intensity={0.35} />
        <directionalLight
          castShadow
          position={[10, 6, 5]}
          intensity={1.2}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <LightformerGizmo
          visible={lightformerShowGizmo}
          form={lightformerForm}
          position={lightformerPosition}
          rotation={lightformerRotation}
          scale={lightformerScale}
          color={lightformerColor}
          opacity={lightformerGizmoOpacity}
        />

        <Suspense fallback={null}>
          <Bounds fit clip margin={2} maxDuration={BOUNDS_FIT_MAX_DURATION}>
            <Center>
              <PotionBottle
                rotation={bottleRotation}
                glassQuality={glassQuality}
                outerRimColor={outerRimColor}
                outerRimPower={outerRimPower}
                outerRimIntensity={outerRimIntensity}
                outerRimOpacity={outerRimOpacity}
                innerRimColor={innerRimColor}
                innerRimPower={innerRimPower}
                innerRimIntensity={innerRimIntensity}
                innerRimOpacity={innerRimOpacity}
                liquidEnabled={liquidEnabled}
                liquidFill={liquidFill}
                liquidColor={liquidColor}
                liquidRadiusScale={liquidRadiusScale}
                liquidCenterYOffset={liquidCenterYOffset}
                liquidSloshFrequency={liquidSloshFrequency}
                liquidSloshDamping={liquidSloshDamping}
                liquidShowDebug={liquidShowDebug}
                sloshGravityWorld={sloshGravityVector}
              />
            </Center>
          </Bounds>
          <SceneReadySignal onReady={handleSceneReady} settleFrames={2} />
        </Suspense>

        <OrbitControls
          makeDefault
          enabled={sceneReady}
          enableDamping
          dampingFactor={0.08}
          minDistance={0.2}
          maxDistance={10}
        />
      </Canvas>
    </div>
  )
}

export default App
