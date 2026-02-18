import React, { useState, useCallback, useRef, useEffect } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import MinimizeIcon from '@mui/icons-material/Minimize'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import VideocamIcon from '@mui/icons-material/Videocam'
import VideocamOffIcon from '@mui/icons-material/VideocamOff'

import { useAppSelector, useAppDispatch } from '../hooks'
import {
  setOverlayMinimized,
  toggleMic,
  toggleCamera,
  setShowLeaveConfirmDialog,
} from '../stores/MeetingStore'
import { liveKitService } from '../web/LiveKitService'

import VideoTileGrid from './meeting/VideoTileGrid'
import ScreenShareArea from './meeting/ScreenShareArea'
import MeetingToolbar from './meeting/MeetingToolbar'
import RecordingBanner from './RecordingBanner'
import MeetingTools from './MeetingTools'
import { ZONE_NAMES } from '../constants'
import { sanitizeId } from '../util'

/**
 * Overlay flottant de meeting par zone.
 * Affiche les flux video/audio des membres de la meme zone,
 * le partage d'ecran, et une barre d'outils.
 * Peut etre deplace par glisser-deposer sur l'en-tete.
 */

// ─── Styled Components ────────────────────────────────────────────────────────

/** Conteneur flottant principal de l'overlay */
const OverlayContainer = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  top: ${({ $y }) => $y}px;
  left: ${({ $x }) => $x}px;
  width: 380px;
  max-height: 80vh;
  background: #222639;
  border: 1px solid #14B8A6;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 50;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #eee;
`

/** En-tete de l'overlay — sert de poignee pour le deplacement */
const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #1a1d30;
  border-bottom: 1px solid #333;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
`

/** Informations de la zone (nom + nombre de membres) */
const ZoneInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }
`

/** Badge du nombre de membres */
const MemberCount = styled.span`
  background: #14B8A6;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
`

/** Mini-avatars des participants */
const AvatarRow = styled.div`
  display: flex;
  gap: 0;
  margin-left: 4px;
`

const MiniAvatar = styled.div<{ $color: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 2px solid #1a1d30;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  margin-left: -6px;

  &:first-child {
    margin-left: 0;
  }
`

/** Boutons de l'en-tete (minimiser, fermer) */
const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

/** Zone de contenu scrollable (entre l'en-tete et la toolbar) */
const ContentArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

// ─── Barre minimisee ──────────────────────────────────────────────────────────

/** Barre compacte affichee quand l'overlay est minimise */
const MinimizedBarWrapper = styled.div`
  position: fixed;
  bottom: 16px;
  right: 16px;
  background: #222639;
  border: 1px solid #14B8A6;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  color: #eee;
`

const MinimizedZoneName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
`

/** Petit bouton dans la barre minimisee */
const MiniIconButton = styled(IconButton)<{ $danger?: boolean }>`
  && {
    color: #fff;
    padding: 4px;
    background: ${({ $danger }) => ($danger ? '#d32f2f' : 'transparent')};
    &:hover {
      background: ${({ $danger }) => ($danger ? '#b71c1c' : 'rgba(255, 255, 255, 0.08)')};
    }
  }
