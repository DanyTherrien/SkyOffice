import React from 'react'
import styled from 'styled-components'

import { useAppSelector } from './hooks'

import RoomSelectionDialog from './components/RoomSelectionDialog'
import LoginDialog from './components/LoginDialog'
import ComputerDialog from './components/ComputerDialog'
import WhiteboardDialog from './components/WhiteboardDialog'
import Chat from './components/Chat'
import HelperButtonGroup from './components/HelperButtonGroup'
import MobileVirtualJoystick from './components/MobileVirtualJoystick'
import ZoneMeetingOverlay from './components/ZoneMeetingOverlay'
import MediaSettingsDialog from './components/MediaSettingsDialog'
import MeetingPreviewDialog from './components/MeetingPreviewDialog'
import ZoneEntryBanner from './components/ZoneEntryBanner'
import LeaveMeetingConfirmDialog from './components/LeaveMeetingConfirmDialog'
import ZoneIndicatorBar from './components/ZoneIndicatorBar'
import Minimap from './components/Minimap'
import OnboardingOverlay from './components/OnboardingOverlay'
import ContextualTooltip from './components/ContextualTooltip'

const Backdrop = styled.div`
  position: absolute;
  height: 100%;
  width: 100%;
`

function App() {
  const loggedIn = useAppSelector((state) => state.user.loggedIn)
  const computerDialogOpen = useAppSelector((state) => state.computer.computerDialogOpen)
  const whiteboardDialogOpen = useAppSelector((state) => state.whiteboard.whiteboardDialogOpen)
  const roomJoined = useAppSelector((state) => state.room.roomJoined)

  let ui: JSX.Element
  if (loggedIn) {
    if (computerDialogOpen) {
      /* Render ComputerDialog if user is using a computer. */
      ui = <ComputerDialog />
    } else if (whiteboardDialogOpen) {
      /* Render WhiteboardDialog if user is using a whiteboard. */
      ui = <WhiteboardDialog />
    } else {
      ui = (
        <>
          <ZoneIndicatorBar />
          <Minimap />
          <Chat />
          <ZoneMeetingOverlay />
          <MeetingPreviewDialog />
          <ZoneEntryBanner />
          <LeaveMeetingConfirmDialog />
          <MobileVirtualJoystick />
          <ContextualTooltip />
        </>
      )
    }
  } else if (roomJoined) {
    /* Render LoginDialog if not logged in but selected a room. */
    ui = <LoginDialog />
  } else {
    /* Render RoomSelectionDialog if yet selected a room. */
    ui = <RoomSelectionDialog />
  }

  return (
    <Backdrop>
      {ui}
      {/* Render HelperButtonGroup if no dialogs are opened. */}
      {!computerDialogOpen && !whiteboardDialogOpen && <HelperButtonGroup />}
      <MediaSettingsDialog />
      <OnboardingOverlay />
    </Backdrop>
  )
}

export default App
