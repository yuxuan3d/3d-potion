import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

const FresnelRimMaterial = shaderMaterial(
  {
    rimColor: new THREE.Color('#8be9ff'),
    rimPower: 4.0,
    rimIntensity: 0.65,
    opacity: 0.35,
  },
  `
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mvPos.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPos;
  }
  `,
  `
  uniform vec3 rimColor;
  uniform float rimPower;
  uniform float rimIntensity;
  uniform float opacity;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 viewDir = normalize(-vViewPos);
    vec3 N = normalize(vViewNormal);
    float ndv = clamp(abs(dot(N, viewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, rimPower);
    float a = fresnel * rimIntensity * opacity;
    gl_FragColor = vec4(rimColor, a);
  }
  `,
)

extend({ FresnelRimMaterial })
