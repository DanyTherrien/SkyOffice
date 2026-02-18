import React from 'react'
import styled from 'styled-components'
import Tooltip from '@mui/material/Tooltip'
import { useAppSelector } from '../hooks'

const IndicatorWrapper = styled.div`
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: auto;
`

const Badge = styled.div`
  background: #1e1b4b;
  border: 1px solid #6366f144;
  border-radius: 20px;
  padding: 6px 14px;
  color: #c7d2fe;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  cursor: default;
  user-select: none;
`

const EyeIcon = styled.span`
  font-size: 14px;
  line-height: 1;
`

const TooltipContent = styled.div`
  font-size: 11px;
  line-height: 1.5;
`

export default function ObserverIndicator(): JSX.Element | null {
  const observers = useAppSelector((state) => state.observe.observers)

  if (observers.length === 0) return null

  const label =
    observers.length === 1
      ? '1 observateur'
      : `${observers.length} observateurs`

  const tooltipContent = (
    <TooltipContent>
      {observers.map((o) => (
        <div key={o.id}>{o.name}</div>
      ))}
    </TooltipContent>
  )

  return (
    <IndicatorWrapper>
      <Tooltip title={tooltipContent} arrow placement="bottom">
        <Badge>
          <EyeIcon>&#x1F441;</EyeIcon>
          {label}
        </Badge>
      </Tooltip>
    </IndicatorWrapper>
  )
}
