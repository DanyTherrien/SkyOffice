import React, { useState } from 'react'
import logo from '../images/logo.png'
import styled, { keyframes } from 'styled-components'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import GroupsIcon from '@mui/icons-material/Groups'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize'

import { CustomRoomTable } from './CustomRoomTable'
import { CreateRoomForm } from './CreateRoomForm'
import { useAppSelector } from '../hooks'

import phaserGame from '../PhaserGame'
import Bootstrap from '../scenes/Bootstrap'

/* ─── Animations ─────────────────────────────────────────────────────── */

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`

const gradientShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
`

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
`

/* ─── Styled Components ──────────────────────────────────────────────── */

const FullScreen = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  background: linear-gradient(135deg, #0f1221 0%, #1a1d30 40%, #222639 100%);
  background-size: 200% 200%;
  animation: ${gradientShift} 15s ease infinite;
  overflow: hidden;
`

const LeftPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  position: relative;

  @media (max-width: 900px) {
    display: none;
  }
`

const LogoImg = styled.img`
  height: 120px;
  border-radius: 16px;
  filter: drop-shadow(0 8px 32px rgba(20, 184, 166, 0.25));
  animation: ${float} 4s ease-in-out infinite;
  margin-bottom: 32px;
`

const BrandTitle = styled.h1`
  color: #eee;
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 12px;
  animation: ${fadeInUp} 0.8s ease-out 0.2s both;
`

const BrandSubtitle = styled.p`
  color: #999;
  font-size: 16px;
  margin: 0;
  animation: ${fadeInUp} 0.8s ease-out 0.4s both;
`

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 48px;
  animation: ${fadeInUp} 0.8s ease-out 0.6s both;
`

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ccc;
  font-size: 14px;

  svg {
    color: #14b8a6;
    font-size: 20px;
  }
`

const FloatingDot = styled.div<{
  $size: number
  $top: string
  $left: string
  $delay: number
  $color: string
}>`
  position: absolute;
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  opacity: 0.12;
  top: ${(p) => p.$top};
  left: ${(p) => p.$left};
  animation: ${float} ${(p) => 3 + p.$delay}s ease-in-out infinite;
  animation-delay: ${(p) => p.$delay}s;
`

const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;

  @media (max-width: 900px) {
    flex: unset;
    width: 100%;
  }
`

const Card = styled.div`
  background: rgba(34, 38, 57, 0.9);
  border: 1px solid #333;
  border-radius: 20px;
  padding: 40px 48px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  max-width: 480px;
  width: 100%;
  animation: ${fadeInUp} 0.6s ease-out;
`

const CardTitle = styled.h2`
  color: #eee;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  margin: 0 0 8px;
`

