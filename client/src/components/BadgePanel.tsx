import React, { useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import LinearProgress from '@mui/material/LinearProgress'

import { useAppSelector, useAppDispatch } from '../hooks'
import { setShowBadgePanel, clearNewBadge, Badge } from '../stores/BadgeStore'
import { fadeIn, slideUp } from '../styles/animations'

// ─── Animations ──────────────────────────────────────────────────────────────

const goldenGlow = keyframes`
  0%, 100% { box-shadow: 0 0 6px rgba(255, 215, 0, 0.3), inset 0 0 4px rgba(255, 215, 0, 0.1); }
  50% { box-shadow: 0 0 16px rgba(255, 215, 0, 0.6), inset 0 0 8px rgba(255, 215, 0, 0.2); }
`

const celebrationPulse = keyframes`
  0% { transform: scale(1); }
  25% { transform: scale(1.15); }
  50% { transform: scale(1); }
  75% { transform: scale(1.08); }
  100% { transform: scale(1); }
`

// ─── Styled Components ──────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.2s ease-out;
`

const Panel = styled.div`
  background: #1a1e30;
  border-radius: 16px;
  padding: 24px;
  width: 520px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: ${slideUp} 0.3s ease-out;
  color: #eee;

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
`

const SectionTitle = styled.h3`
  margin: 16px 0 12px;
  font-size: 14px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
`

const BadgeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
`

const BadgeCard = styled.div<{ $unlocked: boolean; $isNew: boolean }>`
  background: ${({ $unlocked }) =>
    $unlocked ? 'rgba(255, 215, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid
    ${({ $unlocked }) =>
      $unlocked ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
  transition: all 0.2s;

  ${({ $unlocked }) =>
    $unlocked &&
    `animation: ${goldenGlow} 3s ease-in-out infinite;`}

  ${({ $isNew }) =>
    $isNew &&
    `animation: ${celebrationPulse} 0.6s ease-in-out 2;`}

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ $unlocked }) =>
      $unlocked ? 'rgba(255, 215, 0, 0.5)' : 'rgba(255, 255, 255, 0.15)'};
  }
`

const BadgeIcon = styled.div<{ $unlocked: boolean }>`
  font-size: 32px;
  margin-bottom: 8px;
  filter: ${({ $unlocked }) => ($unlocked ? 'none' : 'grayscale(100%) opacity(0.4)')};
  transition: filter 0.3s;
`

const BadgeName = styled.div<{ $unlocked: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ $unlocked }) => ($unlocked ? '#ffd700' : '#777')};
  margin-bottom: 4px;
`

const BadgeDescription = styled.div`
  font-size: 11px;
  color: #888;
  margin-bottom: 8px;
  line-height: 1.3;
`

const UnlockDate = styled.div`
  font-size: 10px;
  color: #666;
  margin-top: 4px;
`

const ProgressWrapper = styled.div`
  margin-top: 6px;
`

const ProgressLabel = styled.div`
  font-size: 10px;
  color: #777;
  margin-bottom: 2px;
  text-align: right;
`

const StyledProgress = styled(LinearProgress)`
  && {
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.08);

    .MuiLinearProgress-bar {
      background: linear-gradient(90deg, #14b8a6, #3b82f6);
      border-radius: 2px;
    }
  }
`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(epoch: number): string {
  const d = new Date(epoch)
  return d.toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BadgePanel(): JSX.Element | null {
  const dispatch = useAppDispatch()
  const showBadgePanel = useAppSelector((state) => state.badge.showBadgePanel)
  const badges = useAppSelector((state) => state.badge.badges)
  const newBadgeId = useAppSelector((state) => state.badge.newBadgeId)

  // Effacer le badge "nouveau" apres 3 secondes
  useEffect(() => {
    if (newBadgeId) {
      const timer = setTimeout(() => {
        dispatch(clearNewBadge())
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [newBadgeId, dispatch])

  if (!showBadgePanel) return null

  const unlockedBadges = badges.filter((b) => b.unlockedAt !== null)
  const lockedBadges = badges.filter((b) => b.unlockedAt === null)

  const handleClose = () => {
    dispatch(setShowBadgePanel(false))
  }

  const renderBadge = (badge: Badge) => (
    <BadgeCard
      key={badge.id}
      $unlocked={badge.unlockedAt !== null}
      $isNew={badge.id === newBadgeId}
    >
      <BadgeIcon $unlocked={badge.unlockedAt !== null}>{badge.icon}</BadgeIcon>
      <BadgeName $unlocked={badge.unlockedAt !== null}>{badge.name}</BadgeName>
      <BadgeDescription>{badge.description}</BadgeDescription>
      {badge.unlockedAt ? (
        <UnlockDate>Debloque le {formatDate(badge.unlockedAt)}</UnlockDate>
      ) : (
        <ProgressWrapper>
          <ProgressLabel>
            {badge.current} / {badge.target}
          </ProgressLabel>
          <StyledProgress variant="determinate" value={badge.progress} />
        </ProgressWrapper>
      )}
    </BadgeCard>
  )

  return (
    <Overlay onClick={handleClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            Badges
          </Title>
          <IconButton onClick={handleClose} size="small" sx={{ color: '#999' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Header>

        <SectionTitle>
          Debloques ({unlockedBadges.length}/{badges.length})
        </SectionTitle>
        {unlockedBadges.length > 0 ? (
          <BadgeGrid>{unlockedBadges.map(renderBadge)}</BadgeGrid>
        ) : (
          <BadgeDescription style={{ textAlign: 'center', padding: '16px 0' }}>
            Aucun badge debloque pour le moment. Explorez le bureau !
          </BadgeDescription>
        )}

        {lockedBadges.length > 0 && (
          <>
            <SectionTitle>En cours</SectionTitle>
            <BadgeGrid>{lockedBadges.map(renderBadge)}</BadgeGrid>
          </>
        )}
      </Panel>
    </Overlay>
  )
}
