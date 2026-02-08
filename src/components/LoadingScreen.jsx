import { useProgress } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'

function clamp01(value) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export default function LoadingScreen({ sceneReady }) {
  const { active, progress, errors, item, loaded, total } = useProgress()
  const [hidden, setHidden] = useState(false)

  const assetsReady = useMemo(() => {
    if (errors?.length) return false
    if (active) return false
    if (total === 0) return true
    return progress === 100
  }, [active, errors, progress, total])

  const ready = assetsReady && sceneReady

  const progressPercent = useMemo(() => {
    if (assetsReady) return 100
    return Math.round(clamp01((progress ?? 0) / 100) * 100)
  }, [assetsReady, progress])

  useEffect(() => {
    if (!ready) return undefined

    const timeout = window.setTimeout(() => setHidden(true), 280)
    return () => window.clearTimeout(timeout)
  }, [ready])

  if (hidden) return null

  const hasError = Boolean(errors?.length)
  const statusLabel = hasError ? 'Failed to load assets' : 'Loading potion'

  return (
    <div
      className={`loading-screen ${ready ? 'loading-screen--exiting' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="loading-card">
        <div className="loading-title">{statusLabel}</div>
        {!hasError && <div className="loading-subtitle">{progressPercent}%</div>}
        {hasError && (
          <div className="loading-error">
            Check the console and refresh.
          </div>
        )}
        {!hasError && total > 0 && (
          <div className="loading-meta">
            {loaded}/{total} {item ? `· ${item}` : ''}
          </div>
        )}
        <div className="loading-bar" aria-hidden="true">
          <div
            className="loading-bar-fill"
            style={{ transform: `scaleX(${clamp01(progressPercent / 100)})` }}
          />
        </div>
      </div>
    </div>
  )
}
