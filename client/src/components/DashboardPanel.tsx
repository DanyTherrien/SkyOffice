import React, { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'

import { useAppSelector, useAppDispatch } from '../hooks'
import { closeDashboard } from '../stores/DashboardStore'
import { ZONE_NAMES, ZONE_ORDER, ZONE_COLORS } from '../constants'
import { fadeIn } from '../styles/animations'
import { AFK_REASONS } from './AfkStatusPicker'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

// ─── Constantes locales ─────────────────────────────────────────────────────

const afkReasonMap = new Map<string, { icon: string; label: string }>(
  AFK_REASONS.map((r) => [r.key, { icon: r.icon, label: r.label }])
)

const salesStatusIcons: Record<string, { icon: string; label: string }> = {
  on_call: { icon: '\uD83D\uDCDE', label: 'En appel' },
  available: { icon: '\u2705', label: 'Disponible' },
  preparing: { icon: '\uD83D\uDCCB', label: 'En preparation' },
}

const ZONE_ICONS: Record<string, string> = {
  brainstorm: '\uD83D\uDCA1',
  meeting: '\uD83D\uDCCB',
  deep_work: '\uD83C\uDFAF',
  sales: '\uD83D\uDCB0',
  one_on_one: '\uD83E\uDD1D',
  afk: '\u2615',
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(10, 12, 24, 0.85);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  padding: 32px 16px;
  animation: ${fadeIn} 0.2s ease-out;
`

const Panel = styled.div`
  width: 100%;
  max-width: 960px;
  background: #1a1d30;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  color: #eee;
  padding: 28px 32px 24px;
  position: relative;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`

const Title = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
`

const OnlineBadge = styled.span`
  background: rgba(20, 184, 166, 0.15);
  color: #14b8a6;
  font-size: 13px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
`

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

// ─── Zone Grid ──────────────────────────────────────────────────────────────

const ZoneGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 28px;

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const ZoneCard = styled.div<{ $color: string }>`
  background: ${({ $color }) => $color}0a;
  border: 1px solid ${({ $color }) => $color}30;
  border-radius: 14px;
  padding: 14px 16px;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ $color }) => $color}60;
  }
`

const ZoneCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`

const ZoneCardTitle = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $color }) => $color};
`

const ZoneCount = styled.span`
  font-size: 12px;
  color: #666;
  font-weight: 400;
`

const PlayerChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
`

const PlayerDot = styled.div<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const PlayerChipName = styled.span`
  font-size: 12px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PlayerChipBadge = styled.span`
  font-size: 10px;
  color: #999;
  white-space: nowrap;
`

const EmptyZoneText = styled.div`
  font-size: 11px;
  color: #555;
  font-style: italic;
  padding: 2px 0;
`

// ─── Activity Feed ──────────────────────────────────────────────────────────

const FeedSection = styled.div`
  margin-bottom: 24px;
`

const FeedList = styled.div`
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.15);
  padding: 8px 0;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #3a3f5a;
    border-radius: 2px;
  }
`

const FeedItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 5px 14px;
  font-size: 12px;
  line-height: 1.5;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`

const FeedTime = styled.span`
  color: #555;
  font-size: 11px;
  font-family: monospace;
  flex-shrink: 0;
  width: 42px;
`

const FeedPlayerName = styled.span`
  color: #eee;
  font-weight: 600;
`

const FeedArrow = styled.span`
  color: #555;
`

const FeedZone = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
  font-weight: 500;
`

const FeedDetail = styled.span`
  color: #888;
  font-size: 11px;
`

const FeedEmptyText = styled.div`
  text-align: center;
  color: #555;
  font-size: 12px;
  font-style: italic;
  padding: 20px;
`

// ─── Quick Stats Bar ────────────────────────────────────────────────────────

const StatsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
`

const DistributionBar = styled.div`
  flex: 1;
  min-width: 200px;
`

const DistributionLabel = styled.div`
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
`

const BarTrack = styled.div`
  height: 10px;
  border-radius: 5px;
  background: #2a2d40;
  overflow: hidden;
  display: flex;
`

const BarSegment = styled.div<{ $color: string; $width: number }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  transition: width 0.3s ease;
  min-width: ${({ $width }) => ($width > 0 ? '2px' : '0')};
`

const StatItem = styled.div`
  text-align: center;
`

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #fff;
`

const StatLabel = styled.div`
  font-size: 11px;
  color: #666;
`

const DistributionLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #888;
`

const LegendDot = styled.div<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

// ─── Composant Principal ────────────────────────────────────────────────────

export default function DashboardPanel(): JSX.Element | null {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.dashboard.isOpen)
  const activityFeed = useAppSelector((state) => state.dashboard.activityFeed)
  const playerNameMap = useAppSelector((state) => state.user.playerNameMap)
  const playerZoneMap = useAppSelector((state) => state.user.playerZoneMap)
  const playerStatusMap = useAppSelector((state) => state.user.playerStatusMap)
  const playerAfkReasonMap = useAppSelector((state) => state.user.playerAfkReasonMap)
  const playerSalesStatusMap = useAppSelector((state) => state.user.playerSalesStatusMap)

  // Ticker pour mettre a jour les durees en temps reel
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [isOpen])

  // Fermer avec Echap
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch(closeDashboard())
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, dispatch])

  // Regrouper les joueurs par zone (y compris le joueur local)
  const playersByZone = useMemo(() => {
    const groups: Record<string, { id: string; name: string; status: string; zone: string; isSelf: boolean }[]> = {}
    for (const zone of ZONE_ORDER) {
      groups[zone] = []
    }

    // Autres joueurs
    playerNameMap.forEach((name, id) => {
      const zone = playerZoneMap.get(id) || 'brainstorm'
      const status = playerStatusMap.get(id) || 'available'
      if (!groups[zone]) groups[zone] = []
      groups[zone].push({ id, name, status, zone, isSelf: false })
    })

    // Joueur local
    try {
      const game = phaserGame.scene.keys.game as Game
      const myName = game?.myPlayer?.playerName?.text || 'Moi'
      const myZone = game?.myPlayer?.currentZone || 'brainstorm'
      if (!groups[myZone]) groups[myZone] = []
      groups[myZone].unshift({ id: '_self', name: myName, status: 'available', zone: myZone, isSelf: true })
    } catch {
      // Scene pas encore prete
    }

    return groups
  }, [playerNameMap, playerZoneMap, playerStatusMap, now])

  // Total en ligne
  const totalOnline = useMemo(() => {
    let count = 1 // self
    playerNameMap.forEach(() => count++)
    return count
  }, [playerNameMap])

  // Statistiques rapides
  const stats = useMemo(() => {
    // Distribution par zone
    const distribution: Record<string, number> = {}
    for (const zone of ZONE_ORDER) {
      distribution[zone] = (playersByZone[zone] || []).length
    }

    // Zone la plus active (celle qui a eu le plus d'entrees dans le feed)
    const zoneCounts: Record<string, number> = {}
    activityFeed.forEach((event) => {
      zoneCounts[event.zone] = (zoneCounts[event.zone] || 0) + 1
    })
    let mostActiveZone = ''
    let maxCount = 0
    for (const [zone, count] of Object.entries(zoneCounts)) {
      if (count > maxCount) {
        maxCount = count
        mostActiveZone = zone
      }
    }

    // Nombre moyen de personnes en deep work (simplement le nombre actuel pour v1)
    const deepWorkCount = distribution['deep_work'] || 0

    return { distribution, mostActiveZone, deepWorkCount }
  }, [playersByZone, activityFeed])

  if (!isOpen) return null

  // Afficher les 20 derniers evenements
  const visibleFeed = activityFeed.slice(0, 20)

  return (
    <Overlay onClick={() => dispatch(closeDashboard())}>
      <Panel onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <Header>
          <Title>
            Tableau de bord
            <OnlineBadge>{totalOnline} en ligne</OnlineBadge>
          </Title>
          <IconButton onClick={() => dispatch(closeDashboard())} sx={{ color: '#999' }}>
            <CloseIcon />
          </IconButton>
        </Header>

        {/* Section 1: Zone Cards */}
        <SectionTitle>Vue d'ensemble</SectionTitle>
        <ZoneGrid>
          {ZONE_ORDER.map((zone) => {
            const players = playersByZone[zone] || []
            const color = ZONE_COLORS[zone] || '#14b8a6'
            const icon = ZONE_ICONS[zone] || ''
            const countLabel = zone === 'one_on_one'
              ? `${players.length}/2`
              : `${players.length} personne${players.length !== 1 ? 's' : ''}`

            return (
              <ZoneCard key={zone} $color={color}>
                <ZoneCardHeader>
                  <ZoneCardTitle $color={color}>
                    {icon} {ZONE_NAMES[zone] || zone}
                  </ZoneCardTitle>
                  <ZoneCount>{countLabel}</ZoneCount>
                </ZoneCardHeader>
                {players.length === 0 ? (
                  <EmptyZoneText>Aucun joueur</EmptyZoneText>
                ) : (
                  players.map((player) => {
                    const statusColor = player.zone === 'deep_work'
                      ? '#8b5cf6'
                      : player.zone === 'afk'
                        ? '#6b7280'
                        : player.zone === 'meeting' || player.zone === 'one_on_one'
                          ? '#fb923c'
                          : '#4ade80'

                    // Badge contextuel
                    let badge = ''
                    if (player.zone === 'deep_work') {
                      badge = '\uD83D\uDD07 DND'
                    } else if (player.zone === 'afk' && !player.isSelf) {
                      const reasonKey = playerAfkReasonMap.get(player.id) || ''
                      const reason = afkReasonMap.get(reasonKey)
                      if (reason) badge = `${reason.icon} ${reason.label}`
                    } else if (player.zone === 'sales' && !player.isSelf) {
                      const ss = playerSalesStatusMap.get(player.id) || ''
                      const info = salesStatusIcons[ss]
                      if (info) badge = `${info.icon} ${info.label}`
                    }

                    return (
                      <PlayerChip key={player.id}>
                        <PlayerDot $color={statusColor} />
                        <PlayerChipName>
                          {player.name}
                          {player.isSelf && ' (vous)'}
                        </PlayerChipName>
                        {badge && <PlayerChipBadge>{badge}</PlayerChipBadge>}
                      </PlayerChip>
                    )
                  })
                )}
              </ZoneCard>
            )
          })}
        </ZoneGrid>

        {/* Section 2: Activity Feed */}
        <FeedSection>
          <SectionTitle>Fil d'activite</SectionTitle>
          <FeedList>
            {visibleFeed.length === 0 ? (
              <FeedEmptyText>Aucune activite recente</FeedEmptyText>
            ) : (
              visibleFeed.map((event) => {
                const time = new Date(event.timestamp)
                const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
                const zoneColor = ZONE_COLORS[event.zone] || '#14b8a6'
                const zoneName = ZONE_NAMES[event.zone] || event.zone

                // Detail contextuel
                let detail = ''
                if (event.details) {
                  if (event.zone === 'afk') {
                    const reason = afkReasonMap.get(event.details)
                    if (reason) detail = `(${reason.icon} ${reason.label})`
                  } else if (event.zone === 'sales') {
                    const info = salesStatusIcons[event.details]
                    if (info) detail = `(${info.icon} ${info.label})`
                  } else if (event.details === 'dnd') {
                    detail = '(\uD83D\uDD07 DND)'
                  }
                }

                return (
                  <FeedItem key={event.id}>
                    <FeedTime>{timeStr}</FeedTime>
                    <div>
                      <FeedPlayerName>{event.playerName}</FeedPlayerName>
                      <FeedArrow> {'\u2192'} </FeedArrow>
                      <FeedZone $color={zoneColor}>{zoneName}</FeedZone>
                      {detail && <FeedDetail> {detail}</FeedDetail>}
                    </div>
                  </FeedItem>
                )
              })
            )}
          </FeedList>
        </FeedSection>

        {/* Section 3: Quick Stats */}
        <SectionTitle>Statistiques</SectionTitle>
        <StatsBar>
          <DistributionBar>
            <DistributionLabel>Distribution par zone</DistributionLabel>
            <BarTrack>
              {ZONE_ORDER.map((zone) => {
                const count = stats.distribution[zone] || 0
                const pct = totalOnline > 0 ? (count / totalOnline) * 100 : 0
                return (
                  <Tooltip key={zone} title={`${ZONE_NAMES[zone]}: ${count}`} arrow>
                    <BarSegment $color={ZONE_COLORS[zone] || '#14b8a6'} $width={pct} />
                  </Tooltip>
                )
              })}
            </BarTrack>
            <DistributionLegend>
              {ZONE_ORDER.map((zone) => {
                const count = stats.distribution[zone] || 0
                if (count === 0) return null
                return (
                  <LegendItem key={zone}>
                    <LegendDot $color={ZONE_COLORS[zone] || '#14b8a6'} />
                    {ZONE_NAMES[zone]} ({count})
                  </LegendItem>
                )
              })}
            </DistributionLegend>
          </DistributionBar>

          <StatItem>
            <StatValue>
              {stats.mostActiveZone ? (ZONE_ICONS[stats.mostActiveZone] || '') : '--'}
            </StatValue>
            <StatLabel>
              {stats.mostActiveZone
                ? `Zone active: ${ZONE_NAMES[stats.mostActiveZone]}`
                : 'Zone la plus active'}
            </StatLabel>
          </StatItem>

          <StatItem>
            <StatValue>{stats.deepWorkCount}</StatValue>
            <StatLabel>En travail profond</StatLabel>
          </StatItem>
        </StatsBar>
      </Panel>
    </Overlay>
  )
}
