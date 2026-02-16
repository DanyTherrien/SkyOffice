import React, { useState, useCallback, useRef, useEffect } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Badge from '@mui/material/Badge'
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
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

import VideoTileGrid from './meeting/VideoTileGrid'
import ScreenShareArea from './meeting/ScreenShareArea'
import MeetingToolbar from './meeting/MeetingToolbar'
import { ZONE_NAMES } from '../constants'

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

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ZoneMeetingOverlay() {
  const dispatch = useAppDispatch()

  // Etat Redux
  const activeZone = useAppSelector((state) => state.meeting.activeZone)
  const overlayOpen = useAppSelector((state) => state.meeting.overlayOpen)
  const overlayMinimized = useAppSelector((state) => state.meeting.overlayMinimized)
  const zoneMemberIds = useAppSelector((state) => state.meeting.zoneMemberIds)
  const micEnabled = useAppSelector((state) => state.meeting.micEnabled)
  const cameraEnabled = useAppSelector((state) => state.meeting.cameraEnabled)

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

  /** Obtient le ZoneMeetingManager */
  const getManager = () => {
    const game = phaserGame.scene.keys.game as Game
    return game.network.zoneMeetingManager
  }

  /** Bascule le micro depuis la barre minimisee */
  const handleMiniToggleMic = () => {
    dispatch(toggleMic())
    getManager()?.toggleMic()
  }

  /** Bascule la camera depuis la barre minimisee */
  const handleMiniToggleCamera = () => {
    dispatch(toggleCamera())
    getManager()?.toggleCamera()
  }

  /** Empeche les clics de se propager au canvas Phaser en dessous */
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // ─── Conditions de rendu ───────────────────────────────────────────────────

  // Ne pas afficher si aucune zone active, ou si c'est deep_work, ou si l'overlay est ferme
  if (!activeZone || activeZone === 'deep_work' || !overlayOpen) return null

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

      {/* Contenu scrollable */}
      <ContentArea>
        {/* Zone de partage d'ecran (s'affiche si au moins un partage actif) */}
        <ScreenShareArea />

        {/* Grille video des participants */}
        <VideoTileGrid />
      </ContentArea>

      {/* Barre d'outils */}
      <MeetingToolbar />
    </OverlayContainer>
  )
}
