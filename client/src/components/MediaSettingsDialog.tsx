import React, { useState, useEffect, useRef, useCallback } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Slider from '@mui/material/Slider'
import Button from '@mui/material/Button'
import CloseIcon from '@mui/icons-material/Close'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'

import { useAppSelector, useAppDispatch } from '../hooks'
import {
  setSelectedCamera,
  setSelectedMicrophone,
  setSelectedSpeaker,
  setNoiseSuppression,
  setEchoCancellation,
  setAutoGainControl,
  setMirrorCamera,
  setSpeakerVolume,
  closeMediaSettings,
} from '../stores/MediaSettingsStore'
import {
  enumerateMediaDevices,
  buildMediaConstraints,
  isSpeakerSelectionSupported,
} from '../web/mediaDevices'
import { useAudioLevel } from '../hooks/useAudioLevel'
import {
  setSoundEnabled,
  setDesktopEnabled,
  setDesktopPermissionAsked,
} from '../stores/NotificationStore'
import { requestDesktopPermission } from '../web/notificationService'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import type { AudioPrefs } from '../scenes/AudioManager'

/* ─── Styled components ─── */

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
`

const DialogWrapper = styled.div`
  background: #222639;
  border-radius: 16px;
  padding: 24px;
  width: 420px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  color: #eee;

  /* Scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;
  }
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  h3 {
    margin: 0;
    font-size: 18px;
  }
`

const SectionTitle = styled.div`
  font-size: 12px;
  font-weight: bold;
  color: #14b8a6;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 20px;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #14b8a633;

  &:first-of-type {
    margin-top: 12px;
  }
`

const PreviewVideo = styled.video<{ $mirror: boolean }>`
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  background: #1a1d30;
  object-fit: cover;
  transform: ${({ $mirror }) => ($mirror ? 'scaleX(-1)' : 'none')};
  margin: 8px 0;
`

const LevelBarOuter = styled.div`
  height: 8px;
  border-radius: 4px;
  background: #1a1d30;
  position: relative;
  overflow: hidden;
  margin: 8px 0 4px;
`

const LevelBarInner = styled.div<{ $level: number }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${({ $level }) => $level}%;
  background: ${({ $level }) => ($level > 80 ? '#ef4444' : '#14B8A6')};
  border-radius: 4px;
  transition: width 50ms linear;
`

const SettingRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 4px;
`

const VolumeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
`

const HintText = styled.span`
  font-size: 11px;
  color: #999;
`

const NoSupportText = styled.div`
  font-size: 13px;
  color: #999;
  font-style: italic;
  margin-top: 4px;
`

/* ─── MUI sx overrides pour le theme sombre ─── */

const selectSx = {
  color: '#eee',
  fontSize: 14,
  '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#14B8A6' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#14B8A6' },
  '.MuiSvgIcon-root': { color: '#999' },
}

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#14B8A6' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#14B8A6',
  },
}

const menuItemSx = {
  fontSize: 14,
}

/* ─── Composant ─── */

/** Genere un son de test bref (bip 440 Hz, 300ms) */
function playTestTone(volume: number, speakerId: string) {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = 440
  gain.gain.value = volume * 0.3 // Garder le volume raisonnable

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  // Si setSinkId est disponible sur le contexte, on essaie
  if (speakerId && (ctx as any).setSinkId) {
    (ctx as any).setSinkId(speakerId).catch(() => {
      // setSinkId non supporte sur ce navigateur
    })
  }

  oscillator.start()
  oscillator.stop(ctx.currentTime + 0.3)
  oscillator.onended = () => ctx.close()
}

