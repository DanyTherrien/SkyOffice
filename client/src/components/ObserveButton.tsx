import React from 'react'
import styled from 'styled-components'
import Tooltip from '@mui/material/Tooltip'
import { useAppSelector, useAppDispatch } from '../hooks'
import { startObserving, stopObserving } from '../stores/ObserveStore'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

const ObserveBtn = styled.button<{ $active: boolean }>`
  background: ${({ $active }) => ($active ? '#ef444422' : 'transparent')};
  border: 1px solid ${({ $active }) => ($active ? '#ef4444' : '#6366f166')};
  border-radius: 6px;
  color: ${({ $active }) => ($active ? '#ef4444' : '#818cf8')};
  font-size: 10px;
  padding: 2px 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    background: ${({ $active }) => ($active ? '#ef444433' : '#6366f122')};
    border-color: ${({ $active }) => ($active ? '#ef4444' : '#818cf8')};
  }
`

interface ObserveButtonProps {
  targetId: string
  targetName: string
}

export default function ObserveButton({ targetId, targetName }: ObserveButtonProps): JSX.Element | null {
  const dispatch = useAppDispatch()
  const isObserving = useAppSelector((state) => state.observe.isObserving)
  const observingTargetId = useAppSelector((state) => state.observe.observingTargetId)

  const isObservingThisPlayer = isObserving && observingTargetId === targetId

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const game = phaserGame.scene.keys.game as Game
    if (!game?.network) return

    if (isObservingThisPlayer) {
      // Arreter l'observation
      game.network.stopObserving()
      dispatch(stopObserving())
    } else {
      // Si on observe deja quelqu'un d'autre, arreter d'abord
      if (isObserving) {
        game.network.stopObserving()
      }
      // Commencer a observer cette personne
      game.network.startObserving(targetId)
      dispatch(startObserving({ targetId, targetName }))
    }
  }

  // Ne pas afficher le bouton si on observe deja quelqu'un d'autre
  if (isObserving && !isObservingThisPlayer) return null

  return (
    <Tooltip
      title={isObservingThisPlayer ? 'Arreter l\'observation' : `Observer ${targetName} (ecoute seule)`}
      arrow
    >
      <ObserveBtn $active={isObservingThisPlayer} onClick={handleClick}>
        {isObservingThisPlayer ? (
          <>&#x1F534; Arreter</>
        ) : (
          <>&#x1F441; Observer</>
        )}
      </ObserveBtn>
    </Tooltip>
  )
}
