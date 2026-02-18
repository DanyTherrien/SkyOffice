import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { useAppSelector, useAppDispatch } from '../hooks'
import { closeAnalyticsPanel } from '../stores/AnalyticsStore'
import {
  getPlayerTotalTime,
  getPlayerZoneDistribution,
  getLongestSession,
  getTodayStats,
  getZoneDistribution,
} from '../stores/AnalyticsStore'
import { ZONE_NAMES, ZONE_ORDER, ZONE_COLORS } from '../constants'
import { slideInRight } from '../styles/animations'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return '< 1s'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`
  return `${seconds}s`
}

// ─── Styled Components ──────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  max-width: 90vw;
  background: #12152299;
  backdrop-filter: blur(12px);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
  z-index: 100;
  overflow-y: auto;
  padding: 20px;
  color: #eee;
  animation: ${slideInRight} 0.3s ease-out;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #3a3f5a;
    border-radius: 4px;
  }
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
  }
`

const Section = styled.div`
  margin-bottom: 24px;
`

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #14b8a6;
`

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
  color: #ccc;
`

const StatValue = styled.span`
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
`

const BarContainer = styled.div`
  width: 100%;
  height: 20px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex;
  margin: 6px 0;
`

const BarSegment = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${(p) => p.$width}%;
  background: ${(p) => p.$color};
  min-width: ${(p) => (p.$width > 0 ? '2px' : '0')};
  transition: width 0.3s ease;
`

const BarLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #999;
`

const LegendDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${(p) => p.$color};
`

const PlayerRow = styled.div`
  margin-bottom: 12px;
`

const PlayerName = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #ddd;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
`

const ZoneStatCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ZoneName = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${(p) => p.$color};
  font-weight: 500;
