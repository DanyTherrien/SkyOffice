import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Participant,
  LocalTrackPublication,
  TrackPublication,
  ConnectionState,
} from 'livekit-client'

import store from '../stores'
import {
  setActiveZone,
  setOverlayOpen,
  setMyVideoStream,
  setMyScreenStream,
  setMicEnabled,
  setCameraEnabled,
  addPeerVideoStream,
  removePeerVideoStream,
  addPeerScreenStream,
  removePeerScreenStream,
  clearMeetingState,
  setMediaError,
  setPeerConnectionState,
  removePeerConnectionState,
  setPeerSpeaking,
} from '../stores/MeetingStore'
import { openMediaSettings } from '../stores/MediaSettingsStore'
import { clearMeetingTools } from '../stores/MeetingToolsStore'
import { Message } from '../../../types/Messages'

const MEDIA_SETUP_DONE_KEY = 'capturia-media-setup-done'

/**
 * Service singleton gerant la connexion LiveKit pour les reunions de zone.
 *
 * Remplace ZoneMeetingManager (PeerJS mesh) par une architecture SFU via LiveKit.
 * Le serveur Colyseus genere un token LiveKit quand le joueur entre dans une zone
 * de reunion (brainstorm, meeting, sales, one_on_one) et l'envoie via LIVEKIT_TOKEN.
 */
export class LiveKitService {
  private room: Room
  private currentZone: string | null = null
  /** Fonction pour envoyer un message au serveur Colyseus (injectee via setMessageSender) */
  private sendMessage: ((type: Message, data?: any) => void) | null = null

  /** Token et zone en attente de confirmation media (premiere connexion) */
  private pendingToken: string | null = null
  private pendingZone: string | null = null

  constructor() {
    this.room = this.createRoom()
  }

