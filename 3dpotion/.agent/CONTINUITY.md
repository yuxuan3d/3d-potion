# CONTINUITY

[PLANS]
- 2026-02-08T09:11:19+08:00 [USER] [MILESTONE] Build a focused R3F potion scene with layered GLBs, tuned glass/fresnel, interactive lighting controls, and mobile motion input to drive future slosh.

[DECISIONS]
- 2026-02-06T11:00:47+08:00 [CODE] Use a fullscreen Canvas layout (`html/body/#root` set to 100% height; `body` overflow hidden).
- 2026-02-06T14:25:28+08:00 [CODE] [MILESTONE] Switched from a no-Drei approach to using `@react-three/drei` (`Environment`, `Clone`, helpers) for faster iteration.
- 2026-02-06T14:32:08+08:00 [CODE] Pin Drei to a Fiber 9-compatible major (`@react-three/drei@^10.7.6`) for `@react-three/fiber@^9.5.0`.
- 2026-02-06T15:37:24+08:00 [CODE] Apply materials via Drei `Clone` + `inject` rather than manual mesh traversal.
- 2026-02-06T17:52:38+08:00 [CODE] Fresnel rim is computed in view space and uses `abs(dot(N,V))` for camera-stable, symmetric rims.
- 2026-02-07T15:27:58+08:00 [CODE] Reduce transmission artifacts by using low samples + stable `renderOrder` and selective `transmissionSampler` usage per layer.
- 2026-02-07T19:38:08+08:00 [CODE] Use Leva to tune orientation, fresnel, environment/lightformer, and motion settings live.
- 2026-02-07T23:33:31+08:00 [CODE] Keep camera stable: use `Bounds fit clip` without `observe` to avoid re-framing on control changes.
- 2026-02-07T23:55:10+08:00 [CODE] Device motion uses `devicemotion` `accelerationIncludingGravity` with low-pass smoothing, optional jerk, and iOS gesture permission.
- 2026-02-08T09:22:39+08:00 [CODE] Reuse `THREE.Vector3` refs in the `devicemotion` handler to avoid per-event allocations (less GC/jank on mobile).
- 2026-02-08T10:46:02+08:00 [CODE] Refactor `src/App.jsx` by extracting `useTuningControls`, `PotionBottle`, and `SceneEnvironment`/`HdriBackdrop` to reduce `App()` complexity and avoid loading HDR textures unless needed.
- 2026-02-08T11:03:19+08:00 [CODE] Avoid `setState` inside effects to satisfy `react-hooks/set-state-in-effect`; derive permission state and return fallbacks when motion is inactive.
- 2026-02-08T11:12:06+08:00 [CODE] Avoid render-time ref access for `hasMotionData`; store the flag in snapshot state so `react-hooks/refs` passes.
- 2026-02-08T11:21:10+08:00 [CODE] Split dense potion rendering code out of `src/App.jsx` into `src/potion/` modules (`PotionBottle`, `PotionFresnel`, `FresnelRimMaterial`, `ModelLayer`, constants).
- 2026-02-08T11:33:28+08:00 [CODE] Split `useDeviceMotionGravity` + environment helpers out of `src/App.jsx` into `src/hooks/` + `src/components/` for readability.

[PROGRESS]
- 2026-02-08T09:11:19+08:00 [CODE] [MILESTONE] Compacted this file into milestones; detailed per-iteration bullets removed to reduce drift/bloat.

[DISCOVERIES]
- 2026-02-06T11:02:05+08:00 [TOOL] This environment cannot run `npm` scripts (`WSL 1 is not supported`, Node directory missing), so lint/build verification is blocked here.
- 2026-02-08T10:46:02+08:00 [TOOL] Node/npm are still not available in this Codex environment (`node: command not found`, `npm: command not found`), so refactors could not be verified via `npm run lint`/`npm run build` here.
- 2026-02-07T15:59:03+08:00 [CODE] `transmissionSampler` uses the global transmission pass which excludes other transparent/transmissive objects; nested glass layers may not appear through refraction.
- 2026-02-07T23:55:10+08:00 [CODE] Throttle motion-to-React state updates; keep per-event vectors in refs to avoid perf issues in transmissive scenes.

[OUTCOMES]
- 2026-02-07T23:55:10+08:00 [CODE] `src/App.jsx` renders layered GLBs (outer/inner/fresnel/cap) from `public/models/` with transmission glass, custom fresnel passes, Leva controls, optional HDR/Lightformer environment, stable camera framing, and mobile motion debug (gravity + jerk) plus axis correction.
