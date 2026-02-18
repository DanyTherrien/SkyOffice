import { AccessToken } from 'livekit-server-sdk'

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey'
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret'

const CALL_ZONES = new Set(['brainstorm', 'meeting', 'sales', 'one_on_one'])

export function isCallZone(zone: string): boolean {
  return CALL_ZONES.has(zone)
}

export async function generateToken(
  playerName: string,
  sessionId: string,
  zone: string
): Promise<string> {
  const roomName = `zone-${zone}`
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: sessionId,
    name: playerName,
  })
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  })
  return await at.toJwt()
}

export async function generateBoothToken(
  playerName: string,
  sessionId: string,
  boothId: string
): Promise<string> {
  const roomName = `booth-${boothId}`
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: sessionId,
    name: playerName,
  })
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  })
  return await at.toJwt()
}
