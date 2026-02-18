import React, { useState, useEffect, useRef } from 'react'
import styled, { keyframes, css } from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import MinimizeIcon from '@mui/icons-material/Remove'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import { slideUp } from '../styles/animations'

// ─── Pomodoro Timer — Mode Travail profond ─────────────────────────────────

// Durees en secondes
const WORK_DURATION = 25 * 60 // 25 minutes
const SHORT_BREAK_DURATION = 5 * 60 // 5 minutes
const LONG_BREAK_DURATION = 15 * 60 // 15 minutes
const SESSIONS_PER_CYCLE = 4

type TimerPhase = 'idle' | 'work' | 'short_break' | 'long_break'

interface PhaseConfig {
  label: string
  color: string
  bgColor: string
  duration: number
}

const PHASE_CONFIG: Record<TimerPhase, PhaseConfig> = {
  idle: { label: 'Pret', color: '#9ca3af', bgColor: '#9ca3af22', duration: WORK_DURATION },
  work: { label: 'Travail', color: '#ef4444', bgColor: '#ef444418', duration: WORK_DURATION },
  short_break: { label: 'Pause courte', color: '#22c55e', bgColor: '#22c55e18', duration: SHORT_BREAK_DURATION },
  long_break: { label: 'Pause longue', color: '#3b82f6', bgColor: '#3b82f618', duration: LONG_BREAK_DURATION },
}

// ─── Animations ────────────────────────────────────────────────────────────

const gentlePulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
`

const fadeInMsg = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`

// ─── Styled Components ─────────────────────────────────────────────────────

const Wrapper = styled.div<{ $minimized: boolean }>`
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 55;
  animation: ${slideUp} 0.3s ease-out;
  ${({ $minimized }) => $minimized && css`
    bottom: 16px;
    left: 16px;
  `}
`

const Card = styled.div<{ $bgColor: string }>`
  background: #1a1e30f0;
  border: 1px solid #333;
  border-radius: 16px;
  padding: 16px;
  width: 220px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  color: #eee;
  backdrop-filter: blur(8px);
`

const MinimizedCard = styled.div<{ $color: string }>`
  background: #1a1e30f0;
  border: 1px solid ${({ $color }) => $color}44;
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  color: #eee;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ $color }) => $color};
  }
`

const MinimizedTime = styled.span<{ $color: string }>`
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $color }) => $color};
`

const MinimizedLabel = styled.span`
  font-size: 11px;
  color: #888;
`

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`

const Title = styled.div<{ $color: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  text-transform: uppercase;
  letter-spacing: 1px;
`

const SessionCounter = styled.div`
  font-size: 11px;
  color: #888;
`

const TimerDisplay = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 8px 0 16px;
  position: relative;
`

const CircularTimerSvg = styled.svg`
  width: 130px;
  height: 130px;
  transform: rotate(-90deg);
`

const CircleTrack = styled.circle`
  fill: none;
  stroke: #2a2f45;
  stroke-width: 6;
`

const CircleProgress = styled.circle<{ $color: string; $dashOffset: number }>`
  fill: none;
  stroke: ${({ $color }) => $color};
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 376.99;
  stroke-dashoffset: ${({ $dashOffset }) => $dashOffset};
  transition: stroke-dashoffset 1s linear;
`

const TimeText = styled.div<{ $color: string }>`
  position: absolute;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 28px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  letter-spacing: 1px;
`

const Controls = styled.div`
  display: flex;
  justify-content: center;
  gap: 4px;
`

const TransitionMessage = styled.div<{ $color: string }>`
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  padding: 6px 0;
  animation: ${fadeInMsg} 0.4s ease-out, ${gentlePulse} 2s ease-in-out infinite;
`

const IdlePrompt = styled.div`
  text-align: center;
  font-size: 13px;
  color: #888;
  padding: 20px 0;
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: #bbb;
  }
