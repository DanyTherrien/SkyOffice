import Peer from 'peerjs'
import store from '../stores'
import {
  setActiveZone,
  setMyVideoStream,
  setMyScreenStream,
  addPeerVideoStream,
  removePeerVideoStream,
  addPeerScreenStream,
  removePeerScreenStream,
  setZoneMemberIds,
  setOverlayOpen,
  clearMeetingState,
  setMediaError,
  setPeerConnectionState,
  removePeerConnectionState,
} from '../stores/MeetingStore'
import { Message } from '../../../types/Messages'
import { buildMediaConstraints } from './mediaDevices'

/**
 * Gestionnaire de reunions par zone pour Capturia Office.
 *
 * Remplace le systeme de proximite WebRTC : quand un joueur entre dans une zone
 * de reunion (brainstorm, meeting, sales — PAS deep_work), il rejoint automatiquement
 * un appel video/audio avec tous les membres de cette zone.
 *
 * Architecture:
 * - Topologie mesh PeerJS (max ~8 pairs par zone)
 * - Deux instances PeerJS : une pour la webcam, une pour le partage d'ecran
 * - Les deux pairs s'appellent mutuellement (resilient aux delais PeerJS)
 * - Partage d'ecran multiple simultane supporte
 */
export default class ZoneMeetingManager {
  private myPeer!: Peer
  private myScreenPeer!: Peer
  private mySessionId: string
  private mySanitizedId: string
  private myStream?: MediaStream
  private myScreenStream?: MediaStream
  private sendMessage: (type: Message, data?: any) => void

  /** Connexions actives webcam (cle = ID sanitize du pair) */
  private videoPeers: Map<string, Peer.MediaConnection> = new Map()
  /** Appels sortants de partage d'ecran (cle = ID sanitize du pair) */
  private screenOutgoing: Map<string, Peer.MediaConnection> = new Map()
  /** Appels entrants de partage d'ecran pour nettoyage (cle = ID sanitize du pair source) */
  private screenIncoming: Map<string, Peer.MediaConnection> = new Map()

  private currentZone: string | null = null
  private currentMembers: string[] = []

  /** Indique si les peers PeerJS sont ouverts et prets */
  private mainPeerReady = false
  private screenPeerReady = false

  constructor(sessionId: string, sendMessage: (type: Message, data?: any) => void) {
    this.mySessionId = sessionId
    this.mySanitizedId = this.replaceInvalidId(sessionId)
    this.sendMessage = sendMessage

    this.initializePeers()
  }

