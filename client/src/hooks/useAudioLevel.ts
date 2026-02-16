import { useState, useEffect, useRef } from 'react'

/**
 * Hook qui retourne le niveau d'entree audio (0-100) d'un MediaStream.
 * Utilise Web Audio API (AudioContext + AnalyserNode) et requestAnimationFrame.
 */
export function useAudioLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setLevel(0)
      return
    }

    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    const source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      setLevel(Math.min(100, Math.round((avg / 128) * 100)))
      animFrameRef.current = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      source.disconnect()
      ctx.close()
    }
  }, [stream])

  return level
}
