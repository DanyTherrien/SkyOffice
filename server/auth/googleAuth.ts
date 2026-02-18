import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod'
const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || ''
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').filter(Boolean)

const client = new OAuth2Client(GOOGLE_CLIENT_ID)

export async function verifyGoogleToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  if (!payload || !payload.email) throw new Error('Token invalide')

  const email = payload.email
  // Verifier la restriction de domaine
  if (ALLOWED_DOMAIN && !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error('Domaine non autorise')
  }
  // Verifier la liste blanche d'emails (si configuree)
  if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
    throw new Error('Email non autorise')
  }

  return {
    email: payload.email,
    name: payload.name || '',
    picture: payload.picture || '',
  }
}

export function issueJwt(email: string, name: string): string {
  return jwt.sign({ email, name }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyJwt(token: string): { email: string; name: string } {
  return jwt.verify(token, JWT_SECRET) as { email: string; name: string }
}
