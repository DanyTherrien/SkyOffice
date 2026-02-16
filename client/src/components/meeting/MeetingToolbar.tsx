import React from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import VideocamIcon from '@mui/icons-material/Videocam'
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare'
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import MinimizeIcon from '@mui/icons-material/Minimize'
import SettingsIcon from '@mui/icons-material/Settings'
import CallEndIcon from '@mui/icons-material/CallEnd'

import { useAppSelector, useAppDispatch } from '../../hooks'
import { toggleMic, toggleCamera, setOverlayMinimized, setShowLeaveConfirmDialog } from '../../stores/MeetingStore'
import { openMediaSettings } from '../../stores/MediaSettingsStore'
import phaserGame from '../../PhaserGame'
import Game from '../../scenes/Game'

/** Barre d'outils en bas de l'overlay de meeting */

const ToolbarWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #1a1d30;
  border-top: 1px solid #333;
  border-radius: 0 0 12px 12px;
`

/** Style pour les boutons avec fond rouge (micro/camera coupes) */
const StyledIconButton = styled(IconButton)<{ $active?: boolean; $danger?: boolean }>`
  && {
    color: #fff;
    background: ${({ $danger }) => ($danger ? '#d32f2f' : 'transparent')};
    &:hover {
      background: ${({ $danger }) => ($danger ? '#b71c1c' : 'rgba(255, 255, 255, 0.08)')};
    }
  }
`

/** Style pour le bouton de partage d'ecran actif (vert) */
const ScreenShareButton = styled(IconButton)<{ $sharing?: boolean }>`
  && {
    color: #fff;
    background: ${({ $sharing }) => ($sharing ? '#14B8A6' : 'transparent')};
    &:hover {
      background: ${({ $sharing }) => ($sharing ? '#0d9488' : 'rgba(255, 255, 255, 0.08)')};
    }
  }
`

export default function MeetingToolbar() {
  const dispatch = useAppDispatch()
  const micEnabled = useAppSelector((state) => state.meeting.micEnabled)
  const cameraEnabled = useAppSelector((state) => state.meeting.cameraEnabled)
  const myScreenStream = useAppSelector((state) => state.meeting.myScreenStream)

  const isScreenSharing = myScreenStream !== null

  /** Obtient le ZoneMeetingManager via l'instance Phaser */
  const getManager = () => {
    const game = phaserGame.scene.keys.game as Game
    return game.network.zoneMeetingManager
  }

  /** Bascule le micro: dispatch Redux + appel manager */
  const handleToggleMic = () => {
    dispatch(toggleMic())
    getManager()?.toggleMic()
  }

  /** Bascule la camera: dispatch Redux + appel manager */
  const handleToggleCamera = () => {
    dispatch(toggleCamera())
    getManager()?.toggleCamera()
  }

  /** Demarre ou arrete le partage d'ecran */
  const handleToggleScreenShare = () => {
    const manager = getManager()
    if (isScreenSharing) {
      manager?.stopScreenShare()
    } else {
      manager?.startScreenShare()
    }
  }

  /** Minimise l'overlay */
  const handleMinimize = () => {
    dispatch(setOverlayMinimized(true))
  }

  return (
    <ToolbarWrapper>
      {/* Bouton micro */}
      <Tooltip title={micEnabled ? 'Couper le micro' : 'Activer le micro'} arrow>
        <StyledIconButton
          $danger={!micEnabled}
          onClick={handleToggleMic}
          size="medium"
        >
          {micEnabled ? <MicIcon /> : <MicOffIcon />}
        </StyledIconButton>
      </Tooltip>

      {/* Bouton camera */}
      <Tooltip title={cameraEnabled ? 'Couper la camera' : 'Activer la camera'} arrow>
        <StyledIconButton
          $danger={!cameraEnabled}
          onClick={handleToggleCamera}
          size="medium"
        >
          {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
        </StyledIconButton>
      </Tooltip>

      {/* Bouton partage d'ecran */}
      <Tooltip title={isScreenSharing ? "Arreter le partage" : "Partager l'ecran"} arrow>
        <ScreenShareButton
          $sharing={isScreenSharing}
          onClick={handleToggleScreenShare}
          size="medium"
        >
          {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        </ScreenShareButton>
      </Tooltip>

      {/* Bouton quitter la reunion */}
      <Tooltip title="Quitter la reunion" arrow>
        <StyledIconButton
          $danger
          onClick={() => dispatch(setShowLeaveConfirmDialog(true))}
          size="medium"
        >
          <CallEndIcon />
        </StyledIconButton>
      </Tooltip>

      {/* Bouton parametres media */}
      <Tooltip title="Parametres media" arrow>
        <IconButton
          onClick={() => dispatch(openMediaSettings())}
          size="medium"
          sx={{ color: '#fff' }}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>

      {/* Bouton minimiser */}
      <Tooltip title="Minimiser" arrow>
        <IconButton
          onClick={handleMinimize}
          size="medium"
          sx={{ color: '#fff' }}
        >
          <MinimizeIcon />
        </IconButton>
      </Tooltip>
    </ToolbarWrapper>
  )
}
