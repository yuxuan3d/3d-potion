import { useEffect } from 'react'

export default function SceneReadySignal({ onReady, settleFrames = 2 }) {
  useEffect(() => {
    if (!onReady) return undefined

    const totalFrames = Math.max(1, Math.floor(settleFrames))
    let framesLeft = totalFrames
    let raf = 0

    const tick = () => {
      framesLeft -= 1
      if (framesLeft <= 0) onReady()
      else raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [onReady, settleFrames])

  return null
}
