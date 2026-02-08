export default function LightformerGizmo({ visible, form, position, rotation, scale, color, opacity = 0.25 }) {
  if (!visible) return null

  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      renderOrder={10}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
    >
      {form === 'circle' ? (
        <circleGeometry args={[0.5, 64]} />
      ) : form === 'ring' ? (
        <ringGeometry args={[0.3, 0.5, 64]} />
      ) : (
        <planeGeometry args={[1, 1]} />
      )}
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        wireframe
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
