/**
 * Sons de notification synthetises via Web Audio API.
 * Zero dependance, zero fichier audio a charger.
 */
export function playNotificationSound(type: 'enter' | 'leave' | 'message'): void {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.gain.value = 0.08
    gain.connect(ctx.destination)

    if (type === 'enter') {
      // Deux notes montantes rapides (do → mi)
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523, ctx.currentTime) // do5
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1) // mi5
      osc.connect(gain)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
      osc.onended = () => ctx.close()
    } else if (type === 'leave') {
      // Deux notes descendantes (mi → do)
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(659, ctx.currentTime) // mi5
      osc.frequency.setValueAtTime(523, ctx.currentTime + 0.1) // do5
      osc.connect(gain)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
      osc.onended = () => ctx.close()
    } else {
      // Bip court simple
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 440
      osc.connect(gain)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
      osc.onended = () => ctx.close()
    }
  } catch {
    // Ignorer si AudioContext n'est pas disponible
  }
}