  /** Cree une nouvelle instance de Room LiveKit avec les options par defaut */
  private createRoom(): Room {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h540.resolution,
      },
    })

    this.setupRoomListeners(room)
    return room
  }

  /** Injecte la fonction d'envoi de messages Colyseus */
  setMessageSender(sender: (type: Message, data?: any) => void): void {
    this.sendMessage = sender
  }

  // ─────────────────────────────────────────────────────────
  //  Connexion / Deconnexion
  // ─────────────────────────────────────────────────────────

  /**
   * Se connecte a la room LiveKit avec le token fourni par le serveur.
   * Si c'est la premiere connexion, ouvre d'abord le dialog de parametres media
   * pour que l'utilisateur puisse verifier sa camera/micro avant de joindre.
   * Publie automatiquement la camera et le micro selon les preferences utilisateur.
   */
  async connect(token: string, zone: string): Promise<void> {
    // Si deja connecte a une autre zone, deconnecter d'abord
    if (this.currentZone !== null) {
      await this.disconnect()
    }

    // Premiere connexion: ouvrir le dialog media pour verification camera/micro
    if (!localStorage.getItem(MEDIA_SETUP_DONE_KEY)) {
      console.log('[LiveKit] Premiere connexion — ouverture des parametres media')
      this.pendingToken = token
      this.pendingZone = zone
      store.dispatch(openMediaSettings())
      return
    }

    await this.doConnect(token, zone)
  }

  /**
   * Execute la connexion effective a LiveKit (appele directement ou apres validation media).
   */
  private async doConnect(token: string, zone: string): Promise<void> {
    const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL as string
    if (!liveKitUrl) {
      console.error('[LiveKit] VITE_LIVEKIT_URL non defini')
      store.dispatch(setMediaError('Configuration LiveKit manquante.'))
      return
    }

    this.currentZone = zone
    store.dispatch(setActiveZone(zone))
    store.dispatch(setOverlayOpen(true))

    try {
      // Connecter a la room LiveKit
      await this.room.connect(liveKitUrl, token)
      console.log('[LiveKit] Connecte a la room:', zone)

      // Marquer la configuration media comme effectuee
      localStorage.setItem(MEDIA_SETUP_DONE_KEY, 'true')

      // Publier les pistes locales (camera + micro)
      await this.publishLocalTracks()
    } catch (error) {
      console.error('[LiveKit] Erreur de connexion:', error)
      store.dispatch(
        setMediaError('Impossible de se connecter a la reunion. Veuillez reessayer.')
      )
      this.currentZone = null
      store.dispatch(clearMeetingState())
    }
  }

  /**
   * Poursuit la connexion LiveKit apres la fermeture du dialog de parametres media.
   * Appele par MediaSettingsDialog lors de la fermeture si un token est en attente.
   */
  async proceedWithPendingConnect(): Promise<void> {
    if (this.pendingToken && this.pendingZone) {
      const token = this.pendingToken
      const zone = this.pendingZone
      this.pendingToken = null
      this.pendingZone = null
      // Marquer comme fait avant de connecter (eviter la boucle)
      localStorage.setItem(MEDIA_SETUP_DONE_KEY, 'true')
      await this.doConnect(token, zone)
    }
  }

  /** Retourne true si une connexion est en attente de validation media */
  get hasPendingConnect(): boolean {
    return this.pendingToken !== null && this.pendingZone !== null
  }

  /**
   * Deconnecte de la room LiveKit et reinitialise l'etat.
   */
  async disconnect(): Promise<void> {
    // Arreter le partage d'ecran si actif
    const screenPubs = this.room.localParticipant.trackPublications
    for (const [, pub] of screenPubs) {
      if (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio) {
        await this.room.localParticipant.unpublishTrack(pub.track!, true)
      }
    }

    // Deconnecter
    await this.room.disconnect()

    // Reinitialiser l'etat Redux
    store.dispatch(clearMeetingState())
    store.dispatch(clearMeetingTools())

    this.currentZone = null

    // Notifier le serveur que le screen share est arrete (si applicable)
    // Note: le serveur gere aussi la deconnexion via les events LiveKit

    // Re-creer la room pour la prochaine connexion
    this.room = this.createRoom()

    console.log('[LiveKit] Deconnecte')
  }

  // ─────────────────────────────────────────────────────────
  //  Publication des pistes locales
  // ─────────────────────────────────────────────────────────

  /**
   * Publie les pistes camera et micro locales.
   * Lit les preferences de device depuis le store Redux (mediaSettings).
   */
  private async publishLocalTracks(): Promise<void> {
    const mediaSettings = store.getState().mediaSettings

    try {
      // Activer camera et micro avec les devices preferes
      await this.room.localParticipant.enableCameraAndMicrophone()

      // Appliquer les preferences de device si specifiees
      if (mediaSettings.selectedCameraId) {
        await this.room.switchActiveDevice('videoinput', mediaSettings.selectedCameraId)
      }
      if (mediaSettings.selectedMicrophoneId) {
        await this.room.switchActiveDevice('audioinput', mediaSettings.selectedMicrophoneId)
      }

      // Extraire le MediaStream local pour l'affichage dans l'UI
      this.updateLocalMediaStream()

      // Synchroniser l'etat mic/camera avec le store
      store.dispatch(setMicEnabled(!this.room.localParticipant.isMicrophoneEnabled))
      // Note: setMicEnabled(true) = mic actif. Au demarrage LiveKit publie avec mic actif.
      const isMicOn = this.room.localParticipant.isMicrophoneEnabled
      const isCamOn = this.room.localParticipant.isCameraEnabled
      store.dispatch(setMicEnabled(isMicOn))
      store.dispatch(setCameraEnabled(isCamOn))

      console.log('[LiveKit] Pistes locales publiees (mic:', isMicOn, ', cam:', isCamOn, ')')
    } catch (error) {
      console.warn('[LiveKit] Impossible de publier les pistes media:', error)
      store.dispatch(
        setMediaError(
          "Impossible d'acceder a la webcam ou au micro. Vous participez sans video."
        )
      )
    }
  }

  /**
   * Extrait le MediaStream composite des pistes locales pour l'UI.
   */
  private updateLocalMediaStream(): void {
    const stream = new MediaStream()
    const camPub = this.room.localParticipant.getTrackPublication(Track.Source.Camera)
    const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone)

    if (camPub?.track?.mediaStreamTrack) {
      stream.addTrack(camPub.track.mediaStreamTrack)
    }
    if (micPub?.track?.mediaStreamTrack) {
      stream.addTrack(micPub.track.mediaStreamTrack)
    }

    store.dispatch(setMyVideoStream(stream))
  }

  // ─────────────────────────────────────────────────────────
  //  Controles audio/video
  // ─────────────────────────────────────────────────────────

  /** Bascule le micro (mute/unmute) */
  async toggleMicrophone(): Promise<void> {
    const enabled = this.room.localParticipant.isMicrophoneEnabled
    await this.room.localParticipant.setMicrophoneEnabled(!enabled)
    store.dispatch(setMicEnabled(!enabled))
    console.log('[LiveKit] Micro:', !enabled ? 'actif' : 'coupe')
  }

  /** Bascule la camera (on/off) */
  async toggleCamera(): Promise<void> {
    const enabled = this.room.localParticipant.isCameraEnabled
    await this.room.localParticipant.setCameraEnabled(!enabled)
    store.dispatch(setCameraEnabled(!enabled))
    this.updateLocalMediaStream()
    console.log('[LiveKit] Camera:', !enabled ? 'active' : 'desactivee')
  }

  // ─────────────────────────────────────────────────────────
  //  Partage d'ecran
  // ─────────────────────────────────────────────────────────

  /** Demarre le partage d'ecran */
  async startScreenShare(): Promise<void> {
    try {
      await this.room.localParticipant.setScreenShareEnabled(true)

      // Extraire le stream de partage d'ecran pour l'UI
      const screenPub = this.room.localParticipant.getTrackPublication(Track.Source.ScreenShare)
      if (screenPub?.track?.mediaStreamTrack) {
        const screenStream = new MediaStream([screenPub.track.mediaStreamTrack])
        store.dispatch(setMyScreenStream(screenStream))
      }

      console.log('[LiveKit] Partage d\'ecran demarre')
    } catch (error) {
      console.warn('[LiveKit] Partage d\'ecran annule ou echoue:', error)
    }
  }

  /** Arrete le partage d'ecran */
  async stopScreenShare(): Promise<void> {
    await this.room.localParticipant.setScreenShareEnabled(false)
    store.dispatch(setMyScreenStream(null))

    // Notifier le serveur pour les clients qui n'utilisent pas encore LiveKit
    this.sendMessage?.(Message.STOP_ZONE_SCREEN_SHARE)

    console.log('[LiveKit] Partage d\'ecran arrete')
  }

  // ─────────────────────────────────────────────────────────
  //  Changement de peripheriques
  // ─────────────────────────────────────────────────────────

  /** Change le peripherique audio d'entree (micro) */
  async switchAudioDevice(deviceId: string): Promise<void> {
    await this.room.switchActiveDevice('audioinput', deviceId)
    console.log('[LiveKit] Micro change:', deviceId)
  }

  /** Change le peripherique video (camera) */
  async switchVideoDevice(deviceId: string): Promise<void> {
    await this.room.switchActiveDevice('videoinput', deviceId)
    this.updateLocalMediaStream()
    console.log('[LiveKit] Camera changee:', deviceId)
  }

  /**
   * Applique les parametres media actuels (appele depuis MediaSettingsDialog).
   * Lit les preferences du store Redux et reconfigure les devices LiveKit.
   */
  async applyMediaSettings(): Promise<void> {
    const mediaSettings = store.getState().mediaSettings
    try {
      if (mediaSettings.selectedMicrophoneId) {
        await this.switchAudioDevice(mediaSettings.selectedMicrophoneId)
      }
      if (mediaSettings.selectedCameraId) {
        await this.switchVideoDevice(mediaSettings.selectedCameraId)
      }
      console.log('[LiveKit] Parametres media appliques')
    } catch (err) {
      console.error('[LiveKit] Erreur lors de l\'application des parametres media:', err)
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Gestion de l'etat de connexion
  // ─────────────────────────────────────────────────────────

  /** Retourne la zone active */
  get activeZone(): string | null {
    return this.currentZone
  }

  /** Retourne true si connecte a une room LiveKit */
  get isConnected(): boolean {
    return this.room.state === ConnectionState.Connected
  }

  // ─────────────────────────────────────────────────────────
  //  Listeners d'evenements LiveKit
  // ─────────────────────────────────────────────────────────

  /**
   * Configure tous les listeners d'evenements sur la room LiveKit.
   */
  private setupRoomListeners(room: Room): void {
    // ─── Participants distants ──────────────────────────────

    room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('[LiveKit] Participant connecte:', participant.identity)
      store.dispatch(
        setPeerConnectionState({ id: participant.identity, status: 'connected' })
      )
    })

    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('[LiveKit] Participant deconnecte:', participant.identity)
      store.dispatch(removePeerVideoStream(participant.identity))
      store.dispatch(removePeerScreenStream(participant.identity))
      store.dispatch(removePeerConnectionState(participant.identity))
    })

    // ─── Pistes distantes ──────────────────────────────────

    room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        const participantId = participant.identity
        const playerName = this.getParticipantDisplayName(participant)

        if (publication.source === Track.Source.ScreenShare) {
          // Partage d'ecran d'un pair
          const stream = new MediaStream([track.mediaStreamTrack])
          store.dispatch(
            addPeerScreenStream({
              id: participantId,
              stream,
              playerName,
            })
          )
          console.log('[LiveKit] Screen share recu de:', playerName)
        } else if (
          publication.source === Track.Source.Camera ||
          publication.source === Track.Source.Microphone
        ) {
          // Video/audio d'un pair — construire un MediaStream composite
          this.updateRemoteParticipantStream(participant)
        }
      }
    )

    room.on(
      RoomEvent.TrackUnsubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        const participantId = participant.identity

        if (publication.source === Track.Source.ScreenShare) {
          store.dispatch(removePeerScreenStream(participantId))
          console.log('[LiveKit] Screen share arrete pour:', participantId)
        } else if (
          publication.source === Track.Source.Camera ||
          publication.source === Track.Source.Microphone
        ) {
          // Reconstruire le stream (peut encore avoir une piste restante)
          this.updateRemoteParticipantStream(participant)
        }
      }
    )

    // ─── Mute/Unmute ──────────────────────────────────────

    room.on(
      RoomEvent.TrackMuted,
      (publication: TrackPublication, participant: Participant) => {
        if (participant !== room.localParticipant) {
          this.updateRemoteParticipantStream(participant as RemoteParticipant)
        }
      }
    )

    room.on(
      RoomEvent.TrackUnmuted,
      (publication: TrackPublication, participant: Participant) => {
        if (participant !== room.localParticipant) {
          this.updateRemoteParticipantStream(participant as RemoteParticipant)
        }
      }
    )

    // ─── Locuteurs actifs ─────────────────────────────────

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      const speakerIds = new Set(speakers.map((s) => s.identity))

      // Marquer les locuteurs actifs
      for (const speaker of speakers) {
        if (speaker !== room.localParticipant) {
          store.dispatch(setPeerSpeaking({ id: speaker.identity, speaking: true }))
        }
      }

      // Desactiver les non-locuteurs parmi les participants distants
      for (const [, participant] of room.remoteParticipants) {
        if (!speakerIds.has(participant.identity)) {
          store.dispatch(setPeerSpeaking({ id: participant.identity, speaking: false }))
        }
      }
    })

    // ─── Pistes locales ───────────────────────────────────

    room.on(
      RoomEvent.LocalTrackPublished,
      (publication: LocalTrackPublication) => {
        if (publication.source === Track.Source.ScreenShare) {
          // Le screen share local a ete publie — mettre a jour l'UI
          if (publication.track?.mediaStreamTrack) {
            const screenStream = new MediaStream([publication.track.mediaStreamTrack])
            store.dispatch(setMyScreenStream(screenStream))
          }

          // Detecter l'arret du screen share par le navigateur
          if (publication.track?.mediaStreamTrack) {
            publication.track.mediaStreamTrack.onended = () => {
              this.stopScreenShare()
            }
          }
        }
        this.updateLocalMediaStream()
      }
    )

    room.on(
      RoomEvent.LocalTrackUnpublished,
      (publication: LocalTrackPublication) => {
        if (publication.source === Track.Source.ScreenShare) {
          store.dispatch(setMyScreenStream(null))
        }
        this.updateLocalMediaStream()
      }
    )

    // ─── Deconnexion ─────────────────────────────────────

    room.on(RoomEvent.Disconnected, () => {
      console.log('[LiveKit] Deconnecte de la room')
      if (this.currentZone) {
        store.dispatch(clearMeetingState())
        store.dispatch(clearMeetingTools())
        this.currentZone = null
      }
    })

    // ─── Reconnexion ─────────────────────────────────────

    room.on(RoomEvent.Reconnecting, () => {
      console.log('[LiveKit] Reconnexion en cours...')
    })

    room.on(RoomEvent.Reconnected, () => {
      console.log('[LiveKit] Reconnecte')
      this.updateLocalMediaStream()
    })
  }

  // ─────────────────────────────────────────────────────────
  //  Utilitaires
  // ─────────────────────────────────────────────────────────

  /**
   * Construit et dispatch un MediaStream composite pour un participant distant.
   * Combine les pistes camera et micro en un seul MediaStream pour l'UI.
   */
  private updateRemoteParticipantStream(participant: RemoteParticipant): void {
    const participantId = participant.identity
    const playerName = this.getParticipantDisplayName(participant)

    const stream = new MediaStream()
    let hasTracks = false

    const camPub = participant.getTrackPublication(Track.Source.Camera)
    if (camPub?.track?.mediaStreamTrack) {
      stream.addTrack(camPub.track.mediaStreamTrack)
      hasTracks = true
    }

    const micPub = participant.getTrackPublication(Track.Source.Microphone)
    if (micPub?.track?.mediaStreamTrack) {
      stream.addTrack(micPub.track.mediaStreamTrack)
      hasTracks = true
    }

    if (hasTracks) {
      store.dispatch(
        addPeerVideoStream({
          id: participantId,
          stream,
          playerName,
        })
      )
    } else {
      store.dispatch(removePeerVideoStream(participantId))
    }
  }

  /**
   * Retourne le nom d'affichage d'un participant distant.
   * Utilise le name LiveKit, puis fallback sur le playerNameMap Redux.
   */
  private getParticipantDisplayName(participant: RemoteParticipant): string {
    if (participant.name) return participant.name

    // Fallback: chercher dans le store Redux via l'identity (= sessionId sanitize)
    const nameMap = store.getState().user.playerNameMap
    return nameMap.get(participant.identity) || 'Inconnu'
  }
}

/** Instance singleton du service LiveKit */
export const liveKitService = new LiveKitService()
