import React, { useState } from 'react'
import styled from 'styled-components'
import Popover from '@mui/material/Popover'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import { useAppSelector, useAppDispatch } from '../hooks'
import { setMyStatus } from '../stores/UserStore'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

// ─── Presets de statut (style Slack) ─────────────────────────────────────────

export interface StatusPreset {
  key: string
  label: string
  emoji: string
  color: string
}

export const STATUS_PRESETS: StatusPreset[] = [
  { key: 'available', label: 'Disponible', emoji: '', color: '#4ade80' },
  { key: 'in_meeting', label: 'En reunion', emoji: '\uD83D\uDCC5', color: '#fb923c' },
  { key: 'focusing', label: 'Concentre', emoji: '\uD83C\uDFA7', color: '#3b82f6' },
  { key: 'on_call', label: 'En appel', emoji: '\uD83D\uDCDE', color: '#fb923c' },
  { key: 'brb', label: 'De retour bientot', emoji: '\u2615', color: '#eab308' },
  { key: 'sick', label: 'Malade', emoji: '\uD83E\uDD12', color: '#ef4444' },
  { key: 'remote', label: 'Teletravail', emoji: '\uD83C\uDFE0', color: '#14b8a6' },
  { key: 'custom', label: 'Personnalise...', emoji: '\u270F\uFE0F', color: '#6b7280' },
]

// Lookup rapide par cle
export const STATUS_PRESET_MAP = new Map(STATUS_PRESETS.map((p) => [p.key, p]))

// ─── Styles ─────────────────────────────────────────────────────────────────

const PickerContainer = styled.div`
  width: 260px;
  background: #222639;
  color: #eee;
  padding: 12px 0;
`

const PickerTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  padding: 0 16px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 4px;
`

const PresetRow = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.12s;
  background: ${({ $active }) => ($active ? 'rgba(20, 184, 166, 0.12)' : 'transparent')};

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`

const StatusDotSmall = styled.div<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const PresetEmoji = styled.span`
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
`

const PresetLabel = styled.span`
  font-size: 13px;
  flex: 1;
`

const CheckMark = styled.span`
  color: #14b8a6;
  font-size: 14px;
`

const DndSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 4px;
`

const DndLabel = styled.span`
  font-size: 13px;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 6px;
`

const CustomInputWrapper = styled.div`
  padding: 8px 16px;
`

// ─── Composant ──────────────────────────────────────────────────────────────

interface StatusPickerProps {
  anchorEl: HTMLElement | null
  onClose: () => void
}

export default function StatusPicker({ anchorEl, onClose }: StatusPickerProps): JSX.Element {
  const dispatch = useAppDispatch()
  const myPreset = useAppSelector((state) => state.user.myStatusPreset)
  const myCustom = useAppSelector((state) => state.user.myStatusCustom)
  const myDnd = useAppSelector((state) => state.user.myDnd)

  const [showCustomInput, setShowCustomInput] = useState(myPreset === 'custom')
  const [customText, setCustomText] = useState(myCustom)

  const open = Boolean(anchorEl)

  const sendStatus = (preset: string, custom: string, dnd: boolean) => {
    try {
      const game = phaserGame.scene.keys.game as Game
      game.network.updateStatus(preset, custom, dnd)
    } catch {
      // Scene pas encore prete — mettre a jour localement quand meme
      dispatch(setMyStatus({ preset, custom, dnd, autoSet: false }))
    }
  }

  const handlePresetClick = (preset: StatusPreset) => {
    if (preset.key === 'custom') {
      setShowCustomInput(true)
      return
    }
    setShowCustomInput(false)
    sendStatus(preset.key, '', myDnd)
    onClose()
  }

  const handleCustomSubmit = () => {
    if (!customText.trim()) return
    sendStatus('custom', customText.trim(), myDnd)
    onClose()
  }

  const handleDndToggle = () => {
    const newDnd = !myDnd
    sendStatus(myPreset, myCustom, newDnd)
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      PaperProps={{
        sx: {
          background: 'transparent',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        },
      }}
    >
      <PickerContainer>
        <PickerTitle>Mon statut</PickerTitle>
        {STATUS_PRESETS.map((preset) => (
          <PresetRow
            key={preset.key}
            $active={myPreset === preset.key}
            onClick={() => handlePresetClick(preset)}
          >
            <StatusDotSmall $color={preset.color} />
            {preset.emoji ? <PresetEmoji>{preset.emoji}</PresetEmoji> : <PresetEmoji />}
            <PresetLabel>{preset.label}</PresetLabel>
            {myPreset === preset.key && <CheckMark>&#10003;</CheckMark>}
          </PresetRow>
        ))}
        {showCustomInput && (
          <CustomInputWrapper>
            <TextField
              size="small"
              fullWidth
              placeholder="Votre statut personnalise..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomSubmit()
              }}
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#eee',
                  fontSize: 13,
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                  '&:hover fieldset': { borderColor: '#14b8a6' },
                  '&.Mui-focused fieldset': { borderColor: '#14b8a6' },
                },
              }}
            />
          </CustomInputWrapper>
        )}
        <DndSection>
          <DndLabel>
            <span style={{ fontSize: 14 }}>&#128263;</span>
            Ne pas deranger
          </DndLabel>
          <Switch
            checked={myDnd}
            onChange={handleDndToggle}
            size="small"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: '#ef4444' },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#ef4444' },
            }}
          />
        </DndSection>
      </PickerContainer>
    </Popover>
  )
}
