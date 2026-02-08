# 3D Potion

Small React Three Fiber scene that renders a glass potion bottle (layered GLB parts) with a tweakable environment and live tuning controls.

## Features

- Layered bottle parts in `public/models/` (outer/inner/fresnel/cap).
- Transmissive glass + custom fresnel rim materials for edge highlights.
- Environment lighting via HDRI and/or a controllable `Lightformer`.
- Leva panel for bottle orientation, lighting, fresnel parameters, and motion settings.
- Mobile motion hook using `devicemotion` `accelerationIncludingGravity` to output a smoothed "gravity vector" (for future slosh work).

## Getting started

```bash
npm install
npm run dev
```

## Mobile motion notes

- iOS requires a user gesture: tap the in-app "Enable Motion Access" button.
- Some browsers require HTTPS before motion events will fire.

## Useful scripts

```bash
npm run lint
npm run build
```

## Project structure

- `src/App.jsx`: scene composition + Leva control wiring.
- `src/potion/`: bottle model layers + materials.
- `src/components/SceneEnvironment.jsx`: HDRI/Lightformer environment.
- `src/hooks/useDeviceMotionGravity.js`: smoothed gravity vector + optional jerk.
