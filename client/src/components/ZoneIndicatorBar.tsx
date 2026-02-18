import React from 'react'
import styled from 'styled-components'
import PlaceIcon from '@mui/icons-material/Place'
import PeopleIcon from '@mui/icons-material/People'
import { useAppSelector } from '../hooks'
import { ZONE_NAMES } from '../constants'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

const BarWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  pointer-events: none;
`

const BarContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: #222639dd;
  border-radius: 0 0 12px 12px;
  padding: 6px 18px;
  color: #eee;
  font-size: 13px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid #333;
  border-top: none;
`

const ZoneName = styled.span`
  font-weight: 600;
  color: #14B8A6;
`

const Separator = styled.span`
  color: #555;
  font-size: 10px;
`

const CountChip = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #aaa;
  font-size: 12px;
`

export default function ZoneIndicatorBar(): JSX.Element | null {
  const loggedIn = useAppSelector((state) => state.user.loggedIn)
  const playerZoneMap = useAppSelector((state) => state.user.playerZoneMap)

  if (!loggedIn) return null

  // Obtenir la zone courante du joueur local
  let currentZone = ''
  try {
    const game = phaserGame.scene.keys.game as Game
    currentZone = game?.myPlayer?.currentZone || ''
  } catch {
    // Phaser pas pret
  }

  if (!currentZone) return null

  const displayName = ZONE_NAMES[currentZone] || currentZone

  // Compter les joueurs dans la meme zone (autres + soi-meme)
  let zoneCount = 1 // le joueur local
  playerZoneMap.forEach((zone) => {
    if (zone === currentZone) zoneCount++
  })

  return (
    <BarWrapper>
      <BarContent>
        <PlaceIcon sx={{ fontSize: 16, color: '#14B8A6' }} />
        <ZoneName>{displayName}</ZoneName>
        <Separator>|</Separator>
        <CountChip>
          <PeopleIcon sx={{ fontSize: 14 }} />
          {zoneCount}
        </CountChip>
      </BarContent>
    </BarWrapper>
  )
}