`

// ─── Component ─────────────────────────────────────────────────────────────

interface PomodoroTimerProps {
  visible: boolean
}

export default function PomodoroTimer({ visible }: PomodoroTimerProps): JSX.Element | null {
  const [phase, setPhase] = useState<TimerPhase>('idle')
  const [secondsLeft, setSecondsLeft] = useState(WORK_DURATION)
  const [isRunning, setIsRunning] = useState(false)
  const [session, setSession] = useState(1) // 1-based session dans le cycle
  const [transitionMsg, setTransitionMsg] = useState('')
  const [minimized, setMinimized] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Ref stable pour la logique de fin de phase (evite les closures obsoletes)
  const phaseRef = useRef(phase)
  const sessionRef = useRef(session)
  phaseRef.current = phase
  sessionRef.current = session

  // Nettoyer l'intervalle au demontage
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Gestion du tick chaque seconde — decremente seulement, pas de side effects
  useEffect(() => {
    if (isRunning && phase !== 'idle') {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => Math.max(0, prev - 1))
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, phase])

  // Quand le timer atteint zero, transiter vers la phase suivante
  useEffect(() => {
    if (secondsLeft !== 0 || phase === 'idle') return

    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    const currentPhase = phaseRef.current
    const currentSession = sessionRef.current

    if (currentPhase === 'work') {
      if (currentSession >= SESSIONS_PER_CYCLE) {
        setTransitionMsg('Bien joue! Pause longue meritee.')
        setPhase('long_break')
        setSecondsLeft(LONG_BREAK_DURATION)
        setSession(1)
      } else {
        setTransitionMsg('Prends une pause!')
        setPhase('short_break')
        setSecondsLeft(SHORT_BREAK_DURATION)
      }
    } else if (currentPhase === 'short_break' || currentPhase === 'long_break') {
      setTransitionMsg("C'est reparti!")
      setPhase('work')
      setSecondsLeft(WORK_DURATION)
      if (currentPhase === 'short_break') {
        setSession((s) => s + 1)
      }
    }

    setTimeout(() => setTransitionMsg(''), 4000)
  }, [secondsLeft, phase])

  const handleStart = () => {
    if (phase === 'idle') {
      setPhase('work')
      setSecondsLeft(WORK_DURATION)
      setSession(1)
      setTransitionMsg('')
    }
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setPhase('idle')
    setSecondsLeft(WORK_DURATION)
    setSession(1)
    setTransitionMsg('')
  }

  const handleSkip = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setSecondsLeft(0)
    // Le useEffect sur secondsLeft === 0 declenchera handlePhaseEnd
  }

  if (!visible) return null

  const config = PHASE_CONFIG[phase]
  const totalDuration = config.duration
  const circumference = 2 * Math.PI * 60 // rayon = 60
  const progress = phase === 'idle' ? 0 : 1 - secondsLeft / totalDuration
  const dashOffset = circumference * (1 - progress)

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Vue minimisee
  if (minimized) {
    return (
      <Wrapper $minimized={true}>
        <MinimizedCard $color={config.color} onClick={() => setMinimized(false)}>
          <MinimizedTime $color={config.color}>
            {phase === 'idle' ? '--:--' : formatTime(secondsLeft)}
          </MinimizedTime>
          <MinimizedLabel>
            {phase === 'idle' ? 'Pomodoro' : config.label} {phase !== 'idle' && `${session}/${SESSIONS_PER_CYCLE}`}
          </MinimizedLabel>
          <Tooltip title="Agrandir" arrow>
            <IconButton size="small" sx={{ color: '#888', padding: '2px' }}>
              <OpenInFullIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </MinimizedCard>
      </Wrapper>
    )
  }

  return (
    <Wrapper $minimized={false}>
      <Card $bgColor={config.bgColor}>
        <TitleRow>
          <Title $color={config.color}>{config.label}</Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SessionCounter>Session {session}/{SESSIONS_PER_CYCLE}</SessionCounter>
            <Tooltip title="Minimiser" arrow>
              <IconButton
                size="small"
                onClick={() => setMinimized(true)}
                sx={{ color: '#888', padding: '2px', marginLeft: '4px' }}
              >
                <MinimizeIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </div>
        </TitleRow>

        {phase === 'idle' ? (
          <IdlePrompt onClick={handleStart}>
            Demarrer un Pomodoro
          </IdlePrompt>
        ) : (
          <>
            <TimerDisplay>
              <CircularTimerSvg>
                <CircleTrack cx="65" cy="65" r="60" />
                <CircleProgress
                  cx="65"
                  cy="65"
                  r="60"
                  $color={config.color}
                  $dashOffset={dashOffset}
                />
              </CircularTimerSvg>
              <TimeText $color={config.color}>{formatTime(secondsLeft)}</TimeText>
            </TimerDisplay>

            {transitionMsg && (
              <TransitionMessage $color={config.color}>{transitionMsg}</TransitionMessage>
            )}

            <Controls>
              {isRunning ? (
                <Tooltip title="Pause" arrow>
                  <IconButton onClick={handlePause} sx={{ color: config.color }}>
                    <PauseIcon />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Reprendre" arrow>
                  <IconButton onClick={handleStart} sx={{ color: config.color }}>
                    <PlayArrowIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Passer" arrow>
                <IconButton onClick={handleSkip} sx={{ color: '#888' }}>
                  <SkipNextIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reinitialiser" arrow>
                <IconButton onClick={handleReset} sx={{ color: '#888' }}>
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>
            </Controls>
          </>
        )}
      </Card>
    </Wrapper>
  )
}
