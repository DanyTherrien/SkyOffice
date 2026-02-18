import React from 'react'
import styled, { keyframes } from 'styled-components'
import { useAppSelector } from '../hooks'

/**
 * Banniere de consentement/notification affichee a TOUS les participants
 * quand un enregistrement audio est en cours dans la zone de reunion.
 * Affiche un point rouge pulsant et le nom de l'enregistreur.
 */

// ─── Animations ────────────────────────────────────────────────────────────────

const pulse = keyframes`
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
`

// ─── Styled Components ─────────────────────────────────────────────────────────

const BannerWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 68, 68, 0.15);
  border-bottom: 1px solid rgba(255, 68, 68, 0.3);
  color: #ff6b6b;
  font-size: 12px;
  font-weight: 600;
`

const PulsingDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4444;
  animation: ${pulse} 1.5s ease-in-out infinite;
  flex-shrink: 0;
`

const BannerText = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

// ─── Composant ─────────────────────────────────────────────────────────────────

export default function RecordingBanner(): JSX.Element | null {
  const isRecording = useAppSelector((state) => state.recording.isRecording)
  const recorderName = useAppSelector((state) => state.recording.recorderName)

  if (!isRecording) return null

  return (
    <BannerWrapper>
      <PulsingDot />
      <BannerText>Enregistrement en cours par {recorderName}</BannerText>
    </BannerWrapper>
  )
}
