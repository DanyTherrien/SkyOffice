import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import PlaceIcon from '@mui/icons-material/Place'
import { useAppSelector, useAppDispatch } from '../hooks'
import { setProfilePlayerId } from '../stores/UserStore'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import { ZONE_NAMES, ZONE_ORDER, ZONE_COLORS } from '../constants'
import { getColorByString } from '../util'
import { slideUp } from '../styles/animations'
import { AFK_REASONS } from './AfkStatusPicker'
import { STATUS_PRESET_MAP } from './StatusPicker'
import ObserveButton from './ObserveButton'
import KnockButton from './KnockButton'
import { setWaiting } from '../stores/BoothInviteStore'

// Mapper les cles AFK vers icon + label
const afkReasonMap = new Map(AFK_REASONS.map((r) => [r.key, { icon: r.icon, label: r.label }]))

// Mapper les statuts Sales vers icon + label
const salesStatusIcons: Record<string, { icon: string; label: string }> = {
  on_call: { icon: '\uD83D\uDCDE', label: 'En appel' },
  available: { icon: '\u2705', label: 'Disponible' },
  preparing: { icon: '\uD83D\uDCCB', label: 'En preparation' },
}

// ─── 3D — Redesign du UserListPanel ────────────────────────────────────────

// Couleurs et labels des statuts (legacy + Slack-like presets)
const statusConfig: Record<string, { color: string; label: string; emoji?: string }> = {
  available: { color: '#4ade80', label: 'Disponible' },
  in_meeting: { color: '#fb923c', label: 'En reunion', emoji: '\uD83D\uDCC5' },
  focusing: { color: '#3b82f6', label: 'Concentre', emoji: '\uD83C\uDFA7' },
  on_call: { color: '#fb923c', label: 'En appel', emoji: '\uD83D\uDCDE' },
  brb: { color: '#eab308', label: 'De retour bientot', emoji: '\u2615' },
  sick: { color: '#ef4444', label: 'Malade', emoji: '\uD83E\uDD12' },
  remote: { color: '#14b8a6', label: 'Teletravail', emoji: '\uD83C\uDFE0' },
  custom: { color: '#6b7280', label: 'Personnalise', emoji: '\u270F\uFE0F' },
  // Legacy statuts (backward compat)
  meeting: { color: '#fb923c', label: 'En reunion', emoji: '\uD83D\uDCC5' },
  dnd: { color: '#ef4444', label: 'Ne pas deranger' },
  afk: { color: '#6b7280', label: 'En pause' },
  idle: { color: '#9ca3af', label: 'Inactif' },
}

const PanelWrapper = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  width: 280px;
  max-height: 80vh;
  background: #1a1e30ee;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  color: #eee;
  overflow-y: auto;
  z-index: 50;
  padding: 16px;
  animation: ${slideUp} 0.25s ease-out;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #3a3f5a;
    border-radius: 2px;
  }
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
`

const ZoneSection = styled.div`
  margin-bottom: 12px;
`

const ZoneTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`

const ZoneTitle = styled.div<{ $color: string }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  gap: 6px;
`

const CountBadge = styled.span`
  font-size: 11px;
  color: #666;
  font-weight: normal;
`

const TeleportButton = styled.button<{ $color: string }>`
  background: transparent;
  border: 1px solid ${({ $color }) => $color}44;
  border-radius: 6px;
  color: ${({ $color }) => $color};
  font-size: 10px;
  padding: 2px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
  transition: all 0.15s;

  &:hover {
    background: ${({ $color }) => $color}22;
    border-color: ${({ $color }) => $color};
  }

  svg {
    font-size: 12px;
  }
`

const PlayerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`

const AvatarCircle = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  flex-shrink: 0;
  position: relative;
`

const StatusDot = styled.div<{ $color: string }>`
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 2px solid #1a1e30;
`

const PlayerInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const PlayerName = styled.div`
  font-size: 13px;
  color: #eee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PlayerMeta = styled.div`
  font-size: 11px;
  color: #666;
  display: flex;
  gap: 6px;
  align-items: center;
`

const SelfBadge = styled.span`
  color: #14b8a6;
  font-size: 10px;
  font-weight: 600;
`

const DndBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: #ef444422;
  color: #ef4444;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
  letter-spacing: 0.5px;
`

const DndIcon = styled.span`
  font-size: 10px;
  line-height: 1;
`

const DeepWorkTimeMeta = styled.span`
  color: #8b5cf6;
  font-size: 10px;
`

const AfkReasonText = styled.span`
  color: #9ca3af;
  font-size: 11px;
`

const SalesStatusText = styled.span`
  color: #f59e0b;
  font-size: 11px;
`