  /**
   * Initialise (ou reinitialise) les deux instances PeerJS.
   * Le peer principal utilise l'ID sanitize, le peer screen share ajoute le suffixe '-zm-ss'.
   */
  private initializePeers(): void {
    // --- Peer principal (webcam) ---
    this.myPeer = new Peer(this.mySanitizedId)

    this.myPeer.on('open', () => {
      console.log('[ZoneMeeting] Peer principal ouvert:', this.mySanitizedId)
      this.mainPeerReady = true
      // Tenter de se connecter aux membres deja connus (le peer est maintenant pret)
      this.connectToExistingMembers()
    })

    this.myPeer.on('call', (call: Peer.MediaConnection) => {
      // Toujours repondre pour envoyer notre stream au pair appelant
      call.answer(this.myStream)

      // Si on a deja une connexion sortante vers ce pair, ne pas tracker l'entrante
      // (le pair recevra quand meme notre stream via la reponse ci-dessus)
      if (this.videoPeers.has(call.peer)) return

      this.videoPeers.set(call.peer, call)

      call.on('stream', (remoteStream: MediaStream) => {
        const playerName = this.getPlayerName(call.peer)
        store.dispatch(setPeerConnectionState({ id: call.peer, status: 'connected' }))
        store.dispatch(
          addPeerVideoStream({
            id: call.peer,
            stream: remoteStream,
            playerName,
          })
        )
      })

      call.on('close', () => {
        this.videoPeers.delete(call.peer)
        store.dispatch(removePeerVideoStream(call.peer))
        store.dispatch(removePeerConnectionState(call.peer))
      })

      call.on('error', (err: Error) => {
        console.error('[ZoneMeeting] Erreur appel entrant webcam:', err)
        store.dispatch(setPeerConnectionState({ id: call.peer, status: 'error' }))
        this.videoPeers.delete(call.peer)
      })
    })

    this.myPeer.on('error', (err: any) => {
      console.error('[ZoneMeeting] Erreur peer principal:', err.type, err)
      if (err.type === 'unavailable-id') {
        console.warn('[ZoneMeeting] ID indisponible, tentative de reconnexion...')
        this.mainPeerReady = false
        setTimeout(() => {
          if (this.myPeer.destroyed) {
            this.myPeer = new Peer(this.mySanitizedId)
            this.setupMainPeerEvents()
          } else {
            this.myPeer.reconnect()
          }
        }, 2000)
      }
    })

    this.myPeer.on('disconnected', () => {
      console.warn('[ZoneMeeting] Peer principal deconnecte, reconnexion...')
      this.mainPeerReady = false
      if (!this.myPeer.destroyed) {
        this.myPeer.reconnect()
      }
    })

    // --- Peer partage d'ecran ---
    const screenPeerId = this.mySanitizedId + '-zm-ss'
    this.myScreenPeer = new Peer(screenPeerId)

    this.myScreenPeer.on('open', () => {
      console.log('[ZoneMeeting] Peer screen share ouvert:', screenPeerId)
      this.screenPeerReady = true
    })

    this.myScreenPeer.on('call', (call: Peer.MediaConnection) => {
      // Repondre sans stream (on est spectateur du partage d'ecran du pair)
      call.answer()

      // Extraire l'ID du pair source en retirant le suffixe '-zm-ss'
      const sourcePeerId = this.extractSourcePeerId(call.peer)

      // Ne pas accepter en doublon
      if (this.screenIncoming.has(sourcePeerId)) return

      this.screenIncoming.set(sourcePeerId, call)

      call.on('stream', (remoteStream: MediaStream) => {
        const playerName = this.getPlayerName(sourcePeerId)
        store.dispatch(
          addPeerScreenStream({
            id: sourcePeerId,
            stream: remoteStream,
            playerName,
          })
        )
      })

      call.on('close', () => {
        this.screenIncoming.delete(sourcePeerId)
        store.dispatch(removePeerScreenStream(sourcePeerId))
      })

      call.on('error', (err: Error) => {
        console.error('[ZoneMeeting] Erreur appel entrant screen share:', err)
        this.screenIncoming.delete(sourcePeerId)
      })
    })

    this.myScreenPeer.on('error', (err: any) => {
      console.error('[ZoneMeeting] Erreur peer screen share:', err.type, err)
      if (err.type === 'unavailable-id') {
        console.warn('[ZoneMeeting] ID screen share indisponible, tentative de reconnexion...')
        this.screenPeerReady = false
        setTimeout(() => {
          if (this.myScreenPeer.destroyed) {
            this.myScreenPeer = new Peer(this.mySanitizedId + '-zm-ss')
            this.setupScreenPeerEvents()
          } else {
            this.myScreenPeer.reconnect()
          }
        }, 2000)
      }
    })

    this.myScreenPeer.on('disconnected', () => {
      console.warn('[ZoneMeeting] Peer screen share deconnecte, reconnexion...')
      this.screenPeerReady = false
      if (!this.myScreenPeer.destroyed) {
        this.myScreenPeer.reconnect()
      }
    })
  }