export default function MediaSettingsDialog(): JSX.Element | null {
  const dispatch = useAppDispatch()
  const settings = useAppSelector((s) => s.mediaSettings)
  const notifSettings = useAppSelector((s) => s.notification)
  const activeZone = useAppSelector((s) => s.meeting.activeZone)

  // Listes de peripheriques
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([])
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([])

  // Preferences audio d'ambiance
  const [audioPrefs, setAudioPrefs] = useState<AudioPrefs>({
    ambientEnabled: true,
    sfxEnabled: true,
    ambientVolume: 0.3,
    sfxVolume: 0.5,
  })

  // Stream de preview (separe du stream de reunion)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)

  // Niveau audio du micro
  const audioLevel = useAudioLevel(previewStream)

  // Ref pour eviter les startPreview en cascade
  const mountedRef = useRef(true)

  const getAudioManager = useCallback(() => {
    try {
      const game = phaserGame.scene.keys.game as Game
      return game.audioManager ?? null
    } catch {
      return null
    }
  }, [])

  // Charger les prefs audio a l'ouverture du dialog
  useEffect(() => {
    if (!settings.dialogOpen) return
    const am = getAudioManager()
    if (am) setAudioPrefs(am.getPrefs())
  }, [settings.dialogOpen, getAudioManager])

  const refreshDeviceList = useCallback(async () => {
    try {
      const devices = await enumerateMediaDevices()
      if (!mountedRef.current) return
      setCameras(devices.cameras)
      setMicrophones(devices.microphones)
      setSpeakers(devices.speakers)
    } catch (err) {
      console.warn('[MediaSettings] Erreur enumeration:', err)
    }
  }, [])

  const stopPreview = useCallback(() => {
    setPreviewStream((prev) => {
      if (prev) prev.getTracks().forEach((t) => t.stop())
      return null
    })
  }, [])

  const startPreview = useCallback(async () => {
    stopPreview()
    try {
      const constraints = buildMediaConstraints({
        cameraId: settings.selectedCameraId,
        microphoneId: settings.selectedMicrophoneId,
        noiseSuppression: settings.noiseSuppression,
        echoCancellation: settings.echoCancellation,
        autoGainControl: settings.autoGainControl,
      })
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      setPreviewStream(stream)
    } catch (err) {
      console.warn("[MediaSettings] Impossible d'obtenir le preview:", err)
    }
  }, [
    settings.selectedCameraId,
    settings.selectedMicrophoneId,
    settings.noiseSuppression,
    settings.echoCancellation,
    settings.autoGainControl,
    stopPreview,
  ])

  // Au montage: enumerer les devices + demarrer le preview
  useEffect(() => {
    mountedRef.current = true
    refreshDeviceList()
    startPreview()
    navigator.mediaDevices.addEventListener('devicechange', refreshDeviceList)
    return () => {
      mountedRef.current = false
      navigator.mediaDevices.removeEventListener('devicechange', refreshDeviceList)
    }
  }, []) // eslint-disable-line

  // Redemarrer le preview quand les settings de device/contraintes changent
  useEffect(() => {
    if (!settings.dialogOpen) return
    startPreview()
  }, [
    settings.selectedCameraId,
    settings.selectedMicrophoneId,
    settings.noiseSuppression,
    settings.echoCancellation,
    settings.autoGainControl,
  ]) // eslint-disable-line

  // Attacher le stream au video element
  useEffect(() => {
    if (previewVideoRef.current && previewStream) {
      previewVideoRef.current.srcObject = previewStream
    }
  }, [previewStream])

  /** Ferme le dialog et applique les settings a la reunion active */
  const handleClose = () => {
    stopPreview()
    dispatch(closeMediaSettings())

    // Appliquer au ZoneMeetingManager si en reunion
    if (activeZone && activeZone !== 'deep_work') {
      try {
        const game = phaserGame.scene.keys.game as Game
        game.network.zoneMeetingManager?.applyMediaSettings()
      } catch {
        // Ignore si Phaser n'est pas pret
      }
    }
  }

  if (!settings.dialogOpen) return null

  return (
    <Backdrop onClick={handleClose}>
      <DialogWrapper onClick={(e) => e.stopPropagation()}>
        {/* En-tete */}
        <Header>
          <h3>Parametres media</h3>
          <IconButton onClick={handleClose} size="small" sx={{ color: '#999' }}>
            <CloseIcon />
          </IconButton>
        </Header>

        {/* ─── Camera ─── */}
        <SectionTitle>Camera</SectionTitle>
        <SettingRow>
          <Select
            value={settings.selectedCameraId}
            onChange={(e: SelectChangeEvent) => dispatch(setSelectedCamera(e.target.value))}
            fullWidth
            size="small"
            displayEmpty
            sx={selectSx}
          >
            <MenuItem value="" sx={menuItemSx}>
              Defaut du systeme
            </MenuItem>
            {cameras.map((d) => (
              <MenuItem key={d.deviceId} value={d.deviceId} sx={menuItemSx}>
                {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
              </MenuItem>
            ))}
          </Select>
        </SettingRow>

        <PreviewVideo
          ref={previewVideoRef}
          autoPlay
          playsInline
          muted
          $mirror={settings.mirrorCamera}
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.mirrorCamera}
              onChange={(e) => dispatch(setMirrorCamera(e.target.checked))}
              size="small"
              sx={switchSx}
            />
          }
          label="Miroir (inverser horizontalement)"
          sx={{ color: '#ccc', '& .MuiFormControlLabel-label': { fontSize: 14 } }}
        />

        {/* ─── Microphone ─── */}
        <SectionTitle>Microphone</SectionTitle>
        <SettingRow>
          <Select
            value={settings.selectedMicrophoneId}
            onChange={(e: SelectChangeEvent) =>
              dispatch(setSelectedMicrophone(e.target.value))
            }
            fullWidth
            size="small"
            displayEmpty
            sx={selectSx}
          >
            <MenuItem value="" sx={menuItemSx}>
              Defaut du systeme
            </MenuItem>
            {microphones.map((d) => (
              <MenuItem key={d.deviceId} value={d.deviceId} sx={menuItemSx}>
                {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
              </MenuItem>
            ))}
          </Select>
        </SettingRow>

        <LevelBarOuter>
          <LevelBarInner $level={audioLevel} />
        </LevelBarOuter>
        <HintText>Niveau d'entree</HintText>

        <FormControlLabel
          control={
            <Switch
              checked={settings.noiseSuppression}
              onChange={(e) => dispatch(setNoiseSuppression(e.target.checked))}
              size="small"
              sx={switchSx}
            />
          }
          label="Suppression du bruit"
          sx={{ color: '#ccc', '& .MuiFormControlLabel-label': { fontSize: 14 }, mt: 1 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.echoCancellation}
              onChange={(e) => dispatch(setEchoCancellation(e.target.checked))}
              size="small"
              sx={switchSx}
            />
          }
          label="Annulation d'echo"
          sx={{ color: '#ccc', '& .MuiFormControlLabel-label': { fontSize: 14 } }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.autoGainControl}
              onChange={(e) => dispatch(setAutoGainControl(e.target.checked))}
              size="small"
              sx={switchSx}
            />
          }
          label="Controle automatique du gain"
          sx={{ color: '#ccc', '& .MuiFormControlLabel-label': { fontSize: 14 } }}
        />

        {/* ─── Haut-parleur ─── */}
        <SectionTitle>Haut-parleur</SectionTitle>
        {isSpeakerSelectionSupported() ? (
          <>
            <SettingRow>
              <Select
                value={settings.selectedSpeakerId}
                onChange={(e: SelectChangeEvent) =>
                  dispatch(setSelectedSpeaker(e.target.value))
                }
                fullWidth
                size="small"
                displayEmpty
                sx={selectSx}
              >
                <MenuItem value="" sx={menuItemSx}>
                  Defaut du systeme
                </MenuItem>
                {speakers.map((d) => (
                  <MenuItem key={d.deviceId} value={d.deviceId} sx={menuItemSx}>
                    {d.label || `Haut-parleur ${d.deviceId.slice(0, 8)}`}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>

            <VolumeRow>
              <VolumeUpIcon sx={{ color: '#999', fontSize: 20 }} />
              <Slider
                value={Math.round(settings.speakerVolume * 100)}
                onChange={(_, v) => dispatch(setSpeakerVolume((v as number) / 100))}
                min={0}
                max={100}
                sx={{ color: '#14B8A6', flex: 1 }}
                size="small"
              />
              <span style={{ fontSize: 13, minWidth: 36, textAlign: 'right' }}>
                {Math.round(settings.speakerVolume * 100)}%
              </span>
            </VolumeRow>

            <Button
              variant="outlined"
              size="small"
              onClick={() =>
                playTestTone(settings.speakerVolume, settings.selectedSpeakerId)
              }
              sx={{
                color: '#ccc',
                borderColor: '#555',
                textTransform: 'none',
                fontSize: 13,
                mt: 1,
                '&:hover': { borderColor: '#14B8A6', color: '#14B8A6' },
              }}
            >
              Tester le son
            </Button>
          </>
        ) : (
          <NoSupportText>
            La selection du haut-parleur n'est pas supportee par ce navigateur.
            Le volume peut etre ajuste via les controles de votre systeme.
          </NoSupportText>
        )}

        {/* ─── Notifications ─── */}
        <SectionTitle>Notifications</SectionTitle>
        <FormControlLabel
          control={
            <Switch
              checked={notifSettings.soundEnabled}
              onChange={(e) => dispatch(setSoundEnabled(e.target.checked))}
              size="small"
              sx={switchSx}
            />
          }
          label="Sons de notification"
          sx={{ color: '#ccc', '& .MuiFormControlLabel-label': { fontSize: 14 } }}
        />
        <HintText>Joue un son quand quelqu'un entre dans votre zone ou envoie un message</HintText>

        <FormControlLabel
          control={
            <Switch
              checked={notifSettings.desktopEnabled}
              onChange={async (e) => {
                if (e.target.checked) {
                  const granted = await requestDesktopPermission()
                  dispatch(setDesktopPermissionAsked(true))
                  dispatch(setDesktopEnabled(granted))
                } else {
                  dispatch(setDesktopEnabled(false))
                }
              }}
              size="small"
              sx={switchSx}
            />
          }
          label="Notifications de bureau"
          sx={{ color: '#ccc', '& .MuiFormControlLabel-label': { fontSize: 14 }, mt: 1 }}
        />
        <HintText>Recevez des alertes meme quand l'onglet est en arriere-plan</HintText>

        {/* ─── Audio d'ambiance ─── */}
        <SectionTitle>Audio d'ambiance</SectionTitle>
        <FormControlLabel
          control={
            <Switch
              checked={audioPrefs.ambientEnabled}
              onChange={(e) => {
                const v = e.target.checked
                setAudioPrefs((p) => ({ ...p, ambientEnabled: v }))
                getAudioManager()?.setAmbientEnabled(v)
              }}
              size="small"
              sx={switchSx}
            />
          }
          label="Musique d'ambiance par zone"
          sx={{ color: '#ccc', '& .MuiFormControlLabel-label': { fontSize: 14 } }}
        />
        <HintText>Boucle sonore qui change selon la zone (brainstorm, meeting, etc.)</HintText>

        <VolumeRow>
          <VolumeUpIcon sx={{ color: '#999', fontSize: 20 }} />
          <Slider
            value={Math.round(audioPrefs.ambientVolume * 100)}
            onChange={(_, v) => {
              const vol = (v as number) / 100
              setAudioPrefs((p) => ({ ...p, ambientVolume: vol }))
              getAudioManager()?.setAmbientVolume(vol)
            }}
            min={0}
            max={100}
            disabled={!audioPrefs.ambientEnabled}
            sx={{ color: '#14B8A6', flex: 1 }}
            size="small"
          />
          <span style={{ fontSize: 13, minWidth: 36, textAlign: 'right' }}>
            {Math.round(audioPrefs.ambientVolume * 100)}%
          </span>
        </VolumeRow>

        <FormControlLabel
          control={
            <Switch
              checked={audioPrefs.sfxEnabled}
              onChange={(e) => {
                const v = e.target.checked
                setAudioPrefs((p) => ({ ...p, sfxEnabled: v }))
                getAudioManager()?.setSfxEnabled(v)
              }}
              size="small"
              sx={switchSx}
            />
          }
          label="Effets sonores"
          sx={{ color: '#ccc', '& .MuiFormControlLabel-label': { fontSize: 14 }, mt: 1 }}
        />
        <HintText>Sons lors des changements de zone, messages chat, join/leave</HintText>

        <VolumeRow>
          <VolumeUpIcon sx={{ color: '#999', fontSize: 20 }} />
          <Slider
            value={Math.round(audioPrefs.sfxVolume * 100)}
            onChange={(_, v) => {
              const vol = (v as number) / 100
              setAudioPrefs((p) => ({ ...p, sfxVolume: vol }))
              getAudioManager()?.setSfxVolume(vol)
            }}
            min={0}
            max={100}
            disabled={!audioPrefs.sfxEnabled}
            sx={{ color: '#14B8A6', flex: 1 }}
            size="small"
          />
          <span style={{ fontSize: 13, minWidth: 36, textAlign: 'right' }}>
            {Math.round(audioPrefs.sfxVolume * 100)}%
          </span>
        </VolumeRow>
      </DialogWrapper>
    </Backdrop>
  )
}
