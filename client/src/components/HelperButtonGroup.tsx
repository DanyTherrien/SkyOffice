import React, { useState } from 'react'
import styled from 'styled-components'
import Fab from '@mui/material/Fab'
import Badge from '@mui/material/Badge'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ShareIcon from '@mui/icons-material/Share'
import PeopleIcon from '@mui/icons-material/People'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import CloseIcon from '@mui/icons-material/Close'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import ArrowRightIcon from '@mui/icons-material/ArrowRight'
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset'
import VideogameAssetOffIcon from '@mui/icons-material/VideogameAssetOff'
import SettingsIcon from '@mui/icons-material/Settings'
import DashboardIcon from '@mui/icons-material/Dashboard'
import BarChartIcon from '@mui/icons-material/BarChart'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import VideocamIcon from '@mui/icons-material/Videocam'
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare'
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import CallEndIcon from '@mui/icons-material/CallEnd'

import { BackgroundMode } from '../../../types/BackgroundMode'
import { setShowJoystick, toggleBackgroundMode } from '../stores/UserStore'
import { openMediaSettings } from '../stores/MediaSettingsStore'
import { toggleDashboard } from '../stores/DashboardStore'
import { toggleAnalyticsPanel } from '../stores/AnalyticsStore'
import { toggleBadgePanel } from '../stores/BadgeStore'
import { useAppSelector, useAppDispatch } from '../hooks'
import { getAvatarString, getColorByString } from '../util'
import UserListPanel from './UserListPanel'
import { slideUp } from '../styles/animations'
import { liveKitService } from '../web/LiveKitService'

// ─── 4B — HelperButtonGroup transforme en toolbar dock ─────────────────────

const DockBar = styled.div`
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  background: #1a1e30ee;
  border-radius: 20px;
  padding: 6px 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  z-index: 20;
  animation: ${slideUp} 0.3s ease-out;
`

const Separator = styled.div`
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
`

const DockButton = styled(Fab)`
  && {
    width: 36px;
    height: 36px;
    min-height: 36px;
    background: transparent;
    box-shadow: none;
    color: #aaa;
    transition: all 0.15s;

    &:hover {
      color: #14b8a6;
      background: rgba(20, 184, 166, 0.1);
    }

    svg {
      font-size: 20px;
    }
  }
`

const ActiveDockButton = styled(DockButton)`
  && {
    color: #14b8a6;
    background: rgba(20, 184, 166, 0.15);
    box-shadow: 0 0 8px rgba(20, 184, 166, 0.3);
  }
`

const InfoPanel = styled.div`
  position: fixed;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%);
  background: #1a1e30ee;
  border-radius: 16px;
  padding: 16px 24px;
  color: #eee;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 280px;
  max-width: 460px;
  animation: ${slideUp} 0.2s ease-out;
  z-index: 19;

  .close {
    position: absolute;
    top: 8px;
    right: 8px;
  }

  .tip {
    margin-left: 12px;
    font-size: 13px;
    color: #999;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
  }

  ul {
    padding-left: 16px;
    margin: 8px 0;
    font-size: 13px;
    line-height: 1.8;
    color: #ccc;
  }
`

const RoomInfoName = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;

  h3 {
    margin: 0;
    font-size: 18px;
    color: #fff;
  }
`

const RoomInfoRow = styled.div`
  font-size: 13px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 0;
