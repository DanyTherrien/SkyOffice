import React from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import PlaceIcon from '@mui/icons-material/Place'
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions'
import CircleIcon from '@mui/icons-material/Circle'

import { useAppSelector, useAppDispatch } from '../hooks'
import { setProfilePlayerId } from '../stores/UserStore'
import { ZONE_NAMES } from '../constants'
import { getColorByString } from '../util'
import { scaleIn } from '../styles/animations'

// ─── 3B — Carte de profil joueur (popover React) ───────────────────────────

const statusConfig: Record<string, { color: string; label: string }> = {
  available: { color: '#4ade80', label: 'Disponible' },
  meeting: { color: '#fb923c', label: 'En reunion' },
  dnd: { color: '#ef4444', label: 'Ne pas deranger' },
  idle: { color: '#9ca3af', label: 'Inactif' },
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
`

const Card = styled.div`
  background: #222639;
  border-radius: 16px;
  padding: 24px;
  width: 280px;
  color: #eee;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  position: relative;
  animation: ${scaleIn} 0.2s ease-out;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
`

const AvatarCircle = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  flex-shrink: 0;
`

const NameBlock = styled.div`
  flex: 1;

  h3 {
    margin: 0;
    font-size: 18px;
    color: #fff;
  }
`

const RoleBadge = styled.span`
  font-size: 12px;
  color: #999;
`

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
`

const InfoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #bbb;

  svg {
    font-size: 16px;
    color: #14b8a6;
  }
`

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
`

const ActionButton = styled.button`
  flex: 1;
  background: #2a2f4a;
  border: 1px solid #3a3f5a;
  border-radius: 8px;
  color: #eee;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: #343a5c;
    border-color: #14b8a6;
  }

  svg {
    font-size: 16px;
  }
`

const CloseButton = styled(IconButton)`
  position: absolute !important;
  top: 8px;
  right: 8px;
`

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remaining = mins % 60
  return remaining > 0 ? `${hours}h${remaining}m` : `${hours}h`
}

export default function PlayerProfileCard(): JSX.Element | null {
  const dispatch = useAppDispatch()
  const profilePlayerId = useAppSelector((s) => s.user.profilePlayerId)
  const playerNameMap = useAppSelector((s) => s.user.playerNameMap)
  const playerZoneMap = useAppSelector((s) => s.user.playerZoneMap)
  const playerRoleMap = useAppSelector((s) => s.user.playerRoleMap)
  const playerStatusMap = useAppSelector((s) => s.user.playerStatusMap)
  const playerJoinTimeMap = useAppSelector((s) => s.user.playerJoinTimeMap)

  if (!profilePlayerId) return null

  const name = playerNameMap.get(profilePlayerId) || 'Inconnu'
  const zone = playerZoneMap.get(profilePlayerId) || 'brainstorm'
  const role = playerRoleMap.get(profilePlayerId) || ''
  const status = playerStatusMap.get(profilePlayerId) || 'available'
  const joinTime = playerJoinTimeMap.get(profilePlayerId)
  const statusInfo = statusConfig[status] || statusConfig.available
  const avatarColor = getColorByString(name)

  const onlineDuration = joinTime ? formatDuration(Date.now() - joinTime) : ''

  const close = () => dispatch(setProfilePlayerId(null))

  const handleSendEmoji = () => {
    // Fermer le profil — l'emoji picker est accessible separement
    close()
  }

  return (
    <Overlay onClick={close}>
      <Card onClick={(e) => e.stopPropagation()}>
        <CloseButton size="small" onClick={close} sx={{ color: '#999' }}>
          <CloseIcon fontSize="small" />
        </CloseButton>
        <Header>
          <AvatarCircle $color={avatarColor}>{name.charAt(0).toUpperCase()}</AvatarCircle>
          <NameBlock>
            <h3>{name}</h3>
            {role && <RoleBadge>{role}</RoleBadge>}
            <StatusRow>
              <CircleIcon sx={{ fontSize: 8, color: statusInfo.color }} />
              <span style={{ color: statusInfo.color }}>{statusInfo.label}</span>
            </StatusRow>
          </NameBlock>
        </Header>
        <InfoSection>
          <InfoRow>
            <PlaceIcon />
            <span>{ZONE_NAMES[zone] || zone}</span>
          </InfoRow>
          {onlineDuration && (
            <InfoRow>
              <span style={{ fontSize: '16px', color: '#14b8a6' }}>🕒</span>
              <span>En ligne depuis {onlineDuration}</span>
            </InfoRow>
          )}
        </InfoSection>
        <ActionRow>
          <ActionButton onClick={handleSendEmoji}>
            <EmojiEmotionsIcon /> Emoji
          </ActionButton>
        </ActionRow>
      </Card>
    </Overlay>
  )
}