  /**
   * Re-attache les evenements du peer principal apres une recreation.
   * Utilise lors d'une reconnexion apres erreur 'unavailable-id'.
   */
  private setupMainPeerEvents(): void {
    this.myPeer.on('open', () => {
      console.log('[ZoneMeeting] Peer principal reconnnecte:', this.mySanitizedId)
      this.mainPeerReady = true
      this.connectToExistingMembers()
    })

    this.myPeer.on('call', (call: Peer.MediaConnection) => {
      call.answer(this.myStream)
      if (this.videoPeers.has(call.peer)) return
      this.videoPeers.set(call.peer, call)

      call.on('stream', (remoteStream: MediaStream) => {
        const playerName = this.getPlayerName(call.peer)
        store.dispatch(setPeerConnectionState({ id: call.peer, status: 'connected' }))
        store.dispatch(addPeerVideoStream({ id: call.peer, stream: remoteStream, playerName }))
      })

      call.on('close', () => {
        this.videoPeers.delete(call.peer)
        store.dispatch(removePeerVideoStream(call.peer))
        store.dispatch(removePeerConnectionState(call.peer))
      })

      call.on('error', (err: Error) => {
        console.error('[ZoneMeeting] Erreur appel entrant webcam (reconnexion):', err)
        store.dispatch(setPeerConnectionState({ id: call.peer, status: 'error' }))
        this.videoPeers.delete(call.peer)
      })
    })

    this.myPeer.on('error', (err: any) => {
      console.error('[ZoneMeeting] Erreur peer principal (reconnexion):', err.type, err)
    })
  }

  /**
   * Re-attache les evenements du peer screen share apres une recreation.
   */
  private setupScreenPeerEvents(): void {
    this.myScreenPeer.on('open', () => {
      console.log('[ZoneMeeting] Peer screen share reconnecte:', this.mySanitizedId + '-zm-ss')
      this.screenPeerReady = true
    })

    this.myScreenPeer.on('call', (call: Peer.MediaConnection) => {
      call.answer()
      const sourcePeerId = this.extractSourcePeerId(call.peer)
      if (this.screenIncoming.has(sourcePeerId)) return
      this.screenIncoming.set(sourcePeerId, call)

      call.on('stream', (remoteStream: MediaStream) => {
        const playerName = this.getPlayerName(sourcePeerId)
        store.dispatch(addPeerScreenStream({ id: sourcePeerId, stream: remoteStream, playerName }))
      })

      call.on('close', () => {
        this.screenIncoming.delete(sourcePeerId)
        store.dispatch(removePeerScreenStream(sourcePeerId))
      })

      call.on('error', (err: Error) => {
        console.error('[ZoneMeeting] Erreur appel entrant screen share (reconnexion):', err)
        this.screenIncoming.delete(sourcePeerId)
      })
    })

    this.myScreenPeer.on('error', (err: any) => {
      console.error('[ZoneMeeting] Erreur peer screen share (reconnexion):', err.type, err)
    })
  }

  /**
   * Remplace les caracteres invalides pour PeerJS.
   * PeerJS n'accepte que [0-9a-zA-Z] dans les IDs.
   * @see https://peerjs.com/docs.html#peer-id
   */
  private replaceInvalidId(id: string): string {
    return id.replace(/[^0-9a-z]/gi, 'G')
  }

  /**
   * Extrait l'ID du pair source a partir d'un ID de peer screen share.
   * L'ID screen share a le format '{sanitizedId}-zm-ss'.
   */
  private extractSourcePeerId(screenPeerId: string): string {
    const suffix = '-zm-ss'
    if (screenPeerId.endsWith(suffix)) {
      return screenPeerId.substring(0, screenPeerId.length - suffix.length)
    }
    return screenPeerId
  }

  /**
   * Recupere le nom du joueur depuis le store Redux a partir de son ID sanitize.
   */
  private getPlayerName(sanitizedId: string): string {
    return store.getState().user.playerNameMap.get(sanitizedId) || 'Inconnu'
  }

  // ─────────────────────────────────────────────────────────
  //  Gestion des zones
  // ─────────────────────────────────────────────────────────

