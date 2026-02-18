import React, { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { useAppSelector } from '../hooks'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

const TIPS_STORAGE_KEY = 'capturia-tips-seen'

/** Charge les tips deja vues depuis localStorage */
function getSeenTips(): Set<string> {
  try {
    const raw = localStorage.getItem(TIPS_STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

/** Persiste les tips vues */
function markTipSeen(tipId: string) {
  try {
    const seen = getSeenTips()
    seen.add(tipId)
    localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify([...seen]))
  } catch { /* ignore */ }
}

// Descriptions des zones (premiere visite)
const zoneTips: Record<string, string> = {
  brainstorm: 'Utilisez le tableau blanc avec R pour collaborer!',
  meeting: 'Appuyez sur M pour rejoindre la reunion video.',
  deep_work: 'Mode focus: les appels sont bloques ici.',
  sales: 'Appuyez sur M pour rejoindre l\'appel de ventes.',
}

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
`

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`

const TipWrapper = styled.div<{ $fading: boolean }>`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 45;
  animation: ${({ $fading }) => ($fading ? fadeOut : fadeInUp)} 0.3s ease-out forwards;
`

const TipContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1a1d30ee;
  border: 1px solid #14B8A644;
  border-radius: 8px;
  padding: 8px 16px;
  color: #ccc;
  font-size: 13px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
`

const TipIcon = styled.span`
  font-size: 16px;
`

export default function ContextualTooltip(): JSX.Element | null {
  const loggedIn = useAppSelector((state) => state.user.loggedIn)
  const [currentTip, setCurrentTip] = useState<string | null>(null)
  const [fading, setFading] = useState(false)
  const [seenTips] = useState(() => getSeenTips())
  const [lastZone, setLastZone] = useState('')

  useEffect(() => {
    if (!loggedIn) return

    const interval = setInterval(() => {
      try {
        const game = phaserGame.scene.keys.game as Game
        const zone = game?.myPlayer?.currentZone || ''

        // Detecter l'entree dans une nouvelle zone
        if (zone && zone !== lastZone) {
          setLastZone(zone)
          const tipId = `zone-${zone}`
          if (!seenTips.has(tipId) && zoneTips[zone]) {
            seenTips.add(tipId)
            markTipSeen(tipId)
            setFading(false)
            setCurrentTip(zoneTips[zone])

            // Auto-hide apres 6s
            setTimeout(() => {
              setFading(true)
              setTimeout(() => setCurrentTip(null), 300)
            }, 6000)
          }
        }
      } catch { /* Phaser pas pret */ }
    }, 500)

    return () => clearInterval(interval)
  }, [loggedIn, lastZone, seenTips])

  if (!currentTip) return null

  return (
    <TipWrapper $fading={fading}>
      <TipContent>
        <TipIcon>💡</TipIcon>
        {currentTip}
      </TipContent>
    </TipWrapper>
  )
}