`

export default function HelperButtonGroup(): JSX.Element {
  const [showControlGuide, setShowControlGuide] = useState(false)
  const [showRoomInfo, setShowRoomInfo] = useState(false)
  const [showUserList, setShowUserList] = useState(false)
  const showJoystick = useAppSelector((state) => state.user.showJoystick)
  const backgroundMode = useAppSelector((state) => state.user.backgroundMode)
  const roomJoined = useAppSelector((state) => state.room.roomJoined)
  const roomId = useAppSelector((state) => state.room.roomId)
  const roomName = useAppSelector((state) => state.room.roomName)
  const roomDescription = useAppSelector((state) => state.room.roomDescription)
  const playerCount = useAppSelector((state) => state.user.playerNameMap.size) + 1
  const analyticsOpen = useAppSelector((state) => state.analytics.panelOpen)
  const badgePanelOpen = useAppSelector((state) => state.badge.showBadgePanel)
  const newBadgeId = useAppSelector((state) => state.badge.newBadgeId)
  const activeZone = useAppSelector((state) => state.meeting.activeZone)
  const micEnabled = useAppSelector((state) => state.meeting.micEnabled)
  const cameraEnabled = useAppSelector((state) => state.meeting.cameraEnabled)
  const myScreenStream = useAppSelector((state) => state.meeting.myScreenStream)
  const dispatch = useAppDispatch()

  const closeAll = () => {
    setShowControlGuide(false)
    setShowRoomInfo(false)
    setShowUserList(false)
  }

  const toggle = (panel: 'control' | 'room' | 'users') => {
    setShowControlGuide(panel === 'control' ? !showControlGuide : false)
    setShowRoomInfo(panel === 'room' ? !showRoomInfo : false)
    setShowUserList(panel === 'users' ? !showUserList : false)
  }

  return (
    <>
      {/* Panels au-dessus du dock */}
      {showRoomInfo && (
        <InfoPanel>
          <IconButton className="close" onClick={() => setShowRoomInfo(false)} size="small" sx={{ color: '#999' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
          <RoomInfoName>
            <Avatar style={{ background: getColorByString(roomName), width: 32, height: 32, fontSize: 14 }}>
              {getAvatarString(roomName)}
            </Avatar>
            <h3>{roomName}</h3>
          </RoomInfoName>
          <RoomInfoRow>
            <ArrowRightIcon sx={{ fontSize: 16 }} /> ID: {roomId}
          </RoomInfoRow>
          <RoomInfoRow>
            <ArrowRightIcon sx={{ fontSize: 16 }} /> {roomDescription}
          </RoomInfoRow>
          <p className="tip">
            <LightbulbIcon sx={{ fontSize: 16 }} />
            Lien partageable bientot disponible
          </p>
        </InfoPanel>
      )}
      {showControlGuide && (
        <InfoPanel>
          <IconButton className="close" onClick={() => setShowControlGuide(false)} size="small" sx={{ color: '#999' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 16, textAlign: 'center' }}>Controles</h3>
          <ul>
            <li><strong>W, A, S, D</strong> — se deplacer</li>
            <li><strong>E</strong> — s'asseoir / se lever</li>
            <li><strong>R</strong> — utiliser un objet</li>
            <li><strong>M</strong> — reunion de zone</li>
            <li><strong>Entree</strong> — ouvrir le chat</li>
            <li><strong>?</strong> — raccourcis clavier</li>
            <li><strong>Molette / + -</strong> — zoomer</li>
          </ul>
          <p className="tip">
            <LightbulbIcon sx={{ fontSize: 16 }} />
            Les zones de reunion activent l'appel video.
          </p>
        </InfoPanel>
      )}

      {/* Dock bar horizontal en bas-centre */}
      <DockBar>
        {roomJoined && (
          <>
            <Tooltip title="Utilisateurs en ligne" placement="top">
              {showUserList ? (
                <ActiveDockButton size="small" onClick={() => toggle('users')}>
                  <Badge badgeContent={playerCount} color="secondary" max={99}>
                    <PeopleIcon />
                  </Badge>
                </ActiveDockButton>
              ) : (
                <DockButton size="small" onClick={() => toggle('users')}>
                  <Badge badgeContent={playerCount} color="secondary" max={99}>
                    <PeopleIcon />
                  </Badge>
                </DockButton>
              )}
            </Tooltip>
            <Tooltip title="Info salle" placement="top">
              {showRoomInfo ? (
                <ActiveDockButton size="small" onClick={() => toggle('room')}>
                  <ShareIcon />
                </ActiveDockButton>
              ) : (
                <DockButton size="small" onClick={() => toggle('room')}>
                  <ShareIcon />
                </DockButton>
              )}
            </Tooltip>
            <Tooltip title="Guide des controles" placement="top">
              {showControlGuide ? (
                <ActiveDockButton size="small" onClick={() => toggle('control')}>
                  <HelpOutlineIcon />
                </ActiveDockButton>
              ) : (
                <DockButton size="small" onClick={() => toggle('control')}>
                  <HelpOutlineIcon />
                </DockButton>
              )}
            </Tooltip>
            <Tooltip title="Parametres media" placement="top">
              <DockButton
                size="small"
                onClick={() => {
                  dispatch(openMediaSettings())
                  closeAll()
                }}
              >
                <SettingsIcon />
              </DockButton>
            </Tooltip>
            <Tooltip title="Tableau de bord" placement="top">
              <DockButton
                size="small"
                onClick={() => {
                  dispatch(toggleDashboard())
                  closeAll()
                }}
              >
                <DashboardIcon />
              </DockButton>
            </Tooltip>
            <Tooltip title="Statistiques" placement="top">
              {analyticsOpen ? (
                <ActiveDockButton
                  size="small"
                  onClick={() => {
                    dispatch(toggleAnalyticsPanel())
                    closeAll()
                  }}
                >
                  <BarChartIcon />
                </ActiveDockButton>
              ) : (
                <DockButton
                  size="small"
                  onClick={() => {
                    dispatch(toggleAnalyticsPanel())
                    closeAll()
                  }}
                >
                  <BarChartIcon />
                </DockButton>
              )}
            </Tooltip>
            <Tooltip title="Badges" placement="top">
              {badgePanelOpen ? (
                <ActiveDockButton
                  size="small"
                  onClick={() => {
                    dispatch(toggleBadgePanel())
                    closeAll()
                  }}
                >
                  <Badge variant={newBadgeId ? 'dot' : 'standard'} color="warning" invisible={!newBadgeId}>
                    <EmojiEventsIcon />
                  </Badge>
                </ActiveDockButton>
              ) : (
                <DockButton
                  size="small"
                  onClick={() => {
                    dispatch(toggleBadgePanel())
                    closeAll()
                  }}
                >
                  <Badge variant={newBadgeId ? 'dot' : 'standard'} color="warning" invisible={!newBadgeId}>
                    <EmojiEventsIcon />
                  </Badge>
                </DockButton>
              )}
            </Tooltip>
            {/* ─── Controles d'appel (visibles uniquement en reunion) ─── */}
            {activeZone && (
              <>
                <Separator />
                <Tooltip title={micEnabled ? 'Couper le micro' : 'Activer le micro'} placement="top">
                  {micEnabled ? (
                    <ActiveDockButton size="small" onClick={() => liveKitService.toggleMicrophone()}>
                      <MicIcon />
                    </ActiveDockButton>
                  ) : (
                    <DockButton size="small" onClick={() => liveKitService.toggleMicrophone()}>
                      <MicOffIcon />
                    </DockButton>
                  )}
                </Tooltip>
                <Tooltip title={cameraEnabled ? 'Desactiver la camera' : 'Activer la camera'} placement="top">
                  {cameraEnabled ? (
                    <ActiveDockButton size="small" onClick={() => liveKitService.toggleCamera()}>
                      <VideocamIcon />
                    </ActiveDockButton>
                  ) : (
                    <DockButton size="small" onClick={() => liveKitService.toggleCamera()}>
                      <VideocamOffIcon />
                    </DockButton>
                  )}
                </Tooltip>
                <Tooltip title={myScreenStream ? 'Arreter le partage' : 'Partager l\'ecran'} placement="top">
                  {myScreenStream ? (
                    <ActiveDockButton size="small" onClick={() => liveKitService.stopScreenShare()}>
                      <StopScreenShareIcon />
                    </ActiveDockButton>
                  ) : (
                    <DockButton size="small" onClick={() => liveKitService.startScreenShare()}>
                      <ScreenShareIcon />
                    </DockButton>
                  )}
                </Tooltip>
                <Tooltip title="Quitter l'appel" placement="top">
                  <DockButton
                    size="small"
                    onClick={() => liveKitService.disconnect()}
                    sx={{ '&&': { color: '#ef4444', '&:hover': { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' } } }}
                  >
                    <CallEndIcon />
                  </DockButton>
                </Tooltip>
              </>
            )}
            <Separator />
            <Tooltip title={showJoystick ? 'Desactiver le joystick' : 'Activer le joystick'} placement="top">
              <DockButton size="small" onClick={() => dispatch(setShowJoystick(!showJoystick))}>
                {showJoystick ? <VideogameAssetOffIcon /> : <VideogameAssetIcon />}
              </DockButton>
            </Tooltip>
          </>
        )}
        <Tooltip title="Changer le theme" placement="top">
          <DockButton size="small" onClick={() => dispatch(toggleBackgroundMode())}>
            {backgroundMode === BackgroundMode.DAY ? <DarkModeIcon /> : <LightModeIcon />}
          </DockButton>
        </Tooltip>
      </DockBar>

      {/* User list panel */}
      {showUserList && <UserListPanel onClose={() => setShowUserList(false)} />}
    </>
  )
}
