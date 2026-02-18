import React, { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { useAppSelector } from '../hooks'
import logo from '../images/logo.png'

/* ─── Animations ─────────────────────────────────────────────────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
`

const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`

const pulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
`

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
`

/* ─── Styled Components ──────────────────────────────────────────────── */

const Overlay = styled.div<{ $hiding: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f1221 0%, #1a1d30 40%, #222639 100%);
  animation: ${(p) => (p.$hiding ? fadeOut : fadeIn)} ${(p) => (p.$hiding ? '0.6s' : '0.3s')}
    ease-out forwards;
  pointer-events: ${(p) => (p.$hiding ? 'none' : 'all')};
`

const LogoContainer = styled.div`
  animation: ${fadeIn} 0.8s ease-out, ${float} 3s ease-in-out infinite;
  margin-bottom: 48px;
`

const Logo = styled.img`
  height: 100px;
  border-radius: 12px;
  filter: drop-shadow(0 4px 24px rgba(20, 184, 166, 0.3));
`

const Title = styled.h1`
  color: #eee;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  animation: ${fadeIn} 0.6s ease-out 0.2s both;
`

const Subtitle = styled.p`
  color: #999;
  font-size: 14px;
  margin: 0 0 40px;
  animation: ${fadeIn} 0.6s ease-out 0.4s both;
`

const ProgressContainer = styled.div`
  width: 280px;
  animation: ${fadeIn} 0.6s ease-out 0.5s both;
`

const ProgressTrack = styled.div`
  width: 100%;
  height: 4px;
  background: #333;
  border-radius: 2px;
  overflow: hidden;
`

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${(p) => p.$progress}%;
  background: linear-gradient(90deg, #14b8a6, #3b82f6);
  border-radius: 2px;
  transition: width 0.3s ease-out;
`

const StatusText = styled.p`
  color: #14b8a6;
  font-size: 13px;
  text-align: center;
  margin-top: 16px;
  animation: ${pulse} 2s ease-in-out infinite;
  min-height: 20px;
`

const Dots = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
  animation: ${fadeIn} 0.6s ease-out 0.6s both;
`

const Dot = styled.div<{ $active: boolean; $delay: number }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => (p.$active ? '#14b8a6' : '#444')};
  transition: background 0.3s;
  animation: ${pulse} 1.5s ease-in-out infinite;
  animation-delay: ${(p) => p.$delay}s;
`

const Footer = styled.div`
  position: absolute;
  bottom: 32px;
  color: #555;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
`

/* ─── Component ──────────────────────────────────────────────────────── */

const STEPS = [
  'Chargement des assets...',
  'Preparation du bureau...',
  'Connexion au serveur...',
  'Pret !',
]

export default function LoadingScreen(): JSX.Element | null {
  const lobbyJoined = useAppSelector((s) => s.room.lobbyJoined)
  const roomJoined = useAppSelector((s) => s.room.roomJoined)

  const [hiding, setHiding] = useState(false)
  const [visible, setVisible] = useState(true)

  // Determine progress based on Redux state
  let progress: number
  let stepIndex: number
  if (roomJoined) {
    progress = 100
    stepIndex = 3
  } else if (lobbyJoined) {
    progress = 70
    stepIndex = 2
  } else {
    progress = 35
    stepIndex = 0
  }

  // Simulate smooth intermediate progress
  const [displayProgress, setDisplayProgress] = useState(0)
  useEffect(() => {
    const target = progress
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev >= target) {
          clearInterval(interval)
          return target
        }
        return Math.min(prev + 1, target)
      })
    }, 30)
    return () => clearInterval(interval)
  }, [progress])

  // Auto-hide once lobby is joined (user needs to interact with room selection)
  useEffect(() => {
    if (lobbyJoined) {
      const timer = setTimeout(() => setHiding(true), 800)
      return () => clearTimeout(timer)
    }
  }, [lobbyJoined])

  useEffect(() => {
    if (hiding) {
      const timer = setTimeout(() => setVisible(false), 600)
      return () => clearTimeout(timer)
    }
  }, [hiding])

  if (!visible) return null

  return (
    <Overlay $hiding={hiding}>
      <LogoContainer>
        <Logo src={logo} alt="Capturia" />
      </LogoContainer>
      <Title>Bureau Capturia</Title>
      <Subtitle>Votre bureau virtuel d'equipe</Subtitle>
      <ProgressContainer>
        <ProgressTrack>
          <ProgressFill $progress={displayProgress} />
        </ProgressTrack>
        <StatusText>{STEPS[stepIndex]}</StatusText>
      </ProgressContainer>
      <Dots>
        {STEPS.slice(0, 3).map((_, i) => (
          <Dot key={i} $active={stepIndex >= i} $delay={i * 0.2} />
        ))}
      </Dots>
      <Footer>capturia office</Footer>
    </Overlay>
  )
}
