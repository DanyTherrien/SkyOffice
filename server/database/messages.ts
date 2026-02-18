import { getDb } from './db'

export interface DbMessage {
  id: number
  zone: string
  sender_email: string | null
  sender_name: string
  content: string
  created_at: string
}

export function saveMessage(
  zone: string,
  senderEmail: string | null,
  senderName: string,
  content: string
): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO messages (zone, sender_email, sender_name, content) VALUES (?, ?, ?, ?)'
  ).run(zone, senderEmail, senderName, content)
}

export function getRecentMessages(zone: string, limit = 100): DbMessage[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM messages WHERE zone = ? ORDER BY created_at DESC LIMIT ?')
    .all(zone, limit) as DbMessage[]
  return rows.reverse() // Retourner les plus anciens en premier
}
