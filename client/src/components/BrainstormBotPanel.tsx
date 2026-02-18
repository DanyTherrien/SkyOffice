import React, { useState } from 'react'
import styled from 'styled-components'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import SendIcon from '@mui/icons-material/Send'
import { useAppSelector } from '../hooks'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import { slideUp } from '../styles/animations'

// ─── Bot IA Brainstorm — Panneau d'actions rapides ──────────────────────────

const QUICK_ACTIONS = [
  {
    label: 'Generer des idees',
    icon: '\uD83D\uDCA1',
    prompt: 'Genere des idees sur notre sujet actuel',
  },
  {
    label: "Devil's advocate",
    icon: '\uD83D\uDE08',
    prompt: "Joue le devil's advocate sur la derniere idee",
  },
  {
    label: 'Resumer',
    icon: '\uD83D\uDCCB',
    prompt: 'Resume les idees de cette session',
  },
  {
    label: 'Relancer',
    icon: '\uD83D\uDD04',
    prompt: 'Propose un angle completement different',
  },
]

const PanelCard = styled(Paper)`
  position: fixed;
  bottom: 80px;
  left: 16px;
  z-index: 60;
  padding: 14px 16px;
  background: #1a1e30ee !important;
  border-radius: 12px !important;
  color: #eee;
  width: 260px;
  animation: ${slideUp} 0.25s ease-out;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`

const BotAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
`

const BotInfo = styled.div`
  flex: 1;
`

const BotName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
`

const BotSubtitle = styled.div`
  font-size: 10px;
  color: #888;
`

const QuickActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
`

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const TypingIndicator = styled.div`
  font-size: 11px;
  color: #8b5cf6;
  padding: 4px 0;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
`

export default function BrainstormBotPanel(): JSX.Element | null {
  const [customPrompt, setCustomPrompt] = useState('')
  const botTyping = useAppSelector((state) => state.chat.botTyping)

  // Determiner la zone du joueur local via Phaser
  const game = phaserGame.scene.keys.game as Game
  const myZone = game?.myPlayer?.currentZone

  // Ne rendre le composant que si le joueur est dans la zone brainstorm
  if (myZone !== 'brainstorm') return null

  const sendPrompt = (prompt: string) => {
    if (!prompt.trim() || !game?.network) return
    game.network.sendAiBotRequest(prompt.trim())
  }

  const handleQuickAction = (prompt: string) => {
    sendPrompt(prompt)
  }

  const handleCustomSend = () => {
    if (!customPrompt.trim()) return
    sendPrompt(customPrompt.trim())
    setCustomPrompt('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCustomSend()
    }
  }

  return (
    <PanelCard elevation={4}>
      <Header>
        <BotAvatar>{'\uD83E\uDD16'}</BotAvatar>
        <BotInfo>
          <BotName>Crea</BotName>
          <BotSubtitle>Assistant creatif</BotSubtitle>
        </BotInfo>
      </Header>

      <QuickActions>
        {QUICK_ACTIONS.map(({ label, icon, prompt }) => (
          <Chip
            key={label}
            label={`${icon} ${label}`}
            onClick={() => handleQuickAction(prompt)}
            size="small"
            variant="outlined"
            disabled={botTyping}
            sx={{
              color: '#ccc',
              borderColor: '#444',
              fontSize: '11px',
              height: '26px',
              '&:hover': {
                backgroundColor: '#3b82f622',
                borderColor: '#3b82f6',
                color: '#fff',
              },
              '&.Mui-disabled': {
                color: '#666',
                borderColor: '#333',
              },
              transition: 'all 0.15s',
            }}
          />
        ))}
      </QuickActions>

      {botTyping && <TypingIndicator>Crea reflechit...</TypingIndicator>}

      <InputRow>
        <TextField
          size="small"
          placeholder="Demander a Crea..."
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={botTyping}
          fullWidth
          sx={{
            '& .MuiInputBase-root': {
              color: '#eee',
              fontSize: '12px',
              backgroundColor: '#111422',
              borderRadius: '8px',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#333',
            },
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3b82f6',
            },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3b82f6',
            },
          }}
        />
        <IconButton
          size="small"
          onClick={handleCustomSend}
          disabled={!customPrompt.trim() || botTyping}
          sx={{
            color: '#3b82f6',
            '&.Mui-disabled': { color: '#444' },
          }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </InputRow>
    </PanelCard>
  )
}
