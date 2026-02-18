import React, { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import KeyboardIcon from '@mui/icons-material/Keyboard'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import GridViewIcon from '@mui/icons-material/GridView'
import { useAppSelector } from '../hooks'
import { ONBOARDING_DONE_KEY } from '../constants'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.3s ease-out;
`

const Card = styled.div`
  background: #222639;
  border-radius: 16px;
  padding: 32px 40px;
  max-width: 520px;
  width: 90%;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
  color: #eee;
  text-align: center;
  border: 1px solid #14B8A6;
`

const Title = styled.h2`
  font-size: 22px;
  margin: 0 0 8px;
  color: #14B8A6;
`

const Subtitle = styled.p`
  font-size: 14px;
  color: #aaa;
  margin: 0 0 24px;
`

const SlideIcon = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
`

const SlideContent = styled.div`
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const InstructionList = styled.ul`
  text-align: left;
  padding-left: 20px;
  margin: 0;
  line-height: 2;
  font-size: 14px;

  li strong {
    color: #14B8A6;
  }
`

const KeyBadge = styled.span`
  display: inline-block;
  background: #14B8A6;
  color: #fff;
  font-weight: bold;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  margin: 0 2px;
`

const DotRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  margin: 20px 0 16px;
`

const Dot = styled.div<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? '#14B8A6' : '#555')};
  transition: background 0.2s;
`

const ButtonRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`

const slides = [
  {
    icon: <KeyboardIcon sx={{ fontSize: 48, color: '#14B8A6' }} />,
    title: 'Bienvenue au bureau!',
    subtitle: 'Voici comment vous deplacer',
    content: (
      <InstructionList>
        <li>
          <KeyBadge>W</KeyBadge> <KeyBadge>A</KeyBadge> <KeyBadge>S</KeyBadge>{' '}
          <KeyBadge>D</KeyBadge> ou les <strong>fleches</strong> pour se deplacer
        </li>
        <li>
          <KeyBadge>E</KeyBadge> pour s'asseoir sur une chaise
        </li>
        <li>
          <KeyBadge>R</KeyBadge> pour utiliser un ordinateur ou tableau
        </li>
        <li>
          <KeyBadge>Entree</KeyBadge> pour ouvrir le clavardage
        </li>
        <li>
          <strong>Molette</strong> ou <KeyBadge>+</KeyBadge> <KeyBadge>-</KeyBadge> pour zoomer
        </li>
      </InstructionList>
    ),
  },
  {
    icon: <GridViewIcon sx={{ fontSize: 48, color: '#14B8A6' }} />,
    title: 'Les zones du bureau',
    subtitle: 'Chaque zone a un comportement different',
    content: (
      <InstructionList>
        <li>
          <strong>Remue-meninges</strong> — brainstorming avec tableau blanc
        </li>
        <li>
          <strong>Salle de reunion</strong> — appels video de groupe
        </li>
        <li>
          <strong>Travail profond</strong> — mode Ne pas deranger automatique
        </li>
        <li>
          <strong>Salle de ventes</strong> — collaboration ventes en equipe
        </li>
      </InstructionList>
    ),
  },
  {
    icon: <MeetingRoomIcon sx={{ fontSize: 48, color: '#14B8A6' }} />,
    title: 'Rejoindre une reunion',
    subtitle: 'Webcam et micro en un clic',
    content: (
      <InstructionList>
        <li>
          En entrant dans une zone de reunion, appuyez sur <KeyBadge>M</KeyBadge> pour joindre
        </li>
        <li>
          Une <strong>banniere</strong> apparait pour vous guider
        </li>
        <li>
          Vous pouvez couper votre <strong>micro</strong> et <strong>camera</strong> a tout moment
        </li>
        <li>
          Le <strong>Travail profond</strong> bloque les appels automatiquement
        </li>
      </InstructionList>
    ),
  },
]

export default function OnboardingOverlay(): JSX.Element | null {
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const loggedIn = useAppSelector((state) => state.user.loggedIn)

  // Verifier si l'onboarding a deja ete fait
  const [alreadyDone, setAlreadyDone] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_DONE_KEY) === 'true') {
        setAlreadyDone(true)
      }
    } catch { /* mode prive */ }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, 'true')
    } catch { /* mode prive */ }
  }

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1)
    } else {
      handleDismiss()
    }
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  // Ne pas afficher si deja fait, pas connecte, ou dismiss
  if (alreadyDone || !loggedIn || dismissed) return null

  const slide = slides[step]

  return (
    <Backdrop>
      <Card style={{ position: 'relative' }}>
        <IconButton
          onClick={handleDismiss}
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12, color: '#999' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <SlideContent>
          <SlideIcon>{slide.icon}</SlideIcon>
          <Title>{slide.title}</Title>
          <Subtitle>{slide.subtitle}</Subtitle>
          {slide.content}
        </SlideContent>

        <DotRow>
          {slides.map((_, i) => (
            <Dot key={i} $active={i === step} />
          ))}
        </DotRow>

        <ButtonRow>
          <Button
            variant="text"
            size="small"
            onClick={handlePrev}
            disabled={step === 0}
            sx={{ color: '#999', textTransform: 'none' }}
          >
            Precedent
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={handleDismiss}
            sx={{ color: '#999', textTransform: 'none' }}
          >
            Passer
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleNext}
            sx={{
              background: '#14B8A6',
              textTransform: 'none',
              '&:hover': { background: '#0d9488' },
            }}
          >
            {step < slides.length - 1 ? 'Suivant' : 'Commencer!'}
          </Button>
        </ButtonRow>
      </Card>
    </Backdrop>
  )
}
