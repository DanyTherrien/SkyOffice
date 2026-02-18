import React, { useState, useEffect, useRef, useCallback } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import CloseIcon from '@mui/icons-material/Close'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import VideocamIcon from '@mui/icons-material/Videocam'
import VideocamOffIcon from '@mui/icons-material/VideocamOff'

import { useAppSelector, useAppDispatch } from '../hooks'
import {
  setShowMeetingPreview,
  setPendingZone,
  toggleMic,
  toggleCamera,
  setMediaError,
} from '../stores/MeetingStore'
import { buildMediaConstraints } from '../web/mediaDevices'
import { useAudioLevel } from '../hooks/useAudioLevel'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

const zoneNames: Record<string, string> = {
  brainstorm: 'Remue-meninges',
  meeting: 'Salle de reunion',
  deep_work: 'Travail profond',
  sales: 'Salle de ventes',
}

/* ─── Styled components ─── */

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
`

const DialogWrapper = styled.div`
  background: #222639;
  border-radius: 16px;
  padding: 24px;
  width: 380px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  color: #eee;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 18px;
  }
`

const ZoneLabel = styled.div`
  font-size: 14px;
  color: #14b8a6;
  font-weight: bold;
  margin-bottom: 16px;
  text-align: center;
`

const PreviewVideo = styled.video`
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  background: #1a1d30;
  object-fit: cover;
  transform: scaleX(-1);
`

const LevelBarOuter = styled.div`
  height: 6px;
  border-radius: 3px;
  background: #1a1d30;
  position: relative;
  overflow: hidden;
  margin: 8px 0;
`

const LevelBarInner = styled.div<{ $level: number }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${({ $level }) => $level}%;
  background: ${({ $level }) => ($level > 80 ? '#ef4444' : '#14B8A6')};
  border-radius: 3px;
  transition: width 50ms linear;
`

const ControlsRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 16px 0;
`

const ToggleButton = styled(IconButton)<{ $active: boolean }>`
  && {
    background: ${({ $active }) => ($active ? '#14b8a633' : '#ef444433')};
    color: ${({ $active }) => ($active ? '#14B8A6' : '#ef4444')};
    width: 48px;
    height: 48px;

    &:hover {
      background: ${({ $active }) => ($active ? '#14b8a644' : '#ef444444')};
    }
  }
`

const ButtonsRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`

