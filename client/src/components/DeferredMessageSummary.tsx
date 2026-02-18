import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Badge from '@mui/material/Badge'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import DoneAllIcon from '@mui/icons-material/DoneAll'

import { useAppSelector, useAppDispatch } from '../hooks'
import { clearDeferredMessages, DeferredMessage } from '../stores/DeferredMessageStore'
import { ZONE_NAMES } from '../constants'
import { scaleIn, fadeOut } from '../styles/animations'

// ─── Auto-dismiss apres 30 secondes ─────────────────────────────────────────
const AUTO_DISMISS_MS = 30000

// ─── Styled components ──────────────────────────────────────────────────────

const Overlay = styled.div<{ $exiting: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 250;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  animation: ${({ $exiting }) => ($exiting ? fadeOut : scaleIn)} 0.3s ease forwards;
  pointer-events: ${({ $exiting }) => ($exiting ? 'none' : 'auto')};
`

const SummaryPaper = styled(Paper)`
  max-width: 460px;
  width: 90%;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: #1a1e30 !important;
  border: 1px solid rgba(20, 184, 166, 0.3);
  border-radius: 12px !important;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: rgba(20, 184, 166, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`

const MessageList = styled(List)`
  overflow-y: auto;
  max-height: 50vh;
  padding: 0 !important;
`

const StyledListItem = styled(ListItem)`
  padding: 8px 20px !important;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`

const TypeIcon = styled.span<{ $type: DeferredMessage['type'] }>`
  display: flex;
  align-items: center;
  color: ${({ $type }) => {
    switch ($type) {
      case 'chat':
        return '#3b82f6'
      case 'zone_enter':
        return '#22c55e'
      case 'zone_leave':
        return '#f59e0b'
      case 'knock':
        return '#ec4899'
      default:
        return '#94a3b8'
    }
  }};
  margin-right: 12px;
  flex-shrink: 0;
`

const Timestamp = styled.span`
  color: #64748b;
  font-size: 11px;
  white-space: nowrap;
  margin-left: 8px;
`

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`

const GroupHeader = styled(Typography)`
  padding: 8px 20px 4px !important;
  color: #64748b !important;
  font-size: 11px !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DeferredMessage['type'], string> = {
  chat: 'Messages',
  zone_enter: 'Entrees de zone',
  zone_leave: 'Sorties de zone',
  knock: 'Notifications',
}

const TYPE_ICONS: Record<DeferredMessage['type'], React.ReactNode> = {
  chat: <ChatBubbleOutlineIcon sx={{ fontSize: 18 }} />,
  zone_enter: <LoginIcon sx={{ fontSize: 18 }} />,
  zone_leave: <LogoutIcon sx={{ fontSize: 18 }} />,
  knock: <NotificationsActiveIcon sx={{ fontSize: 18 }} />,
}

function formatTime(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
}

function formatMessageContent(msg: DeferredMessage): string {
  const zoneName = ZONE_NAMES[msg.zone] || msg.zone
  switch (msg.type) {
    case 'chat':
      return msg.content
    case 'zone_enter':
      return `${msg.content} (${zoneName})`
    case 'zone_leave':
      return `${msg.content} (${zoneName})`
    case 'knock':
      return msg.content
    default:
      return msg.content
  }
}

function groupByType(messages: DeferredMessage[]): Map<DeferredMessage['type'], DeferredMessage[]> {
  const groups = new Map<DeferredMessage['type'], DeferredMessage[]>()
  const order: DeferredMessage['type'][] = ['chat', 'zone_enter', 'zone_leave', 'knock']
  for (const type of order) {
    const filtered = messages.filter((m) => m.type === type)
    if (filtered.length > 0) {
      groups.set(type, filtered)
    }
  }
  return groups
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function DeferredMessageSummary(): JSX.Element | null {
  const dispatch = useAppDispatch()
  const messages = useAppSelector((s) => s.deferredMessage.messages)
  const isQueuing = useAppSelector((s) => s.deferredMessage.isQueuing)
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Visible quand on n'est plus en mode queuing ET qu'il y a des messages en attente
  const shouldShow = !isQueuing && messages.length > 0

  // Auto-dismiss apres 30 secondes
  useEffect(() => {
    if (!shouldShow) return
    timerRef.current = setTimeout(() => {
      handleDismiss()
    }, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [shouldShow]) // handleDismiss is stable (uses dispatch from redux)

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(() => {
      dispatch(clearDeferredMessages())
      setExiting(false)
    }, 300)
  }

  if (!shouldShow && !exiting) return null

  const grouped = groupByType(messages)

  return (
    <Overlay $exiting={exiting} onClick={handleDismiss}>
      <SummaryPaper elevation={8} onClick={(e) => e.stopPropagation()}>
        <Header>
          <Badge badgeContent={messages.length} color="primary" max={99}>
            <NotificationsActiveIcon sx={{ color: '#14B8A6' }} />
          </Badge>
          <Typography variant="subtitle1" sx={{ color: '#eee', fontWeight: 600 }}>
            Messages en attente
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', ml: 'auto' }}>
            {messages.length} notification{messages.length > 1 ? 's' : ''}
          </Typography>
        </Header>

        <MessageList>
          {Array.from(grouped.entries()).map(([type, msgs], groupIndex) => (
            <React.Fragment key={type}>
              {groupIndex > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />}
              <GroupHeader variant="overline">{TYPE_LABELS[type]} ({msgs.length})</GroupHeader>
              {msgs.map((msg) => (
                <StyledListItem key={msg.id} disableGutters>
                  <TypeIcon $type={msg.type}>{TYPE_ICONS[msg.type]}</TypeIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ color: '#eee', fontSize: 13 }}>
                        <strong>{msg.from}</strong>{' '}
                        {formatMessageContent(msg)}
                      </Typography>
                    }
                  />
                  <Timestamp>{formatTime(msg.timestamp)}</Timestamp>
                </StyledListItem>
              ))}
            </React.Fragment>
          ))}
        </MessageList>

        <Footer>
          <Button
            variant="contained"
            size="small"
            startIcon={<DoneAllIcon />}
            onClick={handleDismiss}
            sx={{
              background: '#14B8A6',
              '&:hover': { background: '#0d9488' },
              textTransform: 'none',
              borderRadius: '8px',
              fontSize: 13,
            }}
          >
            Tout marquer comme lu
          </Button>
        </Footer>
      </SummaryPaper>
    </Overlay>
  )
}
