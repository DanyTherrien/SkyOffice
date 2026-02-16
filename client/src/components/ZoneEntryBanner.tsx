import React from 'react'
import styled, { keyframes } from 'styled-components'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

import { useAppSelector, useAppDispatch } from '../hooks'
import { setShowZoneEntryBanner } from '../stores/MeetingStore'
import { ZONE_NAMES } from '../constants'

const slideIn = keyframes`
  from { transform: translateY(-80px); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
`

const BannerWrapper = styled.div`
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  animation: ${slideIn} 0.3s ease-out;
`

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: #222639;
  border: 1px solid #14B8A6;
  border-radius: 12px;
  padding: 12px 16px;
  color: #eee;
  font-size: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
`

const KeyHint = styled.span`
  display: inline-block;
  background: #14B8A6;
  color: #fff;
  font-weight: bold;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  margin: 0 2px;
`

export default function ZoneEntryBanner() {
  const dispatch = useAppDispatch()
  const show = useAppSelector((state) => state.meeting.showZoneEntryBanner)
  const zoneName = useAppSelector((state) => state.meeting.bannerZoneName)

  if (!show || !zoneName) return null

  const displayName = ZONE_NAMES[zoneName] || zoneName

  return (
    <BannerWrapper>
      <BannerContent>
        <span>
          Vous etes dans <strong>{displayName}</strong>. Appuyez sur{' '}
          <KeyHint>M</KeyHint> pour rejoindre la reunion.
        </span>
        <IconButton
          onClick={() => dispatch(setShowZoneEntryBanner(false))}
          size="small"
          sx={{ color: '#999', padding: '4px' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </BannerContent>
    </BannerWrapper>
  )
}
