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

import { BackgroundMode } from '../../../types/BackgroundMode'
import { setShowJoystick, toggleBackgroundMode } from '../stores/UserStore'
import { useAppSelector, useAppDispatch } from '../hooks'
import { getAvatarString, getColorByString } from '../util'
import UserListPanel from './UserListPanel'

const Backdrop = styled.div`
  position: fixed;
  display: flex;
  gap: 10px;
  bottom: 16px;
  right: 16px;
  align-items: flex-end;

  .wrapper-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
`

const Wrapper = styled.div`
  position: relative;
  font-size: 16px;
  color: #eee;
  background: #222639;
  box-shadow: 0px 0px 5px #0000006f;
  border-radius: 16px;
  padding: 15px 35px 15px 15px;
  display: flex;
  flex-direction: column;
  align-items: center;

  .close {
    position: absolute;
    top: 15px;
    right: 15px;
  }

  .tip {
    margin-left: 12px;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`

const Title = styled.h3`
  font-size: 24px;
  color: #eee;
  text-align: center;
`

const RoomName = styled.div`
  margin: 10px 20px;
  max-width: 460px;
  max-height: 150px;
  overflow-wrap: anywhere;
  overflow-y: auto;
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;

  h3 {
    font-size: 24px;
    color: #eee;
  }
`

const RoomDescription = styled.div`
  margin: 0 20px;
  max-width: 460px;
  max-height: 150px;
  overflow-wrap: anywhere;
  overflow-y: auto;
  font-size: 16px;
  color: #c2c2c2;
  display: flex;
  justify-content: center;
`

const StyledFab = styled(Fab)<{ target?: string }>`
  &:hover {
    color: #1ea2df;
  }
`

export default function HelperButtonGroup() {
  const [showControlGuide, setShowControlGuide] = useState(false)
  const [showRoomInfo, setShowRoomInfo] = useState(false)
  const [showUserList, setShowUserList] = useState(false)
  const showJoystick = useAppSelector((state) => state.user.showJoystick)
  const backgroundMode = useAppSelector((state) => state.user.backgroundMode)
  const roomJoined = useAppSelector((state) => state.room.roomJoined)
  const roomId = useAppSelector((state) => state.room.roomId)
  const roomName = useAppSelector((state) => state.room.roomName)
  const roomDescription = useAppSelector((state) => state.room.roomDescription)
  // +1 pour inclure le joueur local
  const playerCount = useAppSelector((state) => state.user.playerNameMap.size) + 1
  const dispatch = useAppDispatch()

  return (
    <Backdrop>
      <div className="wrapper-group">
        {roomJoined && (
          <Tooltip title={showJoystick ? 'Désactiver le joystick virtuel' : 'Activer le joystick virtuel'}>
            <StyledFab size="small" onClick={() => dispatch(setShowJoystick(!showJoystick))}>
              {showJoystick ? <VideogameAssetOffIcon /> : <VideogameAssetIcon />}
            </StyledFab>
          </Tooltip>
        )}
        {showRoomInfo && (
          <Wrapper>
            <IconButton className="close" onClick={() => setShowRoomInfo(false)} size="small">
              <CloseIcon />
            </IconButton>
            <RoomName>
              <Avatar style={{ background: getColorByString(roomName) }}>
                {getAvatarString(roomName)}
              </Avatar>
              <h3>{roomName}</h3>
            </RoomName>
            <RoomDescription>
              <ArrowRightIcon /> ID: {roomId}
            </RoomDescription>
            <RoomDescription>
              <ArrowRightIcon /> Description: {roomDescription}
            </RoomDescription>
            <p className="tip">
              <LightbulbIcon />
              Lien partageable bientôt disponible
            </p>
          </Wrapper>
        )}
        {showControlGuide && (
          <Wrapper>
            <Title>Contrôles</Title>
            <IconButton className="close" onClick={() => setShowControlGuide(false)} size="small">
              <CloseIcon />
            </IconButton>
            <ul>
              <li>
                <strong>W, A, S, D ou flèches</strong> pour se déplacer
              </li>
              <li>
                <strong>E</strong> pour s'asseoir (face à une chaise)
              </li>
              <li>
                <strong>R</strong> pour utiliser un ordinateur ou tableau (face à l'item)
              </li>
              <li>
                <strong>Entrée</strong> pour ouvrir le clavardage
              </li>
              <li>
                <strong>ESC</strong> pour fermer le clavardage
              </li>
            </ul>
            <p className="tip">
              <LightbulbIcon />
              L'appel vidéo démarre automatiquement quand vous êtes proche d'un collègue
            </p>
          </Wrapper>
        )}
      </div>
      <ButtonGroup>
        {roomJoined && (
          <>
            <Tooltip title="Utilisateurs en ligne">
              <StyledFab
                size="small"
                onClick={() => {
                  setShowUserList(!showUserList)
                  setShowRoomInfo(false)
                  setShowControlGuide(false)
                }}
              >
                <Badge badgeContent={playerCount} color="secondary" max={99}>
                  <PeopleIcon />
                </Badge>
              </StyledFab>
            </Tooltip>
            <Tooltip title="Info salle">
              <StyledFab
                size="small"
                onClick={() => {
                  setShowRoomInfo(!showRoomInfo)
                  setShowControlGuide(false)
                  setShowUserList(false)
                }}
              >
                <ShareIcon />
              </StyledFab>
            </Tooltip>
            <Tooltip title="Guide des contrôles">
              <StyledFab
                size="small"
                onClick={() => {
                  setShowControlGuide(!showControlGuide)
                  setShowRoomInfo(false)
                  setShowUserList(false)
                }}
              >
                <HelpOutlineIcon />
              </StyledFab>
            </Tooltip>
          </>
        )}
        <Tooltip title="Changer le thème">
          <StyledFab size="small" onClick={() => dispatch(toggleBackgroundMode())}>
            {backgroundMode === BackgroundMode.DAY ? <DarkModeIcon /> : <LightModeIcon />}
          </StyledFab>
        </Tooltip>
      </ButtonGroup>
      {showUserList && <UserListPanel onClose={() => setShowUserList(false)} />}
    </Backdrop>
  )
}