  /**
   * Rejoint une zone de reunion. Demande l'acces webcam/micro si pas encore fait.
   * Les connexions aux pairs se font quand onZoneMembersChanged() est appelee par Network.
   *
   * @param zone - Nom de la zone (brainstorm, meeting, sales)
   */
  async joinZone(zone: string): Promise<void> {
    // Si deja dans une zone de reunion, quitter d'abord
    if (this.currentZone !== null) {
      this.leaveZone()
    }

    this.currentZone = zone
    store.dispatch(setActiveZone(zone))

    // Demander l'acces webcam/micro si pas encore obtenu
    if (!this.myStream) {
      try {
        const mediaSettings = store.getState().mediaSettings
        const constraints = buildMediaConstraints({
          cameraId: mediaSettings.selectedCameraId,
          microphoneId: mediaSettings.selectedMicrophoneId,
          noiseSuppression: mediaSettings.noiseSuppression,
          echoCancellation: mediaSettings.echoCancellation,
          autoGainControl: mediaSettings.autoGainControl,
        })
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        this.myStream = stream
        store.dispatch(setMyVideoStream(stream))
        console.log('[ZoneMeeting] Stream webcam obtenu pour la zone:', zone)
      } catch (error) {
        console.warn(
          '[ZoneMeeting] Impossible d\'obtenir la webcam/micro:',
          error
        )
        store.dispatch(
          setMediaError('Impossible d\'acceder a la webcam ou au micro. Vous participez sans video.')
        )
        // On rejoint quand meme la zone sans stream
      }
    } else {
      // Stream deja disponible, le pousser dans le store
      store.dispatch(setMyVideoStream(this.myStream))
    }

    store.dispatch(setOverlayOpen(true))
    console.log('[ZoneMeeting] Zone rejointe:', zone)

    // Connecter aux membres deja connus (resout la race condition ou
    // ZONE_MEMBERS_UPDATE arrive avant que le stream soit pret)
    this.connectToExistingMembers()
  }

  /**
   * Tente de se connecter a tous les membres actuels qui n'ont pas encore
   * de connexion video. Appele apres joinZone pour rattraper les membres
   * qui ont ete signales par le serveur avant que le stream soit disponible.
   */
  private connectToExistingMembers(): void {
    for (const memberId of this.currentMembers) {
      const sanitizedMemberId = this.replaceInvalidId(memberId)

      // Ne pas reconnecter si deja connecte
      if (this.videoPeers.has(sanitizedMemberId)) continue

      this.callPeer(memberId)
    }
  }

  /**
   * Quitte la zone de reunion actuelle.
   * Ferme toutes les connexions de pairs mais conserve le stream webcam local
   * pour pouvoir le reutiliser dans la prochaine zone.
   */
  leaveZone(): void {
    // Fermer toutes les connexions video webcam
    for (const [peerId, call] of this.videoPeers) {
      call.close()
      store.dispatch(removePeerVideoStream(peerId))
    }
    this.videoPeers.clear()

    // Fermer toutes les connexions de partage d'ecran sortantes
    for (const [, call] of this.screenOutgoing) {
      call.close()
    }
    this.screenOutgoing.clear()

    // Fermer toutes les connexions de partage d'ecran entrantes
    for (const [peerId, call] of this.screenIncoming) {
      call.close()
      store.dispatch(removePeerScreenStream(peerId))
    }
    this.screenIncoming.clear()

    // Arreter le partage d'ecran si actif
    if (this.myScreenStream) {
      this.myScreenStream.getTracks().forEach((track) => track.stop())
      this.myScreenStream = undefined
    }

    // Reinitialiser l'etat Redux du meeting
    store.dispatch(clearMeetingState())

    this.currentZone = null
    this.currentMembers = []

    console.log('[ZoneMeeting] Zone quittee, connexions fermees')
    // Note: on ne coupe PAS le stream webcam (myStream) pour reutilisation
  }

  // ─────────────────────────────────────────────────────────
  //  Gestion des membres de zone
  // ─────────────────────────────────────────────────────────

