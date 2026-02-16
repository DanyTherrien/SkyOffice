import React from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import CircleIcon from '@mui/icons-material/Circle'
import { useAppSelector } from '../hooks'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import { ZONE_NAMES, ZONE_ORDER } from '../constants'

// Couleurs et labels des statuts
const statusConfig: Record<string, { color: string; label: string }> = {
  available: { color: '#4ade80', label: 'Disponible' },
  meeting: { color: '#fb923c', label: 'En reunion' },
  dnd: { color: '#ef4444', label: 'Ne pas deranger' },
  idle: { color: '#9ca3af', label: 'Inactif' },
}

const PanelWrapper = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  width: 260px;
  max-height: 80vh;
  background: #222639ee;
  border-radius: 16px;
  box-shadow: 0px 0px 10px #0000006f;
  color: #eee;
  overflow-y: auto;
  z-index: 50;
  padding: 16px;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h3 {
    margin: 0;
    font-size: 16px;
  }
`

const ZoneSection = styled.div`
  margin-bottom: 10px;
`

const ZoneTitle = styled.div`
  font-size: 13px;
  font-weight: bold;
  color: #14b8a6;
  margin-bottom: 4px;
  padding-bottom: 2px;
  border-bottom: 1px solid #14b8a633;
`

const PlayerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0 3px 8px;
  font-size: 13px;
`

const PlayerName = styled.span`
  color: #eee;
`

const SelfBadge = styled.span`
  color: #14b8a6;
  font-size: 11px;
`

const PlayerRole = styled.span`
  color: #999;
  font-size: 11px;
`

const CountBadge = styled.span`
  font-size: 12px;
  color: #999;
  margin-left: 4px;
`

interface UserListPanelProps {
  onClose: () => void
}

export default function UserListPanel({ onClose }: UserListPanelProps) {
  const playerNameMap = useAppSelector((state) => state.user.playerNameMap)
  const playerZoneMap = useAppSelector((state) => state.user.playerZoneMap)
  const playerRoleMap = useAppSelector((state) => state.user.playerRoleMap)
  const playerStatusMap = useAppSelector((state) => state.user.playerStatusMap)

  // Regrouper les joueurs par zone
  const playersByZone: Record<
    string,
    { id: string; name: string; role: string; status: string; isSelf: boolean }[]
  > = {}
  for (const zone of ZONE_ORDER) {
    playersByZone[zone] = []
  }

  // Ajouter les autres joueurs
  playerNameMap.forEach((name, id) => {
    const zone = playerZoneMap.get(id) || 'brainstorm'
    const role = playerRoleMap.get(id) || ''
    const status = playerStatusMap.get(id) || 'available'
    if (!playersByZone[zone]) playersByZone[zone] = []
    playersByZone[zone].push({ id, name, role, status, isSelf: false })
  })

  // Ajouter le joueur local (pas dans playerNameMap car filtre dans Network.ts)
  const game = phaserGame.scene.keys.game as Game
  const myName = game?.myPlayer?.playerName?.text || 'Moi'
  const myZone = game?.myPlayer?.currentZone || 'brainstorm'

  // Determiner le statut local
  const myStatus = myZone === 'deep_work' ? 'dnd' : myZone === 'meeting' || myZone === 'sales' ? 'meeting' : 'available'

  if (!playersByZone[myZone]) playersByZone[myZone] = []
  playersByZone[myZone].unshift({ id: '_self', name: myName, role: '', status: myStatus, isSelf: true })

  const totalPlayers = playerNameMap.size + 1

  return (
    <PanelWrapper>
      <Header>
        <h3>En ligne ({totalPlayers})</h3>
        <IconButton size="small" onClick={onClose} sx={{ color: '#eee' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Header>
      {ZONE_ORDER.map((zone) => {
        const players = playersByZone[zone]
        if (!players || players.length === 0) return null
        return (
          <ZoneSection key={zone}>
            <ZoneTitle>
              {ZONE_NAMES[zone] || zone}
              <CountBadge>({players.length})</CountBadge>
            </ZoneTitle>
            {players.map((player) => {
              const config = statusConfig[player.status] || statusConfig.available
              return (
                <PlayerRow key={player.id}>
                  <Tooltip title={config.label} placement="left" arrow>
                    <CircleIcon sx={{ fontSize: 8, color: config.color }} />
                  </Tooltip>
                  <PlayerName>{player.name}</PlayerName>
                  {player.isSelf && <SelfBadge>(vous)</SelfBadge>}
                  {player.role && <PlayerRole>· {player.role}</PlayerRole>}
                </PlayerRow>
              )
            })}
          </ZoneSection>
        )
      })}
    </PanelWrapper>
  )
}
