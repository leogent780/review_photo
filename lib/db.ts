import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'review_photo.db');

function getDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_image_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES product_images(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS generated_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type INTEGER NOT NULL,
      reference_filename TEXT NOT NULL,
      output_filename TEXT NOT NULL DEFAULT '',
      product_image_id INTEGER,
      job_id TEXT,
      prompt TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_image_id) REFERENCES product_images(id)
    );
  `);

  // Migrations for existing tables
  const cols = db.prepare("PRAGMA table_info(generated_images)").all() as { name: string }[];
  const colNames = cols.map(c => c.name);
  if (!colNames.includes('prompt')) {
    db.exec("ALTER TABLE generated_images ADD COLUMN prompt TEXT");
  }
  if (!colNames.includes('job_id')) {
    db.exec("ALTER TABLE generated_images ADD COLUMN job_id TEXT");
  }

  return db;
}

export default getDb;
