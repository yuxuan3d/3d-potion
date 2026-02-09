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
- 2026-02-08T13:34:21+08:00 [CODE] Add a fake liquid layer: slosh plane normal uses a damped spring toward `-gravity` in bottle-local space; fill maps to a sphere plane offset (volume-stable while tilting) and clips a liquid sphere.
- 2026-02-08T19:07:21+08:00 [CODE] Cleanup repo layout: remove accidentally tracked nested `3dpotion/` mirror and untrack `model/source/*`; keep only one app tree at repo root and ignore `model/`.
- 2026-02-08T11:35:44Z [CODE] Add a fullscreen loading overlay + a small scene-ready signal so the potion models only reveal after assets load and the `Bounds`/`Center` transforms settle.
- 2026-02-08T11:41:55Z [CODE] `SceneReadySignal` should re-schedule on every effect setup (no one-shot ref guard) so React StrictMode dev re-runs still trigger `onReady`.
- 2026-02-08T13:12:54Z [CODE] Use `Bounds maxDuration` close to zero so the camera fit animation finishes before the loading overlay fades out (prevents perceived “inner bottle snap” from refraction/parallax during camera settle).
- 2026-02-08T13:21:13Z [CODE] Increase `MeshTransmissionMaterial` `samples` and (outer glass) `resolution` to reduce visible pixelation along transmission/refraction edges.
- 2026-02-08T13:26:36Z [CODE] Auto-select transmission quality by device: mobile uses `samples=4,resolution=1024`, desktop uses `samples=8,resolution=2048`.
- 2026-02-08T14:36:11Z [CODE] Switch liquid rendering from a clipped sphere to `public/models/PotionBase_Liquid.glb` so fill can extend into the bottle neck; map `fill` to the liquid mesh height bounds.
- 2026-02-08T15:08:07Z [CODE] Compute liquid clip surface pivot + cap radius relative to the liquid GLB bounding-box center (x/z) so the surface cap stays aligned and doesn’t overshoot the glass silhouette.
- 2026-02-09T00:21:55Z [CODE] Use the inner-glass mesh as the liquid depth-mask (BackSide) so the liquid surface/cap can’t render in the glass thickness (prevents “clipping through inner glass”).
- 2026-02-09T00:34:41Z [CODE] Replace the liquid surface circle cap with a stencil-based clipping cap (backface increment/frontface decrement + plane fill) so the fill surface matches the actual liquid mesh intersection and can’t overshoot the inner glass.
- 2026-02-09T00:49:23Z [CODE] Outer glass refraction buffer needs a stencil attachment; added a custom transmission wrapper that renders into an FBO with `stencilBuffer: true` so the liquid surface cap stays masked in the transmission pass (prevents “outer bottle reflecting the cap plane” artifacts).
- 2026-02-09T01:00:30Z [CODE] Fix custom transmission wrapper to keep the outer glass transmissive: don’t restore the GLTF material after the FBO render, and pass the real `transmission` value through (MeshTransmissionMaterial handles `_transmission`/`transmission=0` internally).
- 2026-02-09T01:11:45Z [CODE] Keep the upstream `MeshTransmissionMaterial` internal FBO allocations tiny (`resolution=1`) since we render into our own stencil-enabled FBO; avoids allocating large unused render targets.

[PROGRESS]
- 2026-02-08T09:11:19+08:00 [CODE] [MILESTONE] Compacted this file into milestones; detailed per-iteration bullets removed to reduce drift/bloat.

[DISCOVERIES]
- 2026-02-06T11:02:05+08:00 [TOOL] This environment cannot run `npm` scripts (`WSL 1 is not supported`, Node directory missing), so lint/build verification is blocked here.
- 2026-02-08T10:46:02+08:00 [TOOL] Node/npm are still not available in this Codex environment (`node: command not found`, `npm: command not found`), so refactors could not be verified via `npm run lint`/`npm run build` here.
- 2026-02-07T15:59:03+08:00 [CODE] `transmissionSampler` uses the global transmission pass which excludes other transparent/transmissive objects; nested glass layers may not appear through refraction.
- 2026-02-07T23:55:10+08:00 [CODE] Throttle motion-to-React state updates; keep per-event vectors in refs to avoid perf issues in transmissive scenes.
- 2026-02-08T11:35:44Z [TOOL] Node/npm are available here (`node v24.13.0`, `npm v11.6.2`); verified `npm run lint` and `npm run build` succeed.
- 2026-02-08T11:41:55Z [CODE] StrictMode effect replay can cancel the first `requestAnimationFrame`; combining cleanup cancel + a one-shot ref can block readiness forever at 100%.
- 2026-02-08T15:08:07Z [TOOL] In this Codex environment, Node `child_process.spawn*` fails with `EPERM`, so `vite build` (esbuild service) can’t run here; `eslint` still runs when `npm_config_script_shell` is overridden to `cmd.exe` (avoids Git Bash `CreateFileMapping` crash).

[OUTCOMES]
- 2026-02-07T23:55:10+08:00 [CODE] `src/App.jsx` renders layered GLBs (outer/inner/fresnel/cap) from `public/models/` with transmission glass, custom fresnel passes, Leva controls, optional HDR/Lightformer environment, stable camera framing, and mobile motion debug (gravity + jerk) plus axis correction.
- 2026-02-08T11:35:44Z [CODE] Added a simple loading page (progress card) and delayed enabling orbit controls until the models are loaded and placed/rotated.
- 2026-02-08T11:41:55Z [CODE] Fixed loader deadlock: loading overlay now exits after assets hit 100% and the scene settle frames complete.