const CardSubtitle = styled.p`
  color: #888;
  font-size: 14px;
  text-align: center;
  margin: 0 0 32px;
`

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
`

const PrimaryButton = styled(Button)`
  && {
    background: linear-gradient(135deg, #14b8a6, #0d9488);
    color: white;
    font-size: 16px;
    font-weight: 600;
    padding: 14px 32px;
    border-radius: 12px;
    text-transform: none;
    width: 100%;
    transition: all 0.2s ease;

    &:hover {
      background: linear-gradient(135deg, #0d9488, #0f766e);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(20, 184, 166, 0.3);
    }

    &:active {
      transform: translateY(0);
    }
  }
`

const SecondaryButton = styled(Button)`
  && {
    border: 1px solid #444;
    color: #ccc;
    font-size: 14px;
    padding: 12px 24px;
    border-radius: 12px;
    text-transform: none;
    width: 100%;
    transition: all 0.2s ease;

    &:hover {
      border-color: #14b8a6;
      color: #14b8a6;
      background: rgba(20, 184, 166, 0.05);
    }
  }
`

const StatusBadge = styled.div<{ $connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${(p) => (p.$connected ? '#14b8a6' : '#f59e0b')};
  margin-top: 8px;
  animation: ${pulse} 2s ease-in-out infinite;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${(p) => (p.$connected ? '#14b8a6' : '#f59e0b')};
  }
`

const ProgressBarWrapper = styled.div`
  width: 100%;
  margin-top: 4px;
`

const ProgressBar = styled(LinearProgress)`
  && {
    border-radius: 2px;
    height: 3px;
    background: #333;

    .MuiLinearProgress-bar {
      background: linear-gradient(90deg, #14b8a6, #3b82f6);
    }
  }
`

const CustomRoomWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  justify-content: center;
`

const TitleWrapper = styled.div`
  display: grid;
  width: 100%;

  .back-button {
    grid-column: 1;
    grid-row: 1;
    justify-self: start;
    align-self: center;
  }

  h2 {
    grid-column: 1;
    grid-row: 1;
    justify-self: center;
    align-self: center;
  }
`

const Footer = styled.div`
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: #444;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
`

/* ─── Component ──────────────────────────────────────────────────────── */

export default function RoomSelectionDialog(): JSX.Element {
  const [showCustomRoom, setShowCustomRoom] = useState(false)
  const [showCreateRoomForm, setShowCreateRoomForm] = useState(false)
  const [showSnackbar, setShowSnackbar] = useState(false)
  const lobbyJoined = useAppSelector((state) => state.room.lobbyJoined)

  const handleConnect = () => {
    if (lobbyJoined) {
      const bootstrap = phaserGame.scene.keys.bootstrap as Bootstrap
      bootstrap.network
        .joinOrCreatePublic()
        .then(() => bootstrap.launchGame())
        .catch((error) => console.error(error))
    } else {
      setShowSnackbar(true)
    }
  }

  return (
    <>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
      >
        <Alert
          severity="error"
          variant="outlined"
          style={{ background: '#fdeded', color: '#7d4747' }}
        >
          Connexion au serveur en cours, veuillez reessayer !
        </Alert>
      </Snackbar>

      <FullScreen>
        {/* Panneau gauche: Branding */}
        <LeftPanel>
          <FloatingDot $size={80} $top="15%" $left="10%" $delay={0} $color="#14b8a6" />
          <FloatingDot $size={50} $top="65%" $left="75%" $delay={1} $color="#3b82f6" />
          <FloatingDot $size={35} $top="80%" $left="20%" $delay={2} $color="#8b5cf6" />
          <FloatingDot $size={60} $top="25%" $left="80%" $delay={0.5} $color="#f59e0b" />

          <LogoImg src={logo} alt="Capturia" />
          <BrandTitle>Bureau Capturia</BrandTitle>
          <BrandSubtitle>Votre bureau virtuel d'equipe</BrandSubtitle>

          <FeatureList>
            <FeatureItem>
              <GroupsIcon />
              <span>Reunions video par zone, automatiques</span>
            </FeatureItem>
            <FeatureItem>
              <MeetingRoomIcon />
              <span>4 zones dediees : Brainstorm, Reunion, Focus, Ventes</span>
            </FeatureItem>
            <FeatureItem>
              <DashboardCustomizeIcon />
              <span>Chat temps reel, emojis et partage d'ecran</span>
            </FeatureItem>
          </FeatureList>
        </LeftPanel>

        {/* Panneau droit: Actions */}
        <RightPanel>
          <Card>
            {showCreateRoomForm ? (
              <CustomRoomWrapper>
                <TitleWrapper>
                  <IconButton
                    className="back-button"
                    onClick={() => setShowCreateRoomForm(false)}
                  >
                    <ArrowBackIcon sx={{ color: '#999' }} />
                  </IconButton>
                  <CardTitle>Creer une salle</CardTitle>
                </TitleWrapper>
                <CreateRoomForm />
              </CustomRoomWrapper>
            ) : showCustomRoom ? (
              <CustomRoomWrapper>
                <TitleWrapper>
                  <IconButton
                    className="back-button"
                    onClick={() => setShowCustomRoom(false)}
                  >
                    <ArrowBackIcon sx={{ color: '#999' }} />
                  </IconButton>
                  <CardTitle>
                    Salles personnalisees
                    <Tooltip title="Mise a jour en temps reel !" placement="top">
                      <IconButton>
                        <HelpOutlineIcon sx={{ fontSize: 18, color: '#666' }} />
                      </IconButton>
                    </Tooltip>
                  </CardTitle>
                </TitleWrapper>
                <CustomRoomTable />
                <SecondaryButton onClick={() => setShowCreateRoomForm(true)}>
                  Creer une salle
                </SecondaryButton>
              </CustomRoomWrapper>
            ) : (
              <>
                <CardTitle>Bienvenue</CardTitle>
                <CardSubtitle>Rejoignez votre equipe dans le bureau virtuel</CardSubtitle>
                <Content>
                  <PrimaryButton onClick={handleConnect}>
                    Entrer dans le bureau
                  </PrimaryButton>
                  <SecondaryButton
                    onClick={() =>
                      lobbyJoined ? setShowCustomRoom(true) : setShowSnackbar(true)
                    }
                  >
                    Salles personnalisees
                  </SecondaryButton>

                  {!lobbyJoined ? (
                    <ProgressBarWrapper>
                      <StatusBadge $connected={false}>Connexion au serveur...</StatusBadge>
                      <ProgressBar color="secondary" />
                    </ProgressBarWrapper>
                  ) : (
                    <StatusBadge $connected={true}>Serveur connecte</StatusBadge>
                  )}
                </Content>
              </>
            )}
          </Card>
        </RightPanel>

        <Footer>capturia office</Footer>
      </FullScreen>
    </>
  )
}
