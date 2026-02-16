import { useState, useEffect, useRef } from 'react'
import { useAudioLevel } from './useAudioLevel'

const SPEAKING_THRESHOLD = 18
const DEBOUNCE_MS = 150

/**
 * Hook qui detecte si un MediaStream contient de la parole active.
 * Compose useAudioLevel avec un seuil et un debounce pour eviter le flickering.
 */
export function useSpeakingDetector(stream: MediaStream | null): boolean {
  const audioLevel = useAudioLevel(stream)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const timeoutRef = useRef<number>(0)

  useEffect(() => {
    if (audioLevel > SPEAKING_THRESHOLD) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = 0
      }
      setIsSpeaking(true)
    } else if (isSpeaking) {
      if (!timeoutRef.current) {
        timeoutRef.current = window.setTimeout(() => {
          setIsSpeaking(false)
          timeoutRef.current = 0
        }, DEBOUNCE_MS)
      }
    }
  }, [audioLevel, isSpeaking])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return isSpeaking
}
