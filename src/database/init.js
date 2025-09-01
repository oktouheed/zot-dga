const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/zot-dga.db';

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('📊 Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    // Users table
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT,
          api_key TEXT UNIQUE,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Folders table
      db.run(`
        CREATE TABLE IF NOT EXISTS folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          path TEXT UNIQUE NOT NULL,
          user_id INTEGER NOT NULL,
          parent_id INTEGER,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (parent_id) REFERENCES folders (id) ON DELETE CASCADE
        )
      `);

      // Files table
      db.run(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          path TEXT NOT NULL,
          size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          file_type TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          folder_id INTEGER,
          width INTEGER,
          height INTEGER,
          duration REAL,
          thumbnail_path TEXT,
          metadata TEXT,
          tags TEXT,
          description TEXT,
          is_public BOOLEAN DEFAULT 0,
          upload_ip TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE SET NULL
        )
      `);

      // File processing table (for tracking processing jobs)
      db.run(`
        CREATE TABLE IF NOT EXISTS file_processing (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_id INTEGER NOT NULL,
          operation TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          parameters TEXT,
          result_path TEXT,
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
        )
      `);

      // API usage tracking
      db.run(`
        CREATE TABLE IF NOT EXISTS api_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          response_status INTEGER,
          response_time INTEGER,
          file_size INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_files_user_id ON files (user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files (folder_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_files_created_at ON files (created_at)');
      db.run('CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders (user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders (parent_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage (user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage (created_at)', (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('✅ Database tables initialized successfully');
          resolve();
        }
      });
    });
  });
};

module.exports = {
  db,
  initializeDatabase
};
