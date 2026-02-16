/**
 * Utilitaires pour l'enumeration des peripheriques media et la construction
 * des contraintes getUserMedia.
 */

export interface MediaDeviceLists {
  cameras: MediaDeviceInfo[]
  microphones: MediaDeviceInfo[]
  speakers: MediaDeviceInfo[]
}

/** Enumere tous les peripheriques media, groupes par type */
export async function enumerateMediaDevices(): Promise<MediaDeviceLists> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return {
    cameras: devices.filter((d) => d.kind === 'videoinput'),
    microphones: devices.filter((d) => d.kind === 'audioinput'),
    speakers: devices.filter((d) => d.kind === 'audiooutput'),
  }
}

/** Construit les contraintes getUserMedia a partir des parametres */
export function buildMediaConstraints(settings: {
  cameraId: string
  microphoneId: string
  noiseSuppression: boolean
  echoCancellation: boolean
  autoGainControl: boolean
}): MediaStreamConstraints {
  const video: MediaTrackConstraints | boolean = settings.cameraId
    ? { deviceId: { exact: settings.cameraId } }
    : true

  const audio: MediaTrackConstraints = {
    ...(settings.microphoneId ? { deviceId: { exact: settings.microphoneId } } : {}),
    noiseSuppression: settings.noiseSuppression,
    echoCancellation: settings.echoCancellation,
    autoGainControl: settings.autoGainControl,
  }

  return { video, audio }
}

/** Applique la sortie audio sur un element HTML (Chromium uniquement) */
export async function applySpeakerOutput(
  element: HTMLMediaElement,
  speakerId: string
): Promise<void> {
  if (!isSpeakerSelectionSupported()) return
  try {
    await (element as any).setSinkId(speakerId)
  } catch (err) {
    console.warn('[mediaDevices] setSinkId echoue:', err)
  }
}

/** Verifie si le navigateur supporte la selection du haut-parleur */
export function isSpeakerSelectionSupported(): boolean {
  return typeof (HTMLMediaElement.prototype as any).setSinkId === 'function'
}

/** Determine si le micro d'un pair est coupe en inspectant son MediaStream */
export function isPeerMuted(stream: MediaStream | null): boolean {
  if (!stream) return true
  const audioTrack = stream.getAudioTracks()[0]
  if (!audioTrack) return true
  return !audioTrack.enabled
}

/** Determine si la video d'un pair est desactivee */
export function isPeerVideoOff(stream: MediaStream | null): boolean {
  if (!stream) return true
  const videoTrack = stream.getVideoTracks()[0]
  if (!videoTrack) return true
  return !videoTrack.enabled
}
