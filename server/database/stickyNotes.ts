import { getDb } from './db'

export interface DbStickyNote {
  id: string
  zone: string
  author_email: string | null
  author_name: string
  content: string
  color: string
  votes_json: string
  created_at: string
}

export function saveStickyNote(
  id: string,
  zone: string,
  authorEmail: string | null,
  authorName: string,
  content: string,
  color: string
): void {
  const db = getDb()
  db.prepare(
    'INSERT OR REPLACE INTO sticky_notes (id, zone, author_email, author_name, content, color) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, zone, authorEmail, authorName, content, color)
}

export function deleteStickyNote(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM sticky_notes WHERE id = ?').run(id)
}

export function getStickyNotes(zone: string): DbStickyNote[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM sticky_notes WHERE zone = ? ORDER BY created_at ASC')
    .all(zone) as DbStickyNote[]
}

export function updateVotes(id: string, votesJson: string): void {
  const db = getDb()
  db.prepare('UPDATE sticky_notes SET votes_json = ? WHERE id = ?').run(votesJson, id)
}

export function clearStickyNotes(zone: string): void {
  const db = getDb()
  db.prepare('DELETE FROM sticky_notes WHERE zone = ?').run(zone)
}
