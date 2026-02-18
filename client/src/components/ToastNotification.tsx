import React, { useEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import { useAppSelector, useAppDispatch } from '../hooks'
import { removeToast, Toast } from '../stores/ToastStore'
import { slideInRight, slideOutRight } from '../styles/animations'

// ─── 4E — Enhanced Toast notifications ──────────────────────────────────────

const progressShrink = keyframes`
  from { width: 100%; }
  to { width: 0%; }
`

const Container = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
`

const ACCENT: Record<Toast['type'], string> = {
  info: '#14B8A6',
  success: '#22c55e',
  warning: '#f59e0b',
}

const ICON_MAP: Record<Toast['type'], React.ReactNode> = {
  info: <InfoOutlinedIcon sx={{ fontSize: 18 }} />,
  success: <CheckCircleOutlinedIcon sx={{ fontSize: 18 }} />,
  warning: <WarningAmberIcon sx={{ fontSize: 18 }} />,
}

const ToastItem = styled.div<{ $type: Toast['type']; $exiting: boolean; $offset: number }>`
  background: #1a1e30;
  border-left: 3px solid ${({ $type }) => ACCENT[$type]};
  border-radius: 10px;
  padding: 10px 16px 14px 16px;
  color: #eee;
  font-size: 13px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  max-width: 340px;
  min-width: 240px;
  position: relative;
  overflow: hidden;
  transform: translateY(${({ $offset }) => $offset * 4}px);
  animation: ${({ $exiting }) => ($exiting ? slideOutRight : slideInRight)} 0.3s ease forwards;
`

const ToastContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
`

const IconWrapper = styled.span<{ $type: Toast['type'] }>`
  color: ${({ $type }) => ACCENT[$type]};
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-top: 1px;
`

const ProgressBar = styled.div<{ $type: Toast['type']; $duration: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: ${({ $type }) => ACCENT[$type]};
  opacity: 0.6;
  animation: ${progressShrink} ${({ $duration }) => $duration}ms linear forwards;
`

// ─── Toast individuel avec auto-dismiss + progress bar ─────────────────────

const DISMISS_DURATION = 3500

function ToastEntry({ toast, offset }: { toast: Toast; offset: number }) {
  const dispatch = useAppDispatch()
  const [exiting, setExiting] = React.useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true)
      setTimeout(() => dispatch(removeToast(toast.id)), 300)
    }, DISMISS_DURATION)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.id, dispatch])

  return (
    <ToastItem $type={toast.type} $exiting={exiting} $offset={offset}>
      <ToastContent>
        <IconWrapper $type={toast.type}>{ICON_MAP[toast.type]}</IconWrapper>
        <span>{toast.message}</span>
      </ToastContent>
      <ProgressBar $type={toast.type} $duration={DISMISS_DURATION} />
    </ToastItem>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────

export default function ToastNotification(): JSX.Element | null {
  const toasts = useAppSelector((s) => s.toast.toasts)

  if (toasts.length === 0) return null

  return (
    <Container>
      {toasts.map((t, i) => (
        <ToastEntry key={t.id} toast={t} offset={i} />
      ))}
    </Container>
  )
}