  /**
   * Appele par Network quand la liste des membres de la zone change.
   * Gere les connexions et deconnexions incrementales.
   *
   * @param memberIds - Liste complete des session IDs des membres dans la zone
   */
  onZoneMembersChanged(memberIds: string[]): void {
    // Filtrer notre propre ID
    const otherMembers = memberIds.filter((id) => id !== this.mySessionId)

    // Determiner les nouveaux et les anciens membres
    const newMembers = otherMembers.filter((id) => !this.currentMembers.includes(id))
    const leftMembers = this.currentMembers.filter((id) => !otherMembers.includes(id))

    // Gerer les membres qui ont quitte
    for (const memberId of leftMembers) {
      const sanitizedId = this.replaceInvalidId(memberId)

      // Fermer l'appel video webcam
      if (this.videoPeers.has(sanitizedId)) {
        this.videoPeers.get(sanitizedId)!.close()
        this.videoPeers.delete(sanitizedId)
        store.dispatch(removePeerVideoStream(sanitizedId))
      }

      // Fermer l'appel de partage d'ecran entrant
      if (this.screenIncoming.has(sanitizedId)) {
        this.screenIncoming.get(sanitizedId)!.close()
        this.screenIncoming.delete(sanitizedId)
        store.dispatch(removePeerScreenStream(sanitizedId))
      }

      store.dispatch(removePeerConnectionState(sanitizedId))
      console.log('[ZoneMeeting] Membre parti:', sanitizedId)
    }

    // Gerer les nouveaux membres — les deux cotes appellent pour eviter
    // les pertes d'appel si le pair distant n'est pas encore enregistre sur PeerJS
    for (const memberId of newMembers) {
      const sanitizedMemberId = this.replaceInvalidId(memberId)

      store.dispatch(setPeerConnectionState({ id: sanitizedMemberId, status: 'connecting' }))
      this.callPeer(memberId)

      // Si on partage actuellement notre ecran, appeler le nouveau membre via screen peer
      if (this.myScreenStream) {
        this.callPeerScreenShare(memberId)
      }

      console.log('[ZoneMeeting] Nouveau membre:', sanitizedMemberId)
    }

    // Mettre a jour la liste courante
    this.currentMembers = [...otherMembers]

    // Mettre a jour le store Redux
    store.dispatch(setZoneMemberIds(memberIds))
  }

  // ─────────────────────────────────────────────────────────
  //  Appels entre pairs
  // ─────────────────────────────────────────────────────────

  /**
   * Initie un appel video webcam vers un pair.
   * Ne fait rien si pas de stream local ou si deja connecte.
   *
   * @param peerId - Session ID original (non sanitize) du pair
   */
  private callPeer(peerId: string): void {
    if (!this.myStream) {
      console.warn('[ZoneMeeting] Pas de stream local, impossible d\'appeler:', peerId)
      return
    }

    if (!this.mainPeerReady) {
      console.warn('[ZoneMeeting] Peer pas encore pret, appel differe:', peerId)
      return
    }

    const sanitizedId = this.replaceInvalidId(peerId)

    // Eviter les doublons
    if (this.videoPeers.has(sanitizedId)) {
      return
    }

    console.log('[ZoneMeeting] Appel webcam vers:', sanitizedId)
    const call = this.myPeer.call(sanitizedId, this.myStream)

    if (!call) {
      console.error('[ZoneMeeting] Echec de l\'appel vers:', sanitizedId)
      return
    }

    this.videoPeers.set(sanitizedId, call)

    call.on('stream', (remoteStream: MediaStream) => {
      const playerName = this.getPlayerName(sanitizedId)
      store.dispatch(setPeerConnectionState({ id: sanitizedId, status: 'connected' }))
      store.dispatch(
        addPeerVideoStream({
          id: sanitizedId,
          stream: remoteStream,
          playerName,
        })
      )
    })

    call.on('close', () => {
      this.videoPeers.delete(sanitizedId)
      store.dispatch(removePeerVideoStream(sanitizedId))
      store.dispatch(removePeerConnectionState(sanitizedId))
    })

    call.on('error', (err: Error) => {
      console.error('[ZoneMeeting] Erreur appel sortant webcam vers', sanitizedId, ':', err)
      store.dispatch(setPeerConnectionState({ id: sanitizedId, status: 'error' }))
      this.videoPeers.delete(sanitizedId)
      store.dispatch(removePeerVideoStream(sanitizedId))
    })
  }