const CustomStatusText = styled.span`
  color: #9ca3af;
  font-size: 11px;
  font-style: italic;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DeferredNote = styled.div`
  font-size: 10px;
  color: #8b5cf688;
  font-style: italic;
  padding: 2px 8px 4px;
  line-height: 1.3;
`

const InviteBoothButton = styled.button`
  background: transparent;
  border: 1px solid #ec489944;
  border-radius: 6px;
  color: #ec4899;
  font-size: 9px;
  padding: 2px 6px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    background: #ec489922;
    border-color: #ec4899;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const BoothStatusNote = styled.div`
  font-size: 10px;
  color: #ec489988;
  font-style: italic;
  padding: 2px 8px 4px;
  line-height: 1.3;
`

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return '<1m'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  return `${hours}h`
}

interface UserListPanelProps {
  onClose: () => void
}

export default function UserListPanel({ onClose }: UserListPanelProps): JSX.Element {
  const playerNameMap = useAppSelector((state) => state.user.playerNameMap)
  const playerZoneMap = useAppSelector((state) => state.user.playerZoneMap)
  const playerRoleMap = useAppSelector((state) => state.user.playerRoleMap)
  const playerStatusMap = useAppSelector((state) => state.user.playerStatusMap)
  const playerAfkReasonMap = useAppSelector((state) => state.user.playerAfkReasonMap)
  const playerSalesStatusMap = useAppSelector((state) => state.user.playerSalesStatusMap)
  const playerCustomStatusMap = useAppSelector((state) => state.user.playerCustomStatusMap)
  const playerDndMap = useAppSelector((state) => state.user.playerDndMap)
  const playerJoinTimeMap = useAppSelector((state) => state.user.playerJoinTimeMap)
  const myStatusPreset = useAppSelector((state) => state.user.myStatusPreset)
  const myStatusCustom = useAppSelector((state) => state.user.myStatusCustom)
  const myDnd = useAppSelector((state) => state.user.myDnd)
  const boothWaiting = useAppSelector((state) => state.boothInvite.waitingForResponse)
  const dispatch = useAppDispatch()

  // Tick toutes les 30s pour mettre a jour les durees en temps reel
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [])

  // Regrouper les joueurs par zone
  const playersByZone: Record<
    string,
    { id: string; name: string; role: string; status: string; customStatus: string; isDnd: boolean; isSelf: boolean; joinTime?: number; zone: string }[]
  > = {}
  for (const zone of ZONE_ORDER) {
    playersByZone[zone] = []
  }

  // Ajouter les autres joueurs
  playerNameMap.forEach((name, id) => {
    const zone = playerZoneMap.get(id) || 'brainstorm'
    const role = playerRoleMap.get(id) || ''
    const status = playerStatusMap.get(id) || 'available'
    const customStatus = playerCustomStatusMap.get(id) || ''
    const isDnd = playerDndMap.get(id) || false
    const joinTime = playerJoinTimeMap.get(id)
    if (!playersByZone[zone]) playersByZone[zone] = []
    playersByZone[zone].push({ id, name, role, status, customStatus, isDnd, isSelf: false, joinTime, zone })
  })

  // Ajouter le joueur local
  const game = phaserGame.scene.keys.game as Game
  const myName = game?.myPlayer?.playerName?.text || 'Moi'
  const myZone = game?.myPlayer?.currentZone || 'brainstorm'

  if (!playersByZone[myZone]) playersByZone[myZone] = []
  playersByZone[myZone].unshift({
    id: '_self',
    name: myName,
    role: '',
    status: myStatusPreset,
    customStatus: myStatusCustom,
    isDnd: myDnd,
    isSelf: true,
    zone: myZone,
  })

  const totalPlayers = playerNameMap.size + 1

  const handlePlayerClick = (id: string, isSelf: boolean) => {
    if (isSelf) return
    dispatch(setProfilePlayerId(id))
  }

  const handleBoothInvite = (targetId: string) => {
    try {
      const g = phaserGame.scene.keys.game as Game
      g.network.inviteToBooth(targetId)
      dispatch(setWaiting(true))
    } catch {
      // Scene pas encore prete
    }
  }

  // Compter les joueurs dans la zone one_on_one (pour le statut de la porte)
  const boothCount = (playersByZone['one_on_one'] || []).length
  const boothFull = boothCount >= 2

  return (
    <PanelWrapper>
      <Header>
        <h3>En ligne ({totalPlayers})</h3>
        <IconButton size="small" onClick={onClose} sx={{ color: '#999' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Header>
      {ZONE_ORDER.map((zone) => {
        const players = playersByZone[zone]
        if (!players || players.length === 0) return null
        const zoneColor = ZONE_COLORS[zone] || '#14b8a6'
        const isDeepWork = zone === 'deep_work'
        return (
          <ZoneSection key={zone}>
            <ZoneTitleRow>
              <ZoneTitle $color={zoneColor}>
                {ZONE_NAMES[zone] || zone}
                <CountBadge>({zone === 'one_on_one' ? `${players.length}/2` : players.length})</CountBadge>
              </ZoneTitle>
              {zone !== myZone && (
                <Tooltip title={`Se teleporter vers ${ZONE_NAMES[zone]}`} arrow>
                  <TeleportButton $color={zoneColor} onClick={() => {
                    // Teleporter vers le centre de la zone via une notification
                    // (Le joueur peut se deplacer manuellement)
                  }}>
                    <PlaceIcon /> Aller
                  </TeleportButton>
                </Tooltip>
              )}
            </ZoneTitleRow>
            {isDeepWork && (
              <DeferredNote>Les messages seront livres a la sortie</DeferredNote>
            )}
            {zone === 'one_on_one' && (
              <BoothStatusNote>
                Prive {boothFull ? '\uD83D\uDD12 Occupe' : '\uD83D\uDD13 Libre'}
              </BoothStatusNote>
            )}
            {players.map((player) => {
              // Utiliser le statut Slack-like (presets) s'il existe, sinon fallback sur le legacy
              const presetInfo = statusConfig[player.status] || statusConfig.available
              const dotColor = player.isDnd ? '#ef4444' : presetInfo.color
              const statusEmoji = presetInfo.emoji || ''
              const avatarColor = getColorByString(player.name)
              const duration = player.joinTime ? formatDuration(now - player.joinTime) : ''
              const isPlayerDeepWork = player.zone === 'deep_work'
              return (
                <PlayerRow
                  key={player.id}
                  onClick={() => handlePlayerClick(player.id, player.isSelf)}
                >
                  <AvatarCircle $color={avatarColor}>
                    {player.name.charAt(0).toUpperCase()}
                    <StatusDot $color={dotColor} />
                  </AvatarCircle>
                  <PlayerInfo>
                    <PlayerName>
                      {statusEmoji && <span style={{ marginRight: 4 }}>{statusEmoji}</span>}
                      {player.name}
                      {player.isSelf && <SelfBadge> (vous)</SelfBadge>}
                      {(player.isDnd || isPlayerDeepWork) && (
                        <Tooltip title="Ne pas deranger" arrow>
                          <DndBadge><DndIcon>&#128263;</DndIcon> DND</DndBadge>
                        </Tooltip>
                      )}
                    </PlayerName>
                    <PlayerMeta>
                      {player.customStatus ? (
                        <CustomStatusText>{player.customStatus}</CustomStatusText>
                      ) : player.status !== 'available' && presetInfo.label ? (
                        <CustomStatusText>{presetInfo.label}</CustomStatusText>
                      ) : null}
                      {player.zone === 'afk' && (() => {
                        const reasonKey = (playerAfkReasonMap.get(player.id) || '') as typeof AFK_REASONS[number]['key']
                        const reason = afkReasonMap.get(reasonKey)
                        return reason ? (
                          <AfkReasonText>{reason.icon} {reason.label}</AfkReasonText>
                        ) : null
                      })()}
                      {player.zone === 'sales' && (() => {
                        const ss = playerSalesStatusMap.get(player.id) || ''
                        const info = salesStatusIcons[ss]
                        return info ? (
                          <SalesStatusText>{info.icon} {info.label}</SalesStatusText>
                        ) : null
                      })()}
                      {player.role && <span>{player.role}</span>}
                      {isPlayerDeepWork && duration ? (
                        <DeepWorkTimeMeta>Focus {duration}</DeepWorkTimeMeta>
                      ) : (
                        duration && <span>{duration}</span>
                      )}
                    </PlayerMeta>
                  </PlayerInfo>
                  {player.zone === 'sales' && !player.isSelf && (() => {
                    const ss = playerSalesStatusMap.get(player.id) || ''
                    const isBusy = ss === 'on_call' || ss === 'preparing'
                    return (
                      <>
                        {isBusy && <KnockButton targetId={player.id} targetName={player.name} />}
                        <ObserveButton targetId={player.id} targetName={player.name} />
                      </>
                    )
                  })()}
                  {!player.isSelf && player.zone !== 'one_on_one' && (
                    <Tooltip title="Inviter pour un 1-on-1 prive" arrow>
                      <InviteBoothButton
                        disabled={boothWaiting || boothFull}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBoothInvite(player.id)
                        }}
                      >
                        1-on-1
                      </InviteBoothButton>
                    </Tooltip>
                  )}
                </PlayerRow>
              )
            })}
          </ZoneSection>
        )
      })}
    </PanelWrapper>
  )
}
