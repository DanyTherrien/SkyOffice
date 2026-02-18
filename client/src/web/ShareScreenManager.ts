import store from '../stores'
import { setMyStream } from '../stores/ComputerStore'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

/**
 * Gestionnaire de partage d'ecran pour les items Computer.
 * Utilise getDisplayMedia() pour capturer l'ecran localement.
 * Le partage peer-to-peer (anciennement PeerJS) a ete retire —
 * le partage de zone via LiveKit remplace ce cas d'usage.
 */
export default class ShareScreenManager {
  myStream?: MediaStream

  constructor(private userId: string) {}

  onOpen(): void {
    // Rien a faire — pas de connexion peer a gerer
  }

  onClose(): void {
    this.stopScreenShare(false)
  }

  startScreenShare(): void {
    navigator.mediaDevices
      ?.getDisplayMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        // Detecter quand l'utilisateur clique "Arreter le partage" hors de notre UI.
        const track = stream.getVideoTracks()[0]
        if (track) {
          track.onended = () => {
            this.stopScreenShare()
          }
        }

        this.myStream = stream
        store.dispatch(setMyStream(stream))
      })
  }

  // Si shouldDispatch est false, on ne dispatch pas vers Redux (evite un cycle reducer).
  stopScreenShare(shouldDispatch = true): void {
    this.myStream?.getTracks().forEach((track) => track.stop())
    this.myStream = undefined
    if (shouldDispatch) {
      store.dispatch(setMyStream(null))
      // Informer les autres utilisateurs que le partage est arrete
      const game = phaserGame.scene.keys.game as Game
      const currentComputerId = store.getState().computer.computerId
      if (currentComputerId) {
        game.network.onStopScreenShare(currentComputerId)
      }
    }
  }
}
