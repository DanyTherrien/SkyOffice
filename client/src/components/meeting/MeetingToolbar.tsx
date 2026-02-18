import React, { useState, useEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
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
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import StopIcon from '@mui/icons-material/Stop'
import AssignmentIcon from '@mui/icons-material/Assignment'

import { useAppSelector, useAppDispatch } from '../../hooks'
import { toggleMic, toggleCamera, setOverlayMinimized, setShowLeaveConfirmDialog } from '../../stores/MeetingStore'
import { startRecording as startRecordingAction, stopRecording as stopRecordingAction } from '../../stores/RecordingStore'
import { togglePanel } from '../../stores/MeetingToolsStore'
import { openMediaSettings } from '../../stores/MediaSettingsStore'
import { liveKitService } from '../../web/LiveKitService'
import phaserGame from '../../PhaserGame'
import Game from '../../scenes/Game'
import recordingManager from '../../services/RecordingManager'
import store from '../../stores'

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

/** Animation de pulsation pour le bouton d'enregistrement actif */
const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`

/** Bouton d'enregistrement avec fond rouge et pulsation quand actif */
const RecordButton = styled(IconButton)<{ $recording?: boolean }>`
  && {
    color: ${({ $recording }) => ($recording ? '#ff4444' : '#fff')};
    background: ${({ $recording }) => ($recording ? 'rgba(255, 68, 68, 0.2)' : 'transparent')};
    animation: ${({ $recording }) => ($recording ? pulse : 'none')} 1.5s ease-in-out infinite;
    &:hover {
      background: ${({ $recording }) => ($recording ? 'rgba(255, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.08)')};
    }
  }
`

/** Affichage du temps ecoule a cote du bouton d'enregistrement */
const RecordingTime = styled.span`
  color: #ff4444;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  min-width: 40px;
`

/** Bouton outils de reunion avec indicateur actif */
const MeetingToolsButton = styled(IconButton)<{ $active?: boolean }>`
  && {
    color: #fff;
    background: ${({ $active }) => ($active ? '#14B8A6' : 'transparent')};
    &:hover {
      background: ${({ $active }) => ($active ? '#0d9488' : 'rgba(255, 255, 255, 0.08)')};
    }
  }
`

/** Formate les secondes en mm:ss */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function MeetingToolbar(): JSX.Element {
  const dispatch = useAppDispatch()
  const micEnabled = useAppSelector((state) => state.meeting.micEnabled)
  const cameraEnabled = useAppSelector((state) => state.meeting.cameraEnabled)
  const myScreenStream = useAppSelector((state) => state.meeting.myScreenStream)
  const activeZone = useAppSelector((state) => state.meeting.activeZone)
  const isLocalRecording = useAppSelector((state) => state.recording.isLocalRecording)
  const recordingStartTime = useAppSelector((state) => state.recording.startTime)
  const meetingToolsOpen = useAppSelector((state) => state.meetingTools.panelOpen)

  const isScreenSharing = myScreenStream !== null
  const isMeetingZone = activeZone === 'meeting'

  // Compteur de temps ecoule pour l'enregistrement
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isLocalRecording && recordingStartTime) {
      // Mettre a jour le compteur chaque seconde
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - recordingStartTime) / 1000))
      }, 1000)
    } else {
      setElapsed(0)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isLocalRecording, recordingStartTime])

  /** Obtient le Network via l'instance Phaser */
  const getNetwork = () => {
    const game = phaserGame.scene.keys.game as Game
    return game.network
  }

  /** Bascule le micro via LiveKit */
  const handleToggleMic = () => {
    liveKitService.toggleMicrophone()
  }

  /** Bascule la camera via LiveKit */
  const handleToggleCamera = () => {
    liveKitService.toggleCamera()
  }

  /** Demarre ou arrete le partage d'ecran via LiveKit */
  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      liveKitService.stopScreenShare()
    } else {
      liveKitService.startScreenShare()
    }
  }

  /** Demarre ou arrete l'enregistrement audio */
  const handleToggleRecording = async () => {
    if (isLocalRecording) {
      // Arreter l'enregistrement
      try {
        const blob = await recordingManager.stopRecording()
        dispatch(stopRecordingAction())
        getNetwork().stopRecording()
        // Telecharger automatiquement le fichier
        recordingManager.downloadRecording(blob, activeZone || 'meeting')
      } catch (err) {
        console.error('[Recording] Erreur a l\'arret:', err)
        dispatch(stopRecordingAction())
      }
    } else {
      // Demarrer l'enregistrement
      try {
        await recordingManager.startRecording()
        // Recuperer le nom du joueur local pour le store
        const playerName = store.getState().user.playerNameMap.get(
          getNetwork().mySessionId.replace(/[^0-9a-z]/gi, 'G')
        ) || 'Inconnu'
        dispatch(startRecordingAction({ recorderName: playerName }))
        getNetwork().startRecording()
      } catch (err) {
        console.error('[Recording] Erreur au demarrage:', err)
      }
    }
  }

  /** 5E — Picture-in-Picture : flotter la video meeting hors de l'onglet */
  const handlePiP = async () => {
    try {
      // Chercher la premiere video visible dans l'overlay
      const videoEl = document.querySelector('.meeting-video-grid video') as HTMLVideoElement
      if (videoEl && document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture()
        } else {
          await videoEl.requestPictureInPicture()
        }
      }
    } catch (err) {
      console.warn('[PiP] Non supporte ou erreur:', err)
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

      {/* Bouton enregistrement — uniquement dans la zone meeting */}
      {isMeetingZone && (
        <>
          <Tooltip
            title={isLocalRecording ? "Arreter l'enregistrement" : 'Enregistrer la reunion'}
            arrow
          >
            <RecordButton
              $recording={isLocalRecording}
              onClick={handleToggleRecording}
              size="medium"
            >
              {isLocalRecording ? <StopIcon /> : <FiberManualRecordIcon />}
            </RecordButton>
          </Tooltip>
          {isLocalRecording && <RecordingTime>{formatElapsed(elapsed)}</RecordingTime>}
        </>
      )}

      {/* Bouton outils de reunion — uniquement dans la zone meeting */}
      {isMeetingZone && (
        <Tooltip title={meetingToolsOpen ? 'Fermer les outils' : 'Outils de reunion'} arrow>
          <MeetingToolsButton
            $active={meetingToolsOpen}
            onClick={() => dispatch(togglePanel())}
            size="medium"
          >
            <AssignmentIcon />
          </MeetingToolsButton>
        </Tooltip>
      )}

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

      {/* 5E — Bouton Picture-in-Picture */}
      {document.pictureInPictureEnabled && (
        <Tooltip title="Picture-in-Picture" arrow>
          <IconButton
            onClick={handlePiP}
            size="medium"
            sx={{ color: '#fff' }}
          >
            <PictureInPictureAltIcon />
          </IconButton>
        </Tooltip>
      )}

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