export default function MeetingPreviewDialog(): JSX.Element | null {
  const dispatch = useAppDispatch()
  const showPreview = useAppSelector((s) => s.meeting.showMeetingPreview)
  const pendingZone = useAppSelector((s) => s.meeting.pendingZone)
  const micEnabled = useAppSelector((s) => s.meeting.micEnabled)
  const cameraEnabled = useAppSelector((s) => s.meeting.cameraEnabled)
  const mediaError = useAppSelector((s) => s.meeting.mediaError)
  const mediaSettings = useAppSelector((s) => s.mediaSettings)

  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const mountedRef = useRef(true)

  const audioLevel = useAudioLevel(previewStream)

  const stopPreview = useCallback(() => {
    setPreviewStream((prev) => {
      if (prev) prev.getTracks().forEach((t) => t.stop())
      return null
    })
  }, [])

  const startPreview = useCallback(async () => {
    stopPreview()
    try {
      const constraints = buildMediaConstraints({
        cameraId: mediaSettings.selectedCameraId,
        microphoneId: mediaSettings.selectedMicrophoneId,
        noiseSuppression: mediaSettings.noiseSuppression,
        echoCancellation: mediaSettings.echoCancellation,
        autoGainControl: mediaSettings.autoGainControl,
      })
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      setPreviewStream(stream)
    } catch (err) {
      console.warn('[MeetingPreview] Impossible d\'obtenir le preview:', err)
    }
  }, [
    mediaSettings.selectedCameraId,
    mediaSettings.selectedMicrophoneId,
    mediaSettings.noiseSuppression,
    mediaSettings.echoCancellation,
    mediaSettings.autoGainControl,
    stopPreview,
  ])

  // Demarrer le preview quand le dialog s'ouvre
  useEffect(() => {
    mountedRef.current = true
    if (showPreview) {
      startPreview()
    }
    return () => {
      mountedRef.current = false
    }
  }, [showPreview]) // eslint-disable-line

  // Attacher le stream au video element
  useEffect(() => {
    if (previewVideoRef.current && previewStream) {
      previewVideoRef.current.srcObject = previewStream
    }
  }, [previewStream])

  // Appliquer l'etat mic/camera au stream de preview
  useEffect(() => {
    if (!previewStream) return
    const audioTrack = previewStream.getAudioTracks()[0]
    if (audioTrack) audioTrack.enabled = micEnabled
    const videoTrack = previewStream.getVideoTracks()[0]
    if (videoTrack) videoTrack.enabled = cameraEnabled
  }, [micEnabled, cameraEnabled, previewStream])

  const handleClose = () => {
    stopPreview()
    dispatch(setShowMeetingPreview(false))
    dispatch(setPendingZone(null))
  }

  const handleJoin = () => {
    stopPreview()
    dispatch(setShowMeetingPreview(false))
    const zone = pendingZone
    dispatch(setPendingZone(null))
    if (zone) {
      const game = phaserGame.scene.keys.game as Game
      game.network.zoneMeetingManager?.joinZone(zone)
    }
  }

  const handleJoinWithoutMedia = () => {
    stopPreview()
    // Desactiver mic et camera avant de joindre
    if (micEnabled) dispatch(toggleMic())
    if (cameraEnabled) dispatch(toggleCamera())
    dispatch(setShowMeetingPreview(false))
    const zone = pendingZone
    dispatch(setPendingZone(null))
    if (zone) {
      const game = phaserGame.scene.keys.game as Game
      game.network.zoneMeetingManager?.joinZone(zone)
    }
  }

  if (!showPreview) return null

  return (
    <>
      <Backdrop onClick={handleClose}>
        <DialogWrapper onClick={(e) => e.stopPropagation()}>
          <Header>
            <h3>Rejoindre la reunion</h3>
            <IconButton onClick={handleClose} size="small" sx={{ color: '#999' }}>
              <CloseIcon />
            </IconButton>
          </Header>

          <ZoneLabel>{zoneNames[pendingZone || ''] || pendingZone}</ZoneLabel>

          <PreviewVideo ref={previewVideoRef} autoPlay playsInline muted />

          <LevelBarOuter>
            <LevelBarInner $level={micEnabled ? audioLevel : 0} />
          </LevelBarOuter>

          <ControlsRow>
            <ToggleButton $active={micEnabled} onClick={() => dispatch(toggleMic())}>
              {micEnabled ? <MicIcon /> : <MicOffIcon />}
            </ToggleButton>
            <ToggleButton $active={cameraEnabled} onClick={() => dispatch(toggleCamera())}>
              {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
            </ToggleButton>
          </ControlsRow>

          <ButtonsRow>
            <Button
              variant="contained"
              fullWidth
              onClick={handleJoin}
              sx={{
                background: '#14B8A6',
                textTransform: 'none',
                fontWeight: 'bold',
                '&:hover': { background: '#0d9488' },
              }}
            >
              Rejoindre
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleJoinWithoutMedia}
              sx={{
                color: '#ccc',
                borderColor: '#555',
                textTransform: 'none',
                '&:hover': { borderColor: '#999', color: '#eee' },
              }}
            >
              Sans media
            </Button>
          </ButtonsRow>
        </DialogWrapper>
      </Backdrop>

      {/* Snackbar non-bloquante pour les erreurs media */}
      <Snackbar
        open={!!mediaError}
        autoHideDuration={6000}
        onClose={() => dispatch(setMediaError(null))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="warning"
          onClose={() => dispatch(setMediaError(null))}
          variant="filled"
        >
          {mediaError}
        </Alert>
      </Snackbar>
    </>
  )
}
