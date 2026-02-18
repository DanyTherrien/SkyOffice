import { getDb } from './db'

export interface DbUserPrefs {
  email: string
  display_name: string | null
  avatar: string | null
  role: string | null
  last_zone: string | null
}

export function getPreferences(email: string): DbUserPrefs | null {
  const db = getDb()
  return db.prepare('SELECT * FROM user_preferences WHERE email = ?').get(email) as DbUserPrefs | null
}

export function savePreferences(
  email: string,
  prefs: Partial<Omit<DbUserPrefs, 'email'>>
): void {
  const db = getDb()
  const existing = getPreferences(email)
  if (existing) {
    const updates: string[] = []
    const values: any[] = []
    if (prefs.display_name !== undefined) {
      updates.push('display_name = ?')
      values.push(prefs.display_name)
    }
    if (prefs.avatar !== undefined) {
      updates.push('avatar = ?')
      values.push(prefs.avatar)
    }
    if (prefs.role !== undefined) {
      updates.push('role = ?')
      values.push(prefs.role)
    }
    if (prefs.last_zone !== undefined) {
      updates.push('last_zone = ?')
      values.push(prefs.last_zone)
    }
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(email)
    db.prepare(`UPDATE user_preferences SET ${updates.join(', ')} WHERE email = ?`).run(
      ...values
    )
  } else {
    db.prepare(
      'INSERT INTO user_preferences (email, display_name, avatar, role, last_zone) VALUES (?, ?, ?, ?, ?)'
    ).run(
      email,
      prefs.display_name || null,
      prefs.avatar || null,
      prefs.role || null,
      prefs.last_zone || null
    )
  }
}
