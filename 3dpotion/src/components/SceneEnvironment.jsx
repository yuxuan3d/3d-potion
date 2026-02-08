import { Environment, Lightformer } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

function HdriBackdrop({ file, scale = 50 }) {
  const texture = useLoader(RGBELoader, file)

  return (
    <mesh scale={scale}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  )
}

export default function SceneEnvironment({
  envMode,
  envHdrFile,
  lightformerEnabled,
  lightformerEnvResolution,
  lightformerLiveEnv,
  lightformerForm,
  lightformerIntensity,
  lightformerColor,
  lightformerPosition,
  lightformerRotation,
  lightformerScale,
}) {
  return (
    <>
      <color attach="background" args={['#0b0f17']} />
      {envMode === 'hdr' ? (
        <Environment files={envHdrFile} />
      ) : (
        <Environment
          resolution={lightformerEnvResolution}
          frames={lightformerLiveEnv ? Infinity : 1}
        >
          {envMode === 'hdr+lightformer' && <HdriBackdrop file={envHdrFile} />}
          {lightformerEnabled && (
            <Lightformer
              form={lightformerForm}
              intensity={lightformerIntensity}
              color={lightformerColor}
              position={lightformerPosition}
              rotation={lightformerRotation}
              scale={lightformerScale}
            />
          )}
        </Environment>
      )}
    </>
  )
}
