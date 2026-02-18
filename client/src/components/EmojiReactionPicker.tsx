import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import { useAppSelector } from '../hooks'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

// 8 emojis rapides (hotkeys 1-8)
const REACTIONS = [
  { emoji: '\u{1F44D}', label: 'Pouce', key: '1' },
  { emoji: '\u{2764}\u{FE0F}', label: 'Coeur', key: '2' },
  { emoji: '\u{1F602}', label: 'Rire', key: '3' },
  { emoji: '\u{1F389}', label: 'Fete', key: '4' },
  { emoji: '\u{1F914}', label: 'Hmm', key: '5' },
  { emoji: '\u{1F44F}', label: 'Applaudir', key: '6' },
  { emoji: '\u{1F525}', label: 'Feu', key: '7' },
  { emoji: '\u2705', label: 'OK', key: '8' },
] as const

// ─── Styled Components ────────────────────────────────────────────────────

const Wrapper = styled.div`
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 4px;
`

const ToggleButton = styled(IconButton)<{ $open: boolean }>`
  && {
    background: ${({ $open }) => ($open ? '#14B8A6' : '#222639')};
    border: 1px solid #14b8a6;
    color: #fff;
    width: 40px;
    height: 40px;
    font-size: 20px;
    transition: background 0.2s;

    &:hover {
      background: #14b8a6;
    }
  }
`

const EmojiTray = styled.div<{ $visible: boolean }>`
  display: flex;
  gap: 2px;
  background: #222639;
  border: 1px solid #333;
  border-radius: 24px;
  padding: 4px 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: ${({ $visible }) => ($visible ? 'translateY(0)' : 'translateY(8px)')};
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  transition: opacity 0.2s, transform 0.2s;
`

const EmojiButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 22px;
  padding: 4px 6px;
  border-radius: 8px;
  transition: background 0.15s, transform 0.15s;
  line-height: 1;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.2);
  }

  &:active {
    transform: scale(0.95);
  }
`

const HotkeyHint = styled.span`
  position: absolute;
  bottom: -2px;
  right: 0;
  font-size: 9px;
  color: #666;
  font-family: monospace;
`

const EmojiWrap = styled.div`
  position: relative;
`

// ─── Composant ────────────────────────────────────────────────────────────

export default function EmojiReactionPicker(): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const chatFocused = useAppSelector((s) => s.chat.focused)
  const loggedIn = useAppSelector((s) => s.user.loggedIn)

  const sendReaction = useCallback(
    (emoji: string) => {
      try {
        const game = phaserGame.scene.keys.game as Game
        // Afficher localement sur mon joueur
        game.myPlayer.showEmoji(emoji)
        // Envoyer aux autres
        game.network.sendEmojiReaction(emoji)
      } catch {
        // Phaser pas encore pret
      }
    },
    []
  )

  // Hotkeys 1-8 quand le chat n'a pas le focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (chatFocused) return
      // Ignorer si un input/textarea a le focus
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const idx = parseInt(e.key, 10)
      if (idx >= 1 && idx <= 8) {
        sendReaction(REACTIONS[idx - 1].emoji)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [chatFocused, sendReaction])

  if (!loggedIn) return null

  return (
    <Wrapper>
      <EmojiTray $visible={open}>
        {REACTIONS.map((r) => (
          <Tooltip key={r.key} title={`${r.label} (${r.key})`} arrow placement="top">
            <EmojiWrap>
              <EmojiButton
                onClick={() => {
                  sendReaction(r.emoji)
                  setOpen(false)
                }}
              >
                {r.emoji}
              </EmojiButton>
              <HotkeyHint>{r.key}</HotkeyHint>
            </EmojiWrap>
          </Tooltip>
        ))}
      </EmojiTray>

      <Tooltip title={open ? 'Fermer' : 'Reactions (1-8)'} arrow placement="top">
        <ToggleButton $open={open} onClick={() => setOpen(!open)} size="small">
          {open ? '\u2716' : '\u{1F600}'}
        </ToggleButton>
      </Tooltip>
    </Wrapper>
  )
}
