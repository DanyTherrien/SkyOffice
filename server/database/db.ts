import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/capturia.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    // S'assurer que le repertoire data/ existe
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initTables()
  }
  return db
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone TEXT NOT NULL,
      sender_email TEXT,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sticky_notes (
      id TEXT PRIMARY KEY,
      zone TEXT NOT NULL,
      author_email TEXT,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      color TEXT DEFAULT '#FFE082',
      votes_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      email TEXT PRIMARY KEY,
      display_name TEXT,
      avatar TEXT,
      role TEXT,
      last_zone TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_zone ON messages(zone);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_sticky_notes_zone ON sticky_notes(zone);
  `)
}