`

// ─── Couleurs deterministes pour les mini-avatars ─────────────────────────────

const AVATAR_COLORS = [
  '#14B8A6', '#f59e0b', '#8b5cf6', '#ef4444',
  '#3b82f6', '#22c55e', '#ec4899', '#f97316',
]

function avatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ZoneMeetingOverlay(): JSX.Element | null {
  const dispatch = useAppDispatch()

  // Etat Redux
  const activeZone = useAppSelector((state) => state.meeting.activeZone)
  const overlayOpen = useAppSelector((state) => state.meeting.overlayOpen)
  const overlayMinimized = useAppSelector((state) => state.meeting.overlayMinimized)
  const zoneMemberIds = useAppSelector((state) => state.meeting.zoneMemberIds)
  const micEnabled = useAppSelector((state) => state.meeting.micEnabled)
  const cameraEnabled = useAppSelector((state) => state.meeting.cameraEnabled)
  const playerNameMap = useAppSelector((state) => state.user.playerNameMap)

  // Position du deplacement (drag)
  const [position, setPosition] = useState({ x: window.innerWidth - 396, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  // ─── Logique de deplacement (drag) ─────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Ignore si clic sur un bouton
      if ((e.target as HTMLElement).closest('button')) return
      setIsDragging(true)
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      }
    },
    [position]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      })
    },
    [isDragging]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Attache les ecouteurs globaux pour le deplacement
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  /** Demande confirmation avant de quitter la reunion */
  const handleClose = () => {
    dispatch(setShowLeaveConfirmDialog(true))
  }

  /** Minimise l'overlay */
  const handleMinimize = () => {
    dispatch(setOverlayMinimized(true))
  }

  /** Restaure l'overlay depuis la barre minimisee */
  const handleExpand = () => {
    dispatch(setOverlayMinimized(false))
  }

  /** Bascule le micro depuis la barre minimisee */
  const handleMiniToggleMic = () => {
    liveKitService.toggleMicrophone()
  }

  /** Bascule la camera depuis la barre minimisee */
  const handleMiniToggleCamera = () => {
    liveKitService.toggleCamera()
  }

  /** Empeche les clics de se propager au canvas Phaser en dessous */
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // ─── Conditions de rendu ───────────────────────────────────────────────────

  // Ne pas afficher si aucune zone active, ou si c'est deep_work/afk, ou si l'overlay est ferme
  if (!activeZone || activeZone === 'deep_work' || activeZone === 'afk' || !overlayOpen) return null

  const zoneName = ZONE_NAMES[activeZone] || activeZone
  const memberCount = zoneMemberIds.length

  // ─── Barre minimisee ──────────────────────────────────────────────────────

  if (overlayMinimized) {
    return (
      <MinimizedBarWrapper onMouseDown={stopPropagation}>
        <MinimizedZoneName>{zoneName}</MinimizedZoneName>
        <MemberCount>{memberCount}</MemberCount>

        {/* Bouton micro */}
        <Tooltip title={micEnabled ? 'Couper le micro' : 'Activer le micro'} arrow>
          <MiniIconButton
            $danger={!micEnabled}
            onClick={handleMiniToggleMic}
            size="small"
          >
            {micEnabled ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
          </MiniIconButton>
        </Tooltip>

        {/* Bouton camera */}
        <Tooltip title={cameraEnabled ? 'Couper la camera' : 'Activer la camera'} arrow>
          <MiniIconButton
            $danger={!cameraEnabled}
            onClick={handleMiniToggleCamera}
            size="small"
          >
            {cameraEnabled ? (
              <VideocamIcon fontSize="small" />
            ) : (
              <VideocamOffIcon fontSize="small" />
            )}
          </MiniIconButton>
        </Tooltip>

        {/* Bouton restaurer */}
        <Tooltip title="Agrandir" arrow>
          <IconButton onClick={handleExpand} size="small" sx={{ color: '#fff', padding: '4px' }}>
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </MinimizedBarWrapper>
    )
  }

  // ─── Overlay complet ──────────────────────────────────────────────────────

  return (
    <OverlayContainer
      $x={position.x}
      $y={position.y}
      onMouseDown={stopPropagation}
    >
      {/* En-tete deplacable */}
      <Header onMouseDown={handleMouseDown}>
        <ZoneInfo>
          <h4>{zoneName}</h4>
          <MemberCount>{memberCount}</MemberCount>
          <AvatarRow>
            {zoneMemberIds.slice(0, 6).map((id) => {
              const name = playerNameMap.get(sanitizeId(id)) || '?'
              return (
                <MiniAvatar key={id} $color={avatarColor(id)} title={name}>
                  {name.charAt(0).toUpperCase()}
                </MiniAvatar>
              )
            })}
            {zoneMemberIds.length > 6 && (
              <MiniAvatar $color="#555" title={`+${zoneMemberIds.length - 6} autres`}>
                +{zoneMemberIds.length - 6}
              </MiniAvatar>
            )}
          </AvatarRow>
        </ZoneInfo>
        <HeaderActions>
          <Tooltip title="Minimiser" arrow>
            <IconButton onClick={handleMinimize} size="small" sx={{ color: '#999' }}>
              <MinimizeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fermer" arrow>
            <IconButton onClick={handleClose} size="small" sx={{ color: '#999' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </HeaderActions>
      </Header>

      {/* Banniere d'enregistrement (visible par tous les participants) */}
      <RecordingBanner />

      {/* Contenu scrollable */}
      <ContentArea>
        {/* Zone de partage d'ecran (s'affiche si au moins un partage actif) */}
        <ScreenShareArea />

        {/* Grille video des participants */}
        <VideoTileGrid />
      </ContentArea>

      {/* Barre d'outils */}
      <MeetingToolbar />

      {/* Panneau lateral des outils de reunion (minuteur, agenda, notes) */}
      <MeetingTools />
    </OverlayContainer>
  )
}
