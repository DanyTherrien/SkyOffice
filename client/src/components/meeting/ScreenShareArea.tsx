import React from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import GridViewIcon from '@mui/icons-material/GridView'

import { useAppSelector, useAppDispatch } from '../../hooks'
import { setFocusedScreen } from '../../stores/MeetingStore'
import Video from '../Video'

/** Zone d'affichage des partages d'ecran (grille ou focus) */

const AreaWrapper = styled.div`
  padding: 8px;
`

/** Grille de partages d'ecran (mode par defaut) */
const ScreenGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
`

/** Tuile individuelle de partage d'ecran */
const ScreenTile = styled.div`
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #14B8A6;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

/** Etiquette du nom en bas de la tuile */
const SharerLabel = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

/** Conteneur du mode focus — un ecran principal + miniatures */
const FocusedWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
`

/** Ecran principal en mode focus */
const FocusedScreen = styled.div`
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 16 / 9;
  cursor: pointer;
  border: 2px solid #14B8A6;

  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

/** Rangee de miniatures en mode focus */
const ThumbnailRow = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
`

/** Miniature d'un ecran en mode focus */
const Thumbnail = styled.div`
  position: relative;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
  width: 120px;
  min-width: 120px;
  aspect-ratio: 16 / 9;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #14B8A6;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

/** Barre d'en-tete de la zone de partage avec le bouton retour a la grille */
const ScreenShareHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;

  span {
    color: #999;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`

export default function ScreenShareArea(): JSX.Element | null {
  const dispatch = useAppDispatch()
  const myScreenStream = useAppSelector((state) => state.meeting.myScreenStream)
  const peerScreenStreams = useAppSelector((state) => state.meeting.peerScreenStreams)
  const focusedScreenId = useAppSelector((state) => state.meeting.focusedScreenId)

  // Construit la liste de tous les ecrans partages (le mien + ceux des pairs)
  const allScreens: Array<{ id: string; stream: MediaStream; label: string }> = []

  if (myScreenStream) {
    allScreens.push({ id: '__my_screen__', stream: myScreenStream, label: 'Votre ecran' })
  }

  peerScreenStreams.forEach(({ stream, playerName }, id) => {
    allScreens.push({ id, stream, label: playerName })
  })

  // Rien a afficher si aucun partage d'ecran
  if (allScreens.length === 0) return null

  /** Clic sur une tuile → focus cet ecran */
  const handleTileClick = (id: string) => {
    dispatch(setFocusedScreen(id))
  }

  /** Retour a la vue grille */
  const handleBackToGrid = () => {
    dispatch(setFocusedScreen(null))
  }

  // Trouve l'ecran en focus
  const focusedEntry = focusedScreenId
    ? allScreens.find((s) => s.id === focusedScreenId)
    : null

  // Si on a un ecran en focus et qu'il existe encore, afficher le mode focus
  if (focusedEntry) {
    const otherScreens = allScreens.filter((s) => s.id !== focusedScreenId)

    return (
      <AreaWrapper>
        <ScreenShareHeader>
          <span>Partage d'ecran</span>
          <Tooltip title="Retour a la grille" arrow>
            <IconButton onClick={handleBackToGrid} size="small" sx={{ color: '#999' }}>
              <GridViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ScreenShareHeader>

        <FocusedWrapper>
          {/* Ecran principal — clic pour revenir a la grille */}
          <FocusedScreen onClick={handleBackToGrid}>
            <Video srcObject={focusedEntry.stream} autoPlay />
            <SharerLabel>{focusedEntry.label}</SharerLabel>
          </FocusedScreen>

          {/* Miniatures des autres ecrans */}
          {otherScreens.length > 0 && (
            <ThumbnailRow>
              {otherScreens.map((screen) => (
                <Thumbnail key={screen.id} onClick={() => handleTileClick(screen.id)}>
                  <Video srcObject={screen.stream} autoPlay muted />
                  <SharerLabel>{screen.label}</SharerLabel>
                </Thumbnail>
              ))}
            </ThumbnailRow>
          )}
        </FocusedWrapper>
      </AreaWrapper>
    )
  }

  // Mode grille (par defaut)
  return (
    <AreaWrapper>
      <ScreenShareHeader>
        <span>Partage d'ecran</span>
      </ScreenShareHeader>

      <ScreenGrid>
        {allScreens.map((screen) => (
          <ScreenTile key={screen.id} onClick={() => handleTileClick(screen.id)}>
            <Video srcObject={screen.stream} autoPlay muted />
            <SharerLabel>{screen.label}</SharerLabel>
          </ScreenTile>
        ))}
      </ScreenGrid>
    </AreaWrapper>
  )
}
