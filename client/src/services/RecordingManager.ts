/**
 * RecordingManager — Gestionnaire d'enregistrement audio des reunions.
 * V1 : enregistre uniquement le micro local via MediaRecorder.
 * Le fichier est telecharge en .webm a l'arret de l'enregistrement.
 */

class RecordingManager {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private stream: MediaStream | null = null

  /**
   * Demarre l'enregistrement audio du micro local.
   * Leve une erreur si le micro n'est pas accessible.
   */
  async startRecording(): Promise<void> {
    this.chunks = []
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Choisir le mimeType supporte par le navigateur
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType })

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data)
      }
    }

    // Enregistrer par segments d'une seconde
    this.mediaRecorder.start(1000)
  }

  /**
   * Arrete l'enregistrement et retourne le Blob audio resultant.
   */
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Aucun enregistrement en cours'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' })
        this.chunks = []

        // Arreter les pistes du micro pour liberer la ressource
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop())
          this.stream = null
        }

        resolve(blob)
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * Telecharge le fichier audio enregistre.
   * @param blob Blob audio a telecharger
   * @param meetingName Nom de la zone/reunion pour le nom de fichier
   */
  downloadRecording(blob: Blob, meetingName: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reunion-${meetingName}-${new Date().toISOString().slice(0, 10)}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Indique si un enregistrement est en cours.
   */
  get isActive(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording'
  }
}

// Exporter une instance singleton
const recordingManager = new RecordingManager()
export default recordingManager