`

const ZoneStatValues = styled.div`
  text-align: right;
  font-size: 12px;
  color: #999;

  .value {
    color: #fff;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
`

const EmptyState = styled.div`
  text-align: center;
  color: #666;
  font-size: 13px;
  padding: 24px 0;
`

// ─── Composant principal ────────────────────────────────────────────────────

export default function AnalyticsPanel(): JSX.Element | null {
  const dispatch = useAppDispatch()
  const panelOpen = useAppSelector((state) => state.analytics.panelOpen)
  const analytics = useAppSelector((state) => state.analytics.playerAnalytics)
  const sessionId = useAppSelector((state) => state.user.sessionId)

  // Forcer le re-render chaque minute pour les temps en cours
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!panelOpen) return
    const interval = setInterval(() => setTick((t) => t + 1), 15000)
    return () => clearInterval(interval)
  }, [panelOpen])

  if (!panelOpen) return null

  const todayStats = getTodayStats(analytics)
  const hasData = Object.keys(todayStats).length > 0

  // ─── Mes statistiques personnelles ──────────────────────────────────────

  const myDistribution = getPlayerZoneDistribution(todayStats, sessionId)
  const myTotalTime = getPlayerTotalTime(todayStats, sessionId)
  const myLongestFocus = getLongestSession(todayStats, sessionId, 'deep_work')
  const myDistTotal = Object.values(myDistribution).reduce((a, b) => a + b, 0)

  // ─── Statistiques equipe ────────────────────────────────────────────────

  const teamPlayers = Object.values(todayStats)
    .sort((a, b) => getPlayerTotalTime(todayStats, b.playerId) - getPlayerTotalTime(todayStats, a.playerId))

  // ─── Statistiques par zone ──────────────────────────────────────────────

  const zoneDistAll = getZoneDistribution(todayStats)
  const totalPersonMs = Object.values(zoneDistAll).reduce((a, b) => a + b, 0)

  // Calculer le nombre moyen de visites et la duree moyenne par zone
  function getZoneVisitStats(zone: string) {
    let totalVisits = 0
    let totalDuration = 0
    Object.values(todayStats).forEach((player) => {
      player.zoneTimes
        .filter((e) => e.zone === zone)
        .forEach((e) => {
          totalVisits++
          const end = e.exitTime ?? Date.now()
          totalDuration += end - e.enterTime
        })
    })
    return {
      totalVisits,
      totalDuration,
      avgDuration: totalVisits > 0 ? totalDuration / totalVisits : 0,
    }
  }

  // Zone la plus populaire
  const mostPopularZone = Object.entries(zoneDistAll).sort((a, b) => b[1] - a[1])[0]

  return (
    <Overlay>
      <Header>
        <h2>Statistiques</h2>
        <IconButton onClick={() => dispatch(closeAnalyticsPanel())} size="small" sx={{ color: '#999' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Header>

      {!hasData ? (
        <EmptyState>Aucune donnee pour aujourd'hui. Les statistiques se rempliront au fur et a mesure.</EmptyState>
      ) : (
        <>
          {/* ── Mes stats ─────────────────────────────────────────────── */}
          <Section>
            <SectionTitle>Mes statistiques</SectionTitle>
            <StatRow>
              <span>Temps en ligne aujourd'hui</span>
              <StatValue>{formatDuration(myTotalTime)}</StatValue>
            </StatRow>
            <StatRow>
              <span>Plus longue session focus</span>
              <StatValue>{myLongestFocus > 0 ? formatDuration(myLongestFocus) : '--'}</StatValue>
            </StatRow>
            {myDistTotal > 0 && (
              <>
                <BarContainer>
                  {ZONE_ORDER.map((zone) => {
                    const ms = myDistribution[zone] || 0
                    const pct = (ms / myDistTotal) * 100
                    return (
                      <BarSegment
                        key={zone}
                        $width={pct}
                        $color={ZONE_COLORS[zone] || '#555'}
                        title={`${ZONE_NAMES[zone] || zone}: ${formatDuration(ms)} (${Math.round(pct)}%)`}
                      />
                    )
                  })}
                </BarContainer>
                <BarLegend>
                  {ZONE_ORDER.map((zone) => {
                    const ms = myDistribution[zone] || 0
                    if (ms === 0) return null
                    const pct = Math.round((ms / myDistTotal) * 100)
                    return (
                      <LegendItem key={zone}>
                        <LegendDot $color={ZONE_COLORS[zone] || '#555'} />
                        {ZONE_NAMES[zone] || zone} {pct}%
                      </LegendItem>
                    )
                  })}
                </BarLegend>
              </>
            )}
          </Section>

          {/* ── Apercu equipe ─────────────────────────────────────────── */}
          <Section>
            <SectionTitle>Apercu de l'equipe</SectionTitle>
            {teamPlayers.map((player) => {
              const playerDist = getPlayerZoneDistribution(todayStats, player.playerId)
              const playerTotal = Object.values(playerDist).reduce((a, b) => a + b, 0)
              if (playerTotal === 0) return null
              const isMe = player.playerId === sessionId
              return (
                <PlayerRow key={player.playerId}>
                  <PlayerName>
                    <span>{player.playerName}{isMe ? ' (moi)' : ''}</span>
                    <StatValue>{formatDuration(playerTotal)}</StatValue>
                  </PlayerName>
                  <BarContainer>
                    {ZONE_ORDER.map((zone) => {
                      const ms = playerDist[zone] || 0
                      const pct = (ms / playerTotal) * 100
                      return (
                        <BarSegment
                          key={zone}
                          $width={pct}
                          $color={ZONE_COLORS[zone] || '#555'}
                          title={`${ZONE_NAMES[zone] || zone}: ${formatDuration(ms)}`}
                        />
                      )
                    })}
                  </BarContainer>
                </PlayerRow>
              )
            })}
          </Section>

          {/* ── Stats par zone ────────────────────────────────────────── */}
          <Section>
            <SectionTitle>Zones</SectionTitle>
            {mostPopularZone && (
              <StatRow>
                <span>Zone la plus populaire</span>
                <StatValue style={{ color: ZONE_COLORS[mostPopularZone[0]] || '#fff' }}>
                  {ZONE_NAMES[mostPopularZone[0]] || mostPopularZone[0]}
                </StatValue>
              </StatRow>
            )}
            <div style={{ marginTop: 8 }}>
              {ZONE_ORDER.map((zone) => {
                const stats = getZoneVisitStats(zone)
                if (stats.totalVisits === 0) return null
                const pctOfTotal = totalPersonMs > 0 ? Math.round((stats.totalDuration / totalPersonMs) * 100) : 0
                return (
                  <ZoneStatCard key={zone}>
                    <ZoneName $color={ZONE_COLORS[zone] || '#aaa'}>
                      <LegendDot $color={ZONE_COLORS[zone] || '#555'} />
                      {ZONE_NAMES[zone] || zone}
                    </ZoneName>
                    <ZoneStatValues>
                      <div><span className="value">{formatDuration(stats.totalDuration)}</span> total ({pctOfTotal}%)</div>
                      <div>{stats.totalVisits} visites, moy. <span className="value">{formatDuration(stats.avgDuration)}</span></div>
                    </ZoneStatValues>
                  </ZoneStatCard>
                )
              })}
            </div>
          </Section>
        </>
      )}
    </Overlay>
  )
}
