import React, { useState } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import MapIcon from '@mui/icons-material/Map'
import CloseIcon from '@mui/icons-material/Close'
import { useAppSelector } from '../hooks'
import { ZONE_NAMES } from '../constants'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

// Carte: 768x576 px → ratio 4:3
// Minimap: 180x135 px (echelle ~0.234)
const MAP_W = 768
const MINI_W = 180
const MINI_H = 135
const SCALE = MINI_W / MAP_W

// Zones de la carte (tirees de map.json)
const ZONES = [
  { name: 'brainstorm', x: 32, y: 32, w: 320, h: 224 },
  { name: 'meeting', x: 416, y: 32, w: 320, h: 224 },
  { name: 'deep_work', x: 32, y: 320, w: 320, h: 224 },
  { name: 'sales', x: 416, y: 320, w: 320, h: 224 },
]

// Couleurs par zone
const ZONE_COLORS: Record<string, string> = {
  brainstorm: '#3b82f6',
  meeting: '#f59e0b',
  deep_work: '#8b5cf6',
  sales: '#22c55e',
  afk: '#6b7280',
  one_on_one: '#ec4899',
}

const Wrapper = styled.div`
  position: fixed;
  top: 40px;
  left: 16px;
  z-index: 40;
`

const ToggleButton = styled(IconButton)`
  && {
    background: #222639dd;
    color: #eee;
    border: 1px solid #333;
    &:hover {
      background: #2a2d45;
    }
  }
`

const MinimapContainer = styled.div`
  width: ${MINI_W}px;
  height: ${MINI_H}px;
  background: #1a1d30;
  border: 1px solid #14B8A6;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
`

const ZoneRect = styled.div<{ $x: number; $y: number; $w: number; $h: number; $color: string; $active: boolean }>`
  position: absolute;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  width: ${({ $w }) => $w}px;
  height: ${({ $h }) => $h}px;
  background: ${({ $color, $active }) => $active ? `${$color}30` : `${$color}15`};
  border: 1px solid ${({ $color, $active }) => $active ? $color : `${$color}40`};
  border-radius: 2px;
`

const ZoneLabel = styled.span<{ $x: number; $y: number; $color: string }>`
  position: absolute;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  font-size: 7px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  white-space: nowrap;
  pointer-events: none;
  text-shadow: 0 0 3px #000;
`

const PlayerDot = styled.div<{ $x: number; $y: number; $color: string; $isSelf: boolean }>`
  position: absolute;
  left: ${({ $x }) => $x - 3}px;
  top: ${({ $y }) => $y - 3}px;
  width: ${({ $isSelf }) => $isSelf ? 7 : 5}px;
  height: ${({ $isSelf }) => $isSelf ? 7 : 5}px;
  background: ${({ $color }) => $color};
  border-radius: 50%;
  border: ${({ $isSelf }) => $isSelf ? '1px solid #fff' : 'none'};
  z-index: 2;
  ${({ $isSelf }) => $isSelf ? 'box-shadow: 0 0 4px rgba(20, 184, 166, 0.8);' : ''}
`

const CloseBtn = styled(IconButton)`
  && {
    position: absolute;
    top: 0;
    right: 0;
    padding: 2px;
    color: #999;
    z-index: 3;
  }
`

/** Obtient la position du joueur local depuis Phaser */
function getMyPlayerPos(): { x: number; y: number } | null {
  try {
    const game = phaserGame.scene.keys.game as Game
    if (game?.myPlayer) {
      return { x: game.myPlayer.x, y: game.myPlayer.y }
    }
  } catch { /* Phaser pas pret */ }
  return null
}

/** Obtient les positions des autres joueurs depuis Phaser */
function getOtherPlayerPositions(): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  try {
    const game = phaserGame.scene.keys.game as Game
    if (game) {
      // Acceder a otherPlayerMap via le groupe
      const group = (game as any).otherPlayerMap as Map<string, any> | undefined
      if (group) {
        group.forEach((player: any, id: string) => {
          if (player?.x !== undefined && player?.y !== undefined) {
            positions.set(id, { x: player.x, y: player.y })
          }
        })
      }
    }
  } catch { /* Phaser pas pret */ }
  return positions
}

export default function Minimap(): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const loggedIn = useAppSelector((state) => state.user.loggedIn)
  const playerNameMap = useAppSelector((state) => state.user.playerNameMap)
  const playerStatusMap = useAppSelector((state) => state.user.playerStatusMap)

  // Force re-render periodiquement pour suivre les positions
  const [, setTick] = useState(0)
  React.useEffect(() => {
    if (!open) return
    const interval = setInterval(() => setTick((t) => t + 1), 500)
    return () => clearInterval(interval)
  }, [open])

  if (!loggedIn) return null

  if (!open) {
    return (
      <Wrapper>
        <Tooltip title="Mini-carte" placement="right" arrow>
          <ToggleButton size="small" onClick={() => setOpen(true)}>
            <MapIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
      </Wrapper>
    )
  }

  const myPos = getMyPlayerPos()
  const otherPositions = getOtherPlayerPositions()
  let currentZone = ''
  try {
    const game = phaserGame.scene.keys.game as Game
    currentZone = game?.myPlayer?.currentZone || ''
  } catch { /* */ }

  // Couleur des statuts pour les dots
  const statusColors: Record<string, string> = {
    available: '#4ade80',
    meeting: '#fb923c',
    dnd: '#ef4444',
    idle: '#9ca3af',
  }

  return (
    <Wrapper>
      <MinimapContainer>
        <CloseBtn size="small" onClick={() => setOpen(false)}>
          <CloseIcon sx={{ fontSize: 12 }} />
        </CloseBtn>

        {/* Zones */}
        {ZONES.map((z) => (
          <React.Fragment key={z.name}>
            <ZoneRect
              $x={z.x * SCALE}
              $y={z.y * SCALE}
              $w={z.w * SCALE}
              $h={z.h * SCALE}
              $color={ZONE_COLORS[z.name] || '#555'}
              $active={z.name === currentZone}
            />
            <ZoneLabel
              $x={z.x * SCALE + 3}
              $y={z.y * SCALE + 2}
              $color={ZONE_COLORS[z.name] || '#999'}
            >
              {ZONE_NAMES[z.name]}
            </ZoneLabel>
          </React.Fragment>
        ))}

        {/* Autres joueurs */}
        {Array.from(otherPositions).map(([id, pos]) => {
          const status = playerStatusMap.get(id) || 'available'
          const name = playerNameMap.get(id) || ''
          return (
            <Tooltip key={id} title={name} placement="top" arrow>
              <PlayerDot
                $x={pos.x * SCALE}
                $y={pos.y * SCALE}
                $color={statusColors[status] || '#4ade80'}
                $isSelf={false}
              />
            </Tooltip>
          )
        })}

        {/* Joueur local */}
        {myPos && (
          <Tooltip title="Vous" placement="top" arrow>
            <PlayerDot
              $x={myPos.x * SCALE}
              $y={myPos.y * SCALE}
              $color="#14B8A6"
              $isSelf={true}
            />
          </Tooltip>
        )}
      </MinimapContainer>
    </Wrapper>
  )
}