  /**
   * Envoie notre partage d'ecran a un pair specifique via le screen peer.
   *
   * @param peerId - Session ID original (non sanitize) du pair cible
   */
  private callPeerScreenShare(peerId: string): void {
    if (!this.myScreenStream) return

    const targetScreenId = this.replaceInvalidId(peerId) + '-zm-ss'

    // Eviter les doublons
    const sanitizedId = this.replaceInvalidId(peerId)
    if (this.screenOutgoing.has(sanitizedId)) return

    console.log('[ZoneMeeting] Envoi partage d\'ecran vers:', targetScreenId)
    const call = this.myScreenPeer.call(targetScreenId, this.myScreenStream)

    if (!call) {
      console.error('[ZoneMeeting] Echec de l\'envoi screen share vers:', targetScreenId)
      return
    }

    this.screenOutgoing.set(sanitizedId, call)

    call.on('close', () => {
      this.screenOutgoing.delete(sanitizedId)
    })

    call.on('error', (err: Error) => {
      console.error('[ZoneMeeting] Erreur envoi screen share vers', targetScreenId, ':', err)
      this.screenOutgoing.delete(sanitizedId)
    })
  }

  // ─────────────────────────────────────────────────────────
  //  Partage d'ecran
  // ─────────────────────────────────────────────────────────

  /**
   * Demarre le partage d'ecran et l'envoie a tous les membres de la zone.
   * Plusieurs joueurs peuvent partager leur ecran simultanement.
   */
  async startScreenShare(): Promise<void> {
    try {
      const stream: MediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })

