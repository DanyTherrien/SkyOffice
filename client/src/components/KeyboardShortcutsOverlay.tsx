import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { fadeIn, scaleIn } from '../styles/animations'

// ─── 4C — Overlay raccourcis clavier ─────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 250;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  animation: ${fadeIn} 0.2s ease-out;
`

const Card = styled.div`
  background: #1a1e30;
  border-radius: 16px;
  padding: 32px;
  width: 520px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  color: #eee;
  box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6);
  position: relative;
  animation: ${scaleIn} 0.2s ease-out;
`

const Title = styled.h2`
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #fff;
  text-align: center;
`

const CategoryTitle = styled.h3`
  font-size: 14px;
  color: #14b8a6;
  margin: 16px 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid #14b8a633;
`

const ShortcutGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 24px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

const ShortcutRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
`

const ShortcutLabel = styled.span`
  font-size: 13px;
  color: #bbb;
`

const KeyBadge = styled.kbd`
  background: #2a2f4a;
  border: 1px solid #3a3f5a;
  border-radius: 5px;
  padding: 2px 8px;
  font-size: 12px;
  font-family: 'SFMono-Regular', 'Consolas', monospace;
  color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
`

const KeyGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`

const CloseButton = styled(IconButton)`
  position: absolute !important;
  top: 12px;
  right: 12px;
`

const Hint = styled.p`
  text-align: center;
  color: #666;
  font-size: 11px;
  margin: 16px 0 0 0;
`

interface ShortcutDef {
  label: string
  keys: string[]
}

const categories: { title: string; shortcuts: ShortcutDef[] }[] = [
  {
    title: 'Mouvement',
    shortcuts: [
      { label: 'Se deplacer', keys: ['W', 'A', 'S', 'D'] },
      { label: 'Se deplacer (alt)', keys: ['↑', '←', '↓', '→'] },
    ],
  },
  {
    title: 'Interaction',
    shortcuts: [
      { label: "S'asseoir / se lever", keys: ['E'] },
      { label: 'Utiliser objet', keys: ['R'] },
      { label: 'Reunion de zone', keys: ['M'] },
    ],
  },
  {
    title: 'Chat',
    shortcuts: [
      { label: 'Ouvrir le chat', keys: ['Entree'] },
      { label: 'Fermer le chat', keys: ['Echap'] },
    ],
  },
  {
    title: 'Camera',
    shortcuts: [
      { label: 'Zoomer', keys: ['+'] },
      { label: 'Dezoomer', keys: ['-'] },
      { label: 'Zoom (souris)', keys: ['Molette'] },
    ],
  },
  {
    title: 'Interface',
    shortcuts: [
      { label: 'Raccourcis clavier', keys: ['?'] },
    ],
  },
]

export default function KeyboardShortcutsOverlay(): JSX.Element | null {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ne pas ouvrir si on tape dans un input ou si le chat est focus
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return

      if (e.key === '?') {
        e.preventDefault()
        setVisible((v) => !v)
      }
      if (e.key === 'Escape' && visible) {
        setVisible(false)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [visible])

  if (!visible) return null

  return (
    <Overlay onClick={() => setVisible(false)}>
      <Card onClick={(e) => e.stopPropagation()}>
        <CloseButton size="small" onClick={() => setVisible(false)} sx={{ color: '#999' }}>
          <CloseIcon fontSize="small" />
        </CloseButton>
        <Title>Raccourcis clavier</Title>
        {categories.map((cat) => (
          <div key={cat.title}>
            <CategoryTitle>{cat.title}</CategoryTitle>
            <ShortcutGrid>
              {cat.shortcuts.map((sc) => (
                <ShortcutRow key={sc.label}>
                  <ShortcutLabel>{sc.label}</ShortcutLabel>
                  <KeyGroup>
                    {sc.keys.map((k, i) => (
                      <KeyBadge key={i}>{k}</KeyBadge>
                    ))}
                  </KeyGroup>
                </ShortcutRow>
              ))}
            </ShortcutGrid>
          </div>
        ))}
        <Hint>Appuyez sur ? pour fermer</Hint>
      </Card>
    </Overlay>
  )
}
