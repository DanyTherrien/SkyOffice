import React, { useState, useEffect, useRef, useCallback } from 'react'
import styled, { keyframes, css } from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import CloseIcon from '@mui/icons-material/Close'
import TimerIcon from '@mui/icons-material/Timer'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'

import { useAppSelector, useAppDispatch } from '../hooks'
import {
  setTimerDuration,
  resetTimer,
  setPanelOpen,
  setAgenda as setAgendaAction,
  setNotes as setNotesAction,
} from '../stores/MeetingToolsStore'
import { pushToast } from '../stores/ToastStore'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

// ─── Animations ────────────────────────────────────────────────────────────────

const flashAnim = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
`

// ─── Styled Components ─────────────────────────────────────────────────────────

const PanelOverlay = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  height: 100vh;
  background: #1a1d30;
  border-left: 1px solid #333;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
  z-index: 60;
  display: flex;
  flex-direction: column;
  color: #eee;
  transform: translateX(${({ $open }) => ($open ? '0' : '100%')});
  transition: transform 0.3s ease;
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #222639;
  border-bottom: 1px solid #333;
`

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
`

const PanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const SectionTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

// ─── Minuteur ──────────────────────────────────────────────────────────────────

const TimerDisplay = styled.div<{ $flashing: boolean }>`
  font-size: 48px;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: #fff;
  padding: 8px 0;
  ${({ $flashing }) =>
    $flashing &&
    css`
      animation: ${flashAnim} 0.6s ease-in-out infinite;
      color: #ef4444;
    `}
`

const TimerControls = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
`

const PresetRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
`

const PresetButton = styled(Button)<{ $selected?: boolean }>`
  && {
    min-width: 56px;
    padding: 4px 10px;
    font-size: 12px;
    color: ${({ $selected }) => ($selected ? '#fff' : '#aaa')};
    background: ${({ $selected }) => ($selected ? '#14B8A6' : '#2a2d42')};
    border: 1px solid ${({ $selected }) => ($selected ? '#14B8A6' : '#444')};
    text-transform: none;
    &:hover {
      background: ${({ $selected }) => ($selected ? '#0d9488' : '#333')};
    }
  }
`

const ControlButton = styled(IconButton)<{ $primary?: boolean; $danger?: boolean }>`
  && {
    color: #fff;
    background: ${({ $primary, $danger }) =>
      $danger ? '#d32f2f' : $primary ? '#14B8A6' : '#2a2d42'};
    &:hover {
      background: ${({ $primary, $danger }) =>
        $danger ? '#b71c1c' : $primary ? '#0d9488' : '#333'};
    }
  }
`

// ─── Notes / Agenda ────────────────────────────────────────────────────────────

const StyledTextField = styled(TextField)`
  && {
    .MuiInputBase-root {
      color: #eee;
      background: #222639;
      border-radius: 8px;
      font-size: 13px;
    }
    .MuiOutlinedInput-notchedOutline {
      border-color: #444;
    }
    .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline {
      border-color: #666;
    }
    .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline {
      border-color: #14B8A6;
    }
    .MuiInputLabel-root {
      color: #777;
    }
    .MuiInputLabel-root.Mui-focused {
      color: #14B8A6;
    }
  }
`

const ExportRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
`

const ExportButton = styled(Button)`
  && {
    color: #aaa;
    font-size: 11px;
    text-transform: none;
    padding: 2px 8px;
    &:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.06);
    }
  }
`

const StyledDivider = styled(Divider)`
  && {
    border-color: #333;
  }
`

// ─── Presets de duree ──────────────────────────────────────────────────────────

const TIMER_PRESETS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '30 min', seconds: 30 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
]