      // Detecter quand l'utilisateur clique "Arreter le partage" dans le navigateur
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare()
        }
      }

      this.myScreenStream = stream
      store.dispatch(setMyScreenStream(stream))

      // Appeler tous les membres actuels de la zone via le screen peer
      for (const memberId of this.currentMembers) {
        this.callPeerScreenShare(memberId)
      }

      console.log(
        '[ZoneMeeting] Partage d\'ecran demarre, envoye a',
        this.currentMembers.length,
        'membre(s)'
      )
    } catch (error) {
      console.warn('[ZoneMeeting] Partage d\'ecran annule ou echoue:', error)
    }
  }

  /**
   * Arrete le partage d'ecran et notifie les pairs et le serveur.
   */
  stopScreenShare(): void {
    // Arreter les tracks du stream
    if (this.myScreenStream) {
      this.myScreenStream.getTracks().forEach((track) => track.stop())
      this.myScreenStream = undefined
    }

    // Fermer tous les appels sortants de screen share
    for (const [, call] of this.screenOutgoing) {
      call.close()
    }
    this.screenOutgoing.clear()

    // Mettre a jour le store Redux
    store.dispatch(setMyScreenStream(null))

    // Notifier le serveur pour qu'il previenne les autres pairs
    this.sendMessage(Message.STOP_ZONE_SCREEN_SHARE)

    console.log('[ZoneMeeting] Partage d\'ecran arrete')
  }

  /**
   * Appele quand un pair a arrete son partage d'ecran (notification du serveur).
   *
   * @param peerId - Session ID original (non sanitize) du pair
   */
  onPeerScreenShareStopped(peerId: string): void {
    const sanitizedId = this.replaceInvalidId(peerId)

    // Fermer la connexion entrante si elle existe
    if (this.screenIncoming.has(sanitizedId)) {
      this.screenIncoming.get(sanitizedId)!.close()
      this.screenIncoming.delete(sanitizedId)
    }

    // Retirer le stream du store
    store.dispatch(removePeerScreenStream(sanitizedId))

    console.log('[ZoneMeeting] Partage d\'ecran du pair arrete:', sanitizedId)
  }

  // ─────────────────────────────────────────────────────────
  //  Controles audio/video
  // ─────────────────────────────────────────────────────────

  /**
   * Bascule l'etat du micro (mute/unmute).
   * @returns Le nouvel etat du micro (true = actif, false = mute)
   */
  toggleMic(): boolean {
    if (!this.myStream) return false

    const audioTrack = this.myStream.getAudioTracks()[0]
    if (!audioTrack) return false

    audioTrack.enabled = !audioTrack.enabled
    return audioTrack.enabled
  }

  /**
   * Bascule l'etat de la camera (on/off).
   * @returns Le nouvel etat de la camera (true = active, false = desactivee)
   */
  toggleCamera(): boolean {
    if (!this.myStream) return false

    const videoTrack = this.myStream.getVideoTracks()[0]
    if (!videoTrack) return false

    videoTrack.enabled = !videoTrack.enabled
    return videoTrack.enabled
  }

  // ─────────────────────────────────────────────────────────
  //  Application des parametres media en cours de reunion
  // ─────────────────────────────────────────────────────────

  /**
   * Applique les parametres media (nouveau device, contraintes audio) a la session active.
   * Remplace les tracks sur toutes les connexions PeerJS existantes via replaceTrack().
   * Appele quand l'utilisateur ferme le dialog de parametres media pendant une reunion.
   */
  async applyMediaSettings(): Promise<void> {
    const mediaSettings = store.getState().mediaSettings
    const constraints = buildMediaConstraints({
      cameraId: mediaSettings.selectedCameraId,
      microphoneId: mediaSettings.selectedMicrophoneId,
      noiseSuppression: mediaSettings.noiseSuppression,
      echoCancellation: mediaSettings.echoCancellation,
      autoGainControl: mediaSettings.autoGainControl,
    })

    try {
      // Arreter les anciennes tracks
      if (this.myStream) {
        this.myStream.getTracks().forEach((t) => t.stop())
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      this.myStream = newStream
      store.dispatch(setMyVideoStream(newStream))

      // Preserver l'etat mute/camera du meeting actuel
      const meetingState = store.getState().meeting
      const audioTrack = newStream.getAudioTracks()[0]
      if (audioTrack) audioTrack.enabled = meetingState.micEnabled

      const videoTrack = newStream.getVideoTracks()[0]
      if (videoTrack) videoTrack.enabled = meetingState.cameraEnabled

      // Remplacer les tracks sur toutes les connexions PeerJS existantes
      for (const [, call] of this.videoPeers) {
        const pc = (call as any).peerConnection as RTCPeerConnection | undefined
        if (!pc) continue

        const senders = pc.getSenders()
        for (const sender of senders) {
          if (sender.track?.kind === 'audio' && audioTrack) {
            await sender.replaceTrack(audioTrack)
          } else if (sender.track?.kind === 'video' && videoTrack) {
            await sender.replaceTrack(videoTrack)
          }
        }
      }

      console.log('[ZoneMeeting] Parametres media appliques avec succes')
    } catch (err) {
      console.error('[ZoneMeeting] Erreur lors de l\'application des parametres media:', err)
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Nettoyage
  // ─────────────────────────────────────────────────────────

  /**
   * Detruit completement le gestionnaire de meeting.
   * Ferme toutes les connexions, arrete tous les streams et detruit les peers PeerJS.
   * A appeler lors de la deconnexion du joueur.
   */
  destroy(): void {
    // Quitter la zone en cours (ferme les connexions de pairs)
    this.leaveZone()

    // Arreter le stream webcam local
    if (this.myStream) {
      this.myStream.getTracks().forEach((track) => track.stop())
      this.myStream = undefined
    }

    // Detruire les instances PeerJS
    if (!this.myPeer.destroyed) {
      this.myPeer.destroy()
    }
    if (!this.myScreenPeer.destroyed) {
      this.myScreenPeer.destroy()
    }

    this.mainPeerReady = false
    this.screenPeerReady = false

    console.log('[ZoneMeeting] Gestionnaire detruit')
  }
}
