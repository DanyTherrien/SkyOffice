import React, { useEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import MicOffIcon from '@mui/icons-material/MicOff'

import { useAppSelector } from '../../hooks'
import { applySpeakerOutput, isSpeakerSelectionSupported, isPeerMuted, isPeerVideoOff } from '../../web/mediaDevices'
import { useSpeakingDetector } from '../../hooks/useSpeakingDetector'

/** Grille de tuiles video pour l'overlay de meeting */

const GridWrapper = styled.div`
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
`

const VideoTile = styled.div`
  position: relative;
  background: #1a1d30;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4 / 3;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

/** Etiquette du nom du joueur en bas de la tuile */
const NameLabel = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

/** Icone de micro coupe, positionne en haut a droite */
const MutedIndicator = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(211, 47, 47, 0.85);
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 14px;
    color: #fff;
  }
`

/** Placeholder affiche quand la camera est eteinte */
const CameraOffPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 13px;
  user-select: none;
`

/** Placeholder pour les etats de connexion (connexion en cours / erreur) */
const ConnectionPlaceholder = styled.div<{ $error?: boolean }>`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${({ $error }) => ($error ? '#ef4444' : '#999')};
  font-size: 13px;
  user-select: none;
  gap: 8px;
`

const pulseAnim = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`

/** Bordure pulsante teal pour indiquer qu'un participant parle */
const SpeakingBorder = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 8px;
  pointer-events: none;
  box-shadow: 0 0 0 3px #14B8A6;
  animation: ${pulseAnim} 1s ease-in-out infinite;
  z-index: 10;
`

const spinAnim = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid #555;
  border-top-color: #14B8A6;
  border-radius: 50%;
  animation: ${spinAnim} 1s linear infinite;
`

/** Video locale avec support du miroir */
function LocalVideo({ stream, mirror }: { stream: MediaStream; mirror: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
    />
  )
}

/** Video d'un pair avec volume et sinkId */
function PeerVideo({
  stream,
  volume,
  speakerId,
}: {
  stream: MediaStream
  volume: number
  speakerId: string
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])

  useEffect(() => {
    if (ref.current) ref.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (ref.current && speakerId && isSpeakerSelectionSupported()) {
      applySpeakerOutput(ref.current, speakerId)
    }
  }, [speakerId])

  return <video ref={ref} autoPlay playsInline />
}

/** Tuile video du joueur local avec indicateur de parole */
function LocalVideoTile({
  stream,
  mirror,
  micEnabled,
  cameraEnabled,
}: {
  stream: MediaStream | null
  mirror: boolean
  micEnabled: boolean
  cameraEnabled: boolean
}) {
  const isSpeaking = useSpeakingDetector(stream)

  return (
    <VideoTile>
      {stream && cameraEnabled ? (
        <LocalVideo stream={stream} mirror={mirror} />
      ) : (
        <CameraOffPlaceholder>Camera eteinte</CameraOffPlaceholder>
      )}
      <NameLabel>Vous</NameLabel>
      {!micEnabled && (
        <MutedIndicator>
          <MicOffIcon />
        </MutedIndicator>
      )}
      {isSpeaking && micEnabled && <SpeakingBorder />}
    </VideoTile>
  )
}

/** Tuile video d'un pair avec indicateurs de parole, mute et etats de connexion */
function PeerVideoTile({
  stream,
  playerName,
  volume,
  speakerId,
  connectionState,
}: {
  stream: MediaStream | null
  playerName: string
  volume: number
  speakerId: string
  connectionState: 'connecting' | 'connected' | 'error' | undefined
}) {
  const isSpeaking = useSpeakingDetector(stream)
  const isMuted = isPeerMuted(stream)
  const isVideoOff = isPeerVideoOff(stream)

  let tileContent: React.ReactNode

  if (connectionState === 'error') {
    tileContent = (
      <ConnectionPlaceholder $error>
        Erreur de connexion
      </ConnectionPlaceholder>
    )
  } else if (connectionState === 'connecting' || !stream) {
    tileContent = (
      <ConnectionPlaceholder>
        <Spinner />
        Connexion...
      </ConnectionPlaceholder>
    )
  } else if (isVideoOff) {
    tileContent = <CameraOffPlaceholder>Camera eteinte</CameraOffPlaceholder>
  } else {
    tileContent = <PeerVideo stream={stream} volume={volume} speakerId={speakerId} />
  }

  return (
    <VideoTile>
      {tileContent}
      <NameLabel>{playerName}</NameLabel>
      {isMuted && stream && (
        <MutedIndicator>
          <MicOffIcon />
        </MutedIndicator>
      )}
      {isSpeaking && !isMuted && <SpeakingBorder />}
    </VideoTile>
  )
}

export default function VideoTileGrid() {
  const myVideoStream = useAppSelector((state) => state.meeting.myVideoStream)
  const cameraEnabled = useAppSelector((state) => state.meeting.cameraEnabled)
  const micEnabled = useAppSelector((state) => state.meeting.micEnabled)
  const peerVideoStreams = useAppSelector((state) => state.meeting.peerVideoStreams)
  const peerConnectionStates = useAppSelector((state) => state.meeting.peerConnectionStates)
  const mirrorCamera = useAppSelector((state) => state.mediaSettings.mirrorCamera)
  const speakerVolume = useAppSelector((state) => state.mediaSettings.speakerVolume)
  const selectedSpeakerId = useAppSelector((state) => state.mediaSettings.selectedSpeakerId)

  // Union des pairs connus (ceux avec stream + ceux en connexion)
  const allPeerIds = new Set([
    ...peerVideoStreams.keys(),
    ...peerConnectionStates.keys(),
  ])

  return (
    <GridWrapper>
      <Grid>
        {/* Tuile video du joueur local — toujours en premier, audio mute (evite l'echo) */}
        <LocalVideoTile
          stream={myVideoStream}
          mirror={mirrorCamera}
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
        />

        {/* Tuiles des pairs */}
        {[...allPeerIds].map((peerId) => {
          const peerData = peerVideoStreams.get(peerId)
          const connectionState = peerConnectionStates.get(peerId)

          return (
            <PeerVideoTile
              key={peerId}
              stream={peerData?.stream || null}
              playerName={peerData?.playerName || 'Inconnu'}
              volume={speakerVolume}
              speakerId={selectedSpeakerId}
              connectionState={connectionState}
            />
          )
        })}
      </Grid>
    </GridWrapper>
  )
}
