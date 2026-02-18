import React, { useState } from 'react'
import styled, { keyframes } from 'styled-components'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'

import { AVATARS, AvatarStyle } from '../characters/avatarConfig'
import { useAppSelector, useAppDispatch } from '../hooks'
import { setLoggedIn } from '../stores/UserStore'

import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

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
  50%      { transform: translateY(-6px); }
`

const spriteSwitch = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
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
  animation: ${fadeInUp} 0.6s ease-out;

  @media (max-width: 800px) {
    display: none;
  }
`

const AvatarShowcase = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
`

const AvatarFrame = styled.div`
  width: 200px;
  height: 200px;
  border-radius: 24px;
  background: rgba(20, 184, 166, 0.08);
  border: 2px solid rgba(20, 184, 166, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${float} 3s ease-in-out infinite;
`

const SpritePreview = styled.div<{ $avatarName: string }>`
  width: 32px;
  height: 48px;
  background-image: url(${(p) => `assets/character/${p.$avatarName}.png`});
  background-position: -576px 0;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  transform: scale(4);
  animation: ${spriteSwitch} 0.3s ease-out;
`

const AvatarNav = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

const NavButton = styled(IconButton)`
  && {
    background: rgba(255, 255, 255, 0.06);
    color: #ccc;
    width: 40px;
    height: 40px;
    transition: all 0.2s;

    &:hover {
      background: rgba(20, 184, 166, 0.15);
      color: #14b8a6;
    }
  }
`

const AvatarName = styled.span`
  color: #14b8a6;
  font-size: 18px;
  font-weight: 600;
  min-width: 80px;
  text-align: center;
`

const AvatarDots = styled.div`
  display: flex;
  gap: 6px;
`

const AvatarDot = styled.div<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => (p.$active ? '#14b8a6' : '#444')};
  transition: background 0.2s;
`

const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;

  @media (max-width: 800px) {
    flex: unset;
    width: 100%;
  }
`

const Card = styled.form`
  background: rgba(34, 38, 57, 0.9);
  border: 1px solid #333;
  border-radius: 20px;
  padding: 40px 48px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  max-width: 420px;
  width: 100%;
  animation: ${fadeInUp} 0.6s ease-out 0.1s both;
`

const CardTitle = styled.h2`
  color: #eee;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  margin: 0 0 4px;
`

const CardSubtitle = styled.p`
  color: #888;
  font-size: 14px;
  text-align: center;
  margin: 0 0 32px;
`

const FormFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
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

const InfoAlert = styled(Alert)`
  && {
    margin-top: 16px;
    border-radius: 10px;
    font-size: 13px;
  }
`

/* Mobile-only: compact avatar selector shown inline */
const MobileAvatarSelector = styled.div`
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;

  @media (max-width: 800px) {
    display: flex;
  }
`

const MobileSpriteRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`

const MobileSprite = styled.div<{ $avatarName: string }>`
  width: 32px;
  height: 48px;
  background-image: url(${(p) => `assets/character/${p.$avatarName}.png`});
  background-position: -576px 0;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  transform: scale(2.5);
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

/* ─── Style Toggle ───────────────────────────────────────────────────── */

const StyleToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
`

const StyleButton = styled.button<{ $active: boolean }>`
  padding: 6px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(p) => (p.$active ? 'rgba(20, 184, 166, 0.2)' : 'transparent')};
  color: ${(p) => (p.$active ? '#14b8a6' : '#888')};

  &:hover {
    color: ${(p) => (p.$active ? '#14b8a6' : '#bbb')};
    background: ${(p) => (p.$active ? 'rgba(20, 184, 166, 0.2)' : 'rgba(255,255,255,0.04)')};
  }
`

/* ─── Roles pre-definis pour autocomplete ──────────────────────────── */

/* ─── Helpers ────────────────────────────────────────────────────────── */

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Pre-melanger chaque style separement
const shuffledNormal = shuffleArray(AVATARS.filter((a) => a.style === 'normal'))
const shuffledChibi = shuffleArray(AVATARS.filter((a) => a.style === 'chibi'))

/* ─── Component ──────────────────────────────────────────────────────── */

export default function LoginDialog(): JSX.Element {
  const [name, setName] = useState<string>('')
  const [role, setRole] = useState<string>('')
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('normal')
  const [avatarIndex, setAvatarIndex] = useState<number>(0)
  const [nameFieldEmpty, setNameFieldEmpty] = useState<boolean>(false)
  const dispatch = useAppDispatch()
  const roomJoined = useAppSelector((state) => state.room.roomJoined)
  const game = phaserGame.scene.keys.game as Game

  const avatarsForStyle = avatarStyle === 'normal' ? shuffledNormal : shuffledChibi
  const currentAvatar = avatarsForStyle[avatarIndex]

  const switchStyle = (style: AvatarStyle) => {
    if (style === avatarStyle) return
    setAvatarStyle(style)
    setAvatarIndex(0)
  }

  const prevAvatar = () => {
    setAvatarIndex((prev) => (prev === 0 ? avatarsForStyle.length - 1 : prev - 1))
  }

  const nextAvatar = () => {
    setAvatarIndex((prev) => (prev === avatarsForStyle.length - 1 ? 0 : prev + 1))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name === '') {
      setNameFieldEmpty(true)
    } else if (roomJoined) {
      game.registerKeys()
      game.myPlayer.setPlayerName(name)
      game.myPlayer.setPlayerTexture(currentAvatar.name)
      if (role) {
        game.myPlayer.setPlayerRole(role)
        game.network.updatePlayerRole(role)
      }
      game.network.readyToConnect()
      dispatch(setLoggedIn(true))
    }
  }

  const styleToggle = (
    <StyleToggle>
      <StyleButton $active={avatarStyle === 'normal'} onClick={() => switchStyle('normal')}>
        Classique
      </StyleButton>
      <StyleButton $active={avatarStyle === 'chibi'} onClick={() => switchStyle('chibi')}>
        Among Us
      </StyleButton>
    </StyleToggle>
  )

  return (
    <FullScreen>
      {/* Panneau gauche: Avatar showcase */}
      <LeftPanel>
        <AvatarShowcase>
          {styleToggle}

          <AvatarFrame>
            <SpritePreview key={currentAvatar.name} $avatarName={currentAvatar.name} />
          </AvatarFrame>

          <AvatarNav>
            <NavButton onClick={prevAvatar} size="small">
              <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
            </NavButton>
            <AvatarName>{currentAvatar.label}</AvatarName>
            <NavButton onClick={nextAvatar} size="small">
              <ArrowForwardIosIcon sx={{ fontSize: 16 }} />
            </NavButton>
          </AvatarNav>

          <AvatarDots>
            {avatarsForStyle.map((_, i) => (
              <AvatarDot key={i} $active={i === avatarIndex} />
            ))}
          </AvatarDots>
        </AvatarShowcase>
      </LeftPanel>

      {/* Panneau droit: Formulaire */}
      <RightPanel>
        <Card onSubmit={handleSubmit}>
          <CardTitle>Connexion</CardTitle>
          <CardSubtitle>Choisissez votre avatar et entrez votre nom</CardSubtitle>

          {/* Mobile-only avatar selector */}
          <MobileAvatarSelector>
            {styleToggle}
            <MobileSpriteRow>
              <NavButton onClick={prevAvatar} size="small">
                <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
              </NavButton>
              <MobileSprite $avatarName={currentAvatar.name} />
              <span style={{ color: '#14b8a6', fontSize: 14, fontWeight: 600 }}>
                {currentAvatar.label}
              </span>
              <NavButton onClick={nextAvatar} size="small">
                <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
              </NavButton>
            </MobileSpriteRow>
          </MobileAvatarSelector>

          <FormFields>
            <TextField
              autoFocus
              fullWidth
              label="Nom"
              variant="outlined"
              color="secondary"
              error={nameFieldEmpty}
              helperText={nameFieldEmpty && 'Le nom est requis'}
              onInput={(e) => {
                setName((e.target as HTMLInputElement).value)
                if (nameFieldEmpty) setNameFieldEmpty(false)
              }}
            />
            <TextField
              fullWidth
              label="Role (optionnel)"
              variant="outlined"
              color="secondary"
              placeholder="ex: Ventes, Dev, Direction"
              onInput={(e) => {
                setRole((e.target as HTMLInputElement).value)
              }}
            />
          </FormFields>

          <PrimaryButton type="submit">Entrer dans le bureau</PrimaryButton>

          <InfoAlert variant="outlined" severity="info">
            La webcam et le micro seront actives automatiquement en entrant dans une salle de
            reunion.
          </InfoAlert>
        </Card>
      </RightPanel>

      <Footer>capturia office</Footer>
    </FullScreen>
  )
}
