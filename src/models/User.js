const { db } = require('../database/init');

class User {
  static async create(userData) {
    return new Promise((resolve, reject) => {
      const { email, password, name, apiKey } = userData;
      db.run(
        'INSERT INTO users (email, password, name, api_key) VALUES (?, ?, ?, ?)',
        [email, password, name, apiKey],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  static async findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static async findByApiKey(apiKey) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE api_key = ? AND is_active = 1', [apiKey], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, email, name, api_key, is_active, created_at FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static async updateApiKey(userId, newApiKey) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newApiKey, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  static async getUsageStats(userId, days = 30) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          COUNT(*) as total_requests,
          SUM(file_size) as total_bytes,
          AVG(response_time) as avg_response_time,
          COUNT(DISTINCT DATE(created_at)) as active_days
         FROM api_usage 
         WHERE user_id = ? AND created_at >= datetime('now', '-${days} days')`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows[0]);
        }
      );
    });
  }
}

module.exports = User;
