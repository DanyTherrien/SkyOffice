import React, { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import RefreshIcon from '@mui/icons-material/Refresh'
import Button from '@mui/material/Button'

import { useAppSelector } from '../hooks'
import { slideDown } from '../styles/animations'

// ─── 3E — UI d'etat de connexion ──────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`

const Banner = styled.div<{ $type: 'disconnected' | 'reconnecting' | 'error' }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 20px;
  font-size: 14px;
  color: #fff;
  animation: ${slideDown} 0.3s ease-out;
  background: ${({ $type }) =>
    $type === 'disconnected'
      ? '#ef4444'
      : $type === 'reconnecting'
      ? '#f59e0b'
      : '#ef4444'};
  ${({ $type }) =>
    $type === 'reconnecting' &&
    `animation: ${slideDown} 0.3s ease-out, ${pulse} 1.5s ease-in-out infinite;`}
`

const RetryButton = styled(Button)`
  color: #fff !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  font-size: 12px !important;
  padding: 2px 12px !important;
`

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'error'

export default function ConnectionBanner(): JSX.Element | null {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected')
  const [errorMessage, setErrorMessage] = useState('')
  const roomJoined = useAppSelector((s) => s.room.roomJoined)

  useEffect(() => {
    if (!roomJoined) return

    const handleOnline = () => {
      setConnectionState('connected')
      setErrorMessage('')
    }
    const handleOffline = () => {
      setConnectionState('disconnected')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verifier l'etat initial
    if (!navigator.onLine) {
      setConnectionState('disconnected')
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [roomJoined])

  const handleRetry = () => {
    setConnectionState('reconnecting')
    // Tenter de recharger la page apres un court delai
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  if (connectionState === 'connected' || !roomJoined) return null

  return (
    <Banner $type={connectionState === 'error' ? 'error' : connectionState}>
      <WifiOffIcon fontSize="small" />
      {connectionState === 'disconnected' && (
        <>
          <span>Connexion perdue. Verifiez votre reseau.</span>
          <RetryButton variant="outlined" size="small" onClick={handleRetry} startIcon={<RefreshIcon />}>
            Reconnecter
          </RetryButton>
        </>
      )}
      {connectionState === 'reconnecting' && <span>Reconnexion en cours...</span>}
      {connectionState === 'error' && (
        <>
          <span>{errorMessage || 'Erreur de connexion.'}</span>
          <RetryButton variant="outlined" size="small" onClick={handleRetry} startIcon={<RefreshIcon />}>
            Reessayer
          </RetryButton>
        </>
      )}
    </Banner>
  )
}