// ─── Helper: formater le temps en MM:SS ────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : ''
  const abs = Math.abs(totalSeconds)
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${sign}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function MeetingTools(): JSX.Element | null {
  const dispatch = useAppDispatch()
  const panelOpen = useAppSelector((s) => s.meetingTools.panelOpen)
  const timerRunning = useAppSelector((s) => s.meetingTools.timerRunning)
  const timerStartTime = useAppSelector((s) => s.meetingTools.timerStartTime)
  const timerDuration = useAppSelector((s) => s.meetingTools.timerDuration)
  const agenda = useAppSelector((s) => s.meetingTools.agenda)
  const notes = useAppSelector((s) => s.meetingTools.notes)
  const activeZone = useAppSelector((s) => s.meeting.activeZone)

  // Etat local pour l'affichage du minuteur (mis a jour chaque seconde)
  const [displaySeconds, setDisplaySeconds] = useState(0)
  const [timerFinished, setTimerFinished] = useState(false)

  // Etat local pour la duree custom (input)
  const [customMinutes, setCustomMinutes] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)

  // Debounce pour l'agenda et les notes
  const agendaTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // ─── Acces au Network via Phaser ─────────────────────────────────────────

  const getNetwork = useCallback(() => {
    const game = phaserGame.scene.keys.game as Game
    return game.network
  }, [])

  // ─── Tick du minuteur ────────────────────────────────────────────────────

  useEffect(() => {
    if (!timerRunning || !timerStartTime) {
      // Si le minuteur n'est pas en marche, afficher 0 ou la duree cible
      if (!timerRunning && timerDuration && !timerStartTime) {
        setDisplaySeconds(timerDuration)
      }
      return
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000)

      if (timerDuration !== null) {
        // Mode compte a rebours
        const remaining = timerDuration - elapsed
        setDisplaySeconds(remaining)
        if (remaining <= 0 && !timerFinished) {
          setTimerFinished(true)
        }
      } else {
        // Mode chronometre ascendant
        setDisplaySeconds(elapsed)
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [timerRunning, timerStartTime, timerDuration, timerFinished])

  // Reinitialiser le flash quand le minuteur repart
  useEffect(() => {
    if (timerRunning) {
      setTimerFinished(false)
    }
  }, [timerRunning])

  // ─── Handlers minuteur ──────────────────────────────────────────────────

  const handleSelectPreset = (seconds: number) => {
    setSelectedPreset(seconds)
    setCustomMinutes('')
    dispatch(setTimerDuration(seconds))
  }

  const handleCustomMinutes = (value: string) => {
    setCustomMinutes(value)
    setSelectedPreset(null)
    const mins = parseInt(value, 10)
    if (!isNaN(mins) && mins > 0) {
      dispatch(setTimerDuration(mins * 60))
    }
  }

  const handleStartTimer = () => {
    const network = getNetwork()
    network.startMeetingTimer(timerDuration ?? undefined)
  }

  const handleStopTimer = () => {
    const network = getNetwork()
    network.stopMeetingTimer()
  }

  const handleResetTimer = () => {
    // Arreter d'abord s'il tourne
    if (timerRunning) {
      const network = getNetwork()
      network.stopMeetingTimer()
    }
    dispatch(resetTimer())
    setDisplaySeconds(0)
    setTimerFinished(false)
    setSelectedPreset(null)
    setCustomMinutes('')
  }

  // ─── Handlers agenda ────────────────────────────────────────────────────

  const handleAgendaChange = (value: string) => {
    dispatch(setAgendaAction(value))
    if (agendaTimeoutRef.current) clearTimeout(agendaTimeoutRef.current)
    agendaTimeoutRef.current = setTimeout(() => {
      const network = getNetwork()
      network.updateMeetingAgenda(value)
    }, 500)
  }

  // ─── Handlers notes ─────────────────────────────────────────────────────

  const handleNotesChange = (value: string) => {
    dispatch(setNotesAction(value))
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current)
    notesTimeoutRef.current = setTimeout(() => {
      const network = getNetwork()
      network.updateMeetingNotes(value)
    }, 500)
  }

  const handleCopyNotes = async () => {
    try {
      await navigator.clipboard.writeText(notes)
      dispatch(pushToast({ message: 'Notes copiees dans le presse-papier', type: 'success' }))
    } catch {
      dispatch(pushToast({ message: 'Impossible de copier les notes', type: 'warning' }))
    }
  }

  const handleDownloadNotes = () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const filename = `notes-reunion-${dateStr}.txt`
    const content = `Ordre du jour\n${'='.repeat(40)}\n${agenda}\n\nNotes de reunion\n${'='.repeat(40)}\n${notes}`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    dispatch(pushToast({ message: `Notes exportees: ${filename}`, type: 'success' }))
  }

  // ─── Fermer le panneau ──────────────────────────────────────────────────

  const handleClose = () => {
    dispatch(setPanelOpen(false))
  }

  // Ne pas afficher si on n'est pas dans la zone meeting
  if (activeZone !== 'meeting') return null

  // ─── Calcul de l'affichage du minuteur ──────────────────────────────────

  const timerText = timerRunning || timerStartTime
    ? formatTime(displaySeconds)
    : timerDuration
      ? formatTime(timerDuration)
      : '00:00'

  const isCountdown = timerDuration !== null
  const isFlashing = timerFinished && isCountdown && timerRunning

  return (
    <PanelOverlay $open={panelOpen} onMouseDown={(e) => e.stopPropagation()}>
      {/* En-tete */}
      <PanelHeader>
        <PanelTitle>
          <TimerIcon fontSize="small" />
          Outils de reunion
        </PanelTitle>
        <IconButton onClick={handleClose} size="small" sx={{ color: '#999' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </PanelHeader>

      <PanelContent>
        {/* ─── Section Minuteur ──────────────────────────────────────────────── */}
        <div>
          <SectionTitle>Minuteur</SectionTitle>
          <TimerDisplay $flashing={isFlashing}>{timerText}</TimerDisplay>

          {/* Presets */}
          <PresetRow>
            {TIMER_PRESETS.map((p) => (
              <PresetButton
                key={p.seconds}
                $selected={selectedPreset === p.seconds}
                onClick={() => handleSelectPreset(p.seconds)}
                disabled={timerRunning}
                size="small"
              >
                {p.label}
              </PresetButton>
            ))}
            <StyledTextField
              size="small"
              placeholder="Min."
              type="number"
              value={customMinutes}
              onChange={(e) => handleCustomMinutes(e.target.value)}
              disabled={timerRunning}
              sx={{ width: 64 }}
              inputProps={{ min: 1, max: 999, style: { textAlign: 'center', padding: '4px 8px' } }}
            />
          </PresetRow>

          {/* Boutons de controle */}
          <TimerControls>
            {!timerRunning ? (
              <Tooltip title="Demarrer" arrow>
                <ControlButton $primary onClick={handleStartTimer} size="medium">
                  <PlayArrowIcon />
                </ControlButton>
              </Tooltip>
            ) : (
              <Tooltip title="Arreter" arrow>
                <ControlButton $danger onClick={handleStopTimer} size="medium">
                  <StopIcon />
                </ControlButton>
              </Tooltip>
            )}
            <Tooltip title="Reinitialiser" arrow>
              <ControlButton onClick={handleResetTimer} size="medium">
                <RestartAltIcon />
              </ControlButton>
            </Tooltip>
          </TimerControls>
        </div>

        <StyledDivider />

        {/* ─── Section Ordre du jour ─────────────────────────────────────────── */}
        <div>
          <SectionTitle>Ordre du jour</SectionTitle>
          <StyledTextField
            multiline
            minRows={3}
            maxRows={6}
            fullWidth
            placeholder="Points a discuter..."
            value={agenda}
            onChange={(e) => handleAgendaChange(e.target.value)}
          />
        </div>

        <StyledDivider />

        {/* ─── Section Notes ─────────────────────────────────────────────────── */}
        <div>
          <SectionTitle>Notes de reunion</SectionTitle>
          <StyledTextField
            multiline
            minRows={6}
            maxRows={14}
            fullWidth
            placeholder="Prendre des notes..."
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
          />
          <ExportRow>
            <ExportButton
              startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
              onClick={handleCopyNotes}
              disabled={!notes}
            >
              Copier
            </ExportButton>
            <ExportButton
              startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
              onClick={handleDownloadNotes}
              disabled={!notes && !agenda}
            >
              Exporter .txt
            </ExportButton>
          </ExportRow>
        </div>
      </PanelContent>
    </PanelOverlay>
  )
}
