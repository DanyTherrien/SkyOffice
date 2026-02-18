import React, { useState } from 'react'
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
import EmojiReactionPicker from './components/EmojiReactionPicker'
import ToastNotification from './components/ToastNotification'
import LoadingScreen from './components/LoadingScreen'
import PlayerProfileCard from './components/PlayerProfileCard'
import ConnectionBanner from './components/ConnectionBanner'
import KeyboardShortcutsOverlay from './components/KeyboardShortcutsOverlay'
import DeferredMessageSummary from './components/DeferredMessageSummary'
import DeepWorkOverlay from './components/DeepWorkOverlay'
import PomodoroTimer from './components/PomodoroTimer'
import AfkStatusPicker from './components/AfkStatusPicker'
import SalesStatusIndicator from './components/SalesStatusIndicator'
import ErrorBoundary from './components/ErrorBoundary'
import ObserverIndicator from './components/ObserverIndicator'
import KnockNotification from './components/KnockNotification'
import BoothInviteNotification from './components/BoothInviteNotification'
import BrainstormBotPanel from './components/BrainstormBotPanel'
import StickyNotesBoard from './components/StickyNotesBoard'
import DashboardPanel from './components/DashboardPanel'
import AnalyticsPanel from './components/AnalyticsPanel'
import BadgePanel from './components/BadgePanel'

const Backdrop = styled.div`
  position: absolute;
  height: 100%;
  width: 100%;
`

function App(): JSX.Element {
  const loggedIn = useAppSelector((state) => state.user.loggedIn)
  const computerDialogOpen = useAppSelector((state) => state.computer.computerDialogOpen)
  const whiteboardDialogOpen = useAppSelector((state) => state.whiteboard.whiteboardDialogOpen)
  const roomJoined = useAppSelector((state) => state.room.roomJoined)
  const [pomodoroVisible, setPomodoroVisible] = useState(false)

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
          <EmojiReactionPicker />
          <AfkStatusPicker />
          <SalesStatusIndicator />
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
    <ErrorBoundary>
      <Backdrop>
        {ui}
        {/* Render HelperButtonGroup if no dialogs are opened. */}
        {!computerDialogOpen && !whiteboardDialogOpen && <HelperButtonGroup />}
        <MediaSettingsDialog />
        <OnboardingOverlay />
        <ToastNotification />
        <LoadingScreen />
        <PlayerProfileCard />
        <ConnectionBanner />
        <KeyboardShortcutsOverlay />
        <DeferredMessageSummary />
        <DeepWorkOverlay
          pomodoroVisible={pomodoroVisible}
          onTogglePomodoro={() => setPomodoroVisible((v) => !v)}
        />
        <PomodoroTimer visible={pomodoroVisible} />
        <ObserverIndicator />
        <KnockNotification />
        <BoothInviteNotification />
        <BrainstormBotPanel />
        <StickyNotesBoard />
        <DashboardPanel />
        <AnalyticsPanel />
        <BadgePanel />
      </Backdrop>
    </ErrorBoundary>
  )
}

export default App
